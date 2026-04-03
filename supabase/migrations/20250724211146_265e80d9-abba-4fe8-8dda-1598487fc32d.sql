-- Database Optimization Phase 1: Add Critical Indexes and Optimize Functions

-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_opportunities_organization_user 
ON public.business_opportunities (organization_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_opportunities_created_at 
ON public.business_opportunities (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_opportunities_validation_status 
ON public.business_opportunities (validation_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_organization_members_user_org 
ON public.organization_members (user_id, organization_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_org_status 
ON public.subscriptions (user_id, organization_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_cache_user_org_expires 
ON public.subscription_cache (user_id, organization_id, expires_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_tracking_org_resource_period 
ON public.usage_tracking (organization_id, resource_type, period_start);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workspace_activities_org_created 
ON public.workspace_activities (organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_validation_tasks_opportunity_status 
ON public.validation_tasks (opportunity_id, status);

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

-- Create optimized function for batch opportunity queries
CREATE OR REPLACE FUNCTION public.get_opportunities_batch(p_user_id uuid, p_organization_ids uuid[], p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  organization_id uuid,
  created_at timestamp with time zone,
  validation_status text,
  is_favorited boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    bo.id,
    bo.title,
    bo.description,
    bo.organization_id,
    bo.created_at,
    bo.validation_status,
    bo.is_favorited
  FROM public.business_opportunities bo
  WHERE bo.organization_id = ANY(p_organization_ids)
    AND EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.organization_id = bo.organization_id 
      AND om.user_id = p_user_id
    )
  ORDER BY bo.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Create function to clean up expired cache entries (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Clean up expired subscription cache
  DELETE FROM public.subscription_cache
  WHERE expires_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up old market cache
  DELETE FROM public.market_cache
  WHERE expires_at < NOW();
  
  -- Clean up old reddit queries
  DELETE FROM public.reddit_queries
  WHERE expires_at < NOW() - INTERVAL '2 hours';
  
  RETURN deleted_count;
END;
$function$;