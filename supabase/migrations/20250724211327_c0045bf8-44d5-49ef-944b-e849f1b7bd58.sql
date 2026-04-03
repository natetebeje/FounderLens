-- Database Optimization Phase 2: Optimize Functions

-- Optimize the subscription status function for better performance
CREATE OR REPLACE FUNCTION public.get_subscription_status_optimized(p_user_id uuid, p_organization_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(subscribed boolean, plan_tier text, subscription_end timestamp with time zone, stripe_customer_id text, from_cache boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cache_record RECORD;
  subscription_record RECORD;
  cache_duration INTERVAL := '10 minutes'::INTERVAL; -- Increased cache duration
BEGIN
  -- First check cache for valid, non-expired data
  SELECT * INTO cache_record
  FROM public.subscription_cache
  WHERE user_id = p_user_id 
    AND (organization_id = p_organization_id OR (organization_id IS NULL AND p_organization_id IS NULL))
    AND expires_at > NOW()
    AND is_valid = true
  LIMIT 1; -- Ensure single result

  -- If valid cache found, return cached data
  IF FOUND THEN
    RETURN QUERY SELECT
      cache_record.subscribed,
      cache_record.plan_tier,
      cache_record.subscription_end,
      cache_record.stripe_customer_id,
      true as from_cache;
    RETURN;
  END IF;

  -- No valid cache, query subscriptions table with optimized query
  SELECT * INTO subscription_record
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND (organization_id = p_organization_id OR (organization_id IS NULL AND p_organization_id IS NULL))
    AND status = 'active'
    AND current_period_end > NOW() -- Only get active, non-expired subscriptions
  ORDER BY created_at DESC
  LIMIT 1;

  -- Determine subscription status and cache result
  IF FOUND THEN
    -- Update cache with new data
    INSERT INTO public.subscription_cache (
      user_id, organization_id, subscribed, plan_tier, 
      subscription_end, stripe_customer_id, expires_at, is_valid
    ) VALUES (
      p_user_id, p_organization_id, true, subscription_record.plan_tier,
      subscription_record.current_period_end, subscription_record.stripe_customer_id,
      NOW() + cache_duration, true
    )
    ON CONFLICT (user_id, organization_id) 
    DO UPDATE SET
      subscribed = true,
      plan_tier = subscription_record.plan_tier,
      subscription_end = subscription_record.current_period_end,
      stripe_customer_id = subscription_record.stripe_customer_id,
      expires_at = NOW() + cache_duration,
      is_valid = true,
      updated_at = NOW();

    RETURN QUERY SELECT
      true as subscribed,
      subscription_record.plan_tier,
      subscription_record.current_period_end,
      subscription_record.stripe_customer_id,
      false as from_cache;
  ELSE
    -- No active subscription, cache the negative result with shorter duration
    INSERT INTO public.subscription_cache (
      user_id, organization_id, subscribed, plan_tier,
      subscription_end, stripe_customer_id, expires_at, is_valid
    ) VALUES (
      p_user_id, p_organization_id, false, 'free',
      NULL, NULL, NOW() + (cache_duration / 2), true -- Shorter cache for free tier
    )
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
      subscribed = false,
      plan_tier = 'free',
      subscription_end = NULL,
      stripe_customer_id = NULL,
      expires_at = NOW() + (cache_duration / 2),
      is_valid = true,
      updated_at = NOW();

    RETURN QUERY SELECT
      false as subscribed,
      'free'::TEXT as plan_tier,
      NULL::TIMESTAMPTZ as subscription_end,
      NULL::TEXT as stripe_customer_id,
      false as from_cache;
  END IF;
END;
$function$;