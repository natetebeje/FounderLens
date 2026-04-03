-- Add Professional Lifetime plan support
-- Add new plan tier to feature_gates
INSERT INTO public.feature_gates (feature_name, plan_tier, limit_value, is_enabled) VALUES
('opportunities', 'pro_lifetime', NULL, true),
('team_members', 'pro_lifetime', 10, true),
('ai_generations', 'pro_lifetime', 1000, true),
('validations', 'pro_lifetime', NULL, true),
('storage_gb', 'pro_lifetime', 50, true),
('api_calls', 'pro_lifetime', 10000, true);

-- Add lifetime subscription support
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS is_lifetime boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lifetime_purchase_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS lifetime_terms_version text DEFAULT 'v1';

-- Create index for better performance on lifetime subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_lifetime ON public.subscriptions(is_lifetime, status) WHERE is_lifetime = true;

-- Update subscription cache to handle lifetime plans
ALTER TABLE public.subscription_cache 
ADD COLUMN IF NOT EXISTS is_lifetime boolean DEFAULT false;

-- Update get_subscription_status function to handle lifetime plans
CREATE OR REPLACE FUNCTION public.get_subscription_status_lifetime(p_user_id uuid, p_organization_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(subscribed boolean, plan_tier text, subscription_end timestamp with time zone, stripe_customer_id text, is_lifetime boolean, from_cache boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cache_record RECORD;
  subscription_record RECORD;
  cache_duration INTERVAL := '10 minutes'::INTERVAL;
BEGIN
  -- Check cache first
  SELECT * INTO cache_record
  FROM public.subscription_cache
  WHERE user_id = p_user_id 
    AND (organization_id = p_organization_id OR (organization_id IS NULL AND p_organization_id IS NULL))
    AND expires_at > NOW()
    AND is_valid = true
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT
      cache_record.subscribed,
      cache_record.plan_tier,
      cache_record.subscription_end,
      cache_record.stripe_customer_id,
      COALESCE(cache_record.is_lifetime, false) as is_lifetime,
      true as from_cache;
    RETURN;
  END IF;

  -- Query subscriptions including lifetime plans
  SELECT * INTO subscription_record
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND (organization_id = p_organization_id OR (organization_id IS NULL AND p_organization_id IS NULL))
    AND status = 'active'
    AND (is_lifetime = true OR current_period_end > NOW())
  ORDER BY 
    CASE WHEN is_lifetime THEN 1 ELSE 0 END DESC, -- Prioritize lifetime
    created_at DESC
  LIMIT 1;

  IF FOUND THEN
    -- Cache the result
    INSERT INTO public.subscription_cache (
      user_id, organization_id, subscribed, plan_tier, 
      subscription_end, stripe_customer_id, is_lifetime, expires_at, is_valid
    ) VALUES (
      p_user_id, p_organization_id, true, subscription_record.plan_tier,
      subscription_record.current_period_end, subscription_record.stripe_customer_id,
      COALESCE(subscription_record.is_lifetime, false),
      NOW() + cache_duration, true
    )
    ON CONFLICT (user_id, organization_id) 
    DO UPDATE SET
      subscribed = true,
      plan_tier = subscription_record.plan_tier,
      subscription_end = subscription_record.current_period_end,
      stripe_customer_id = subscription_record.stripe_customer_id,
      is_lifetime = COALESCE(subscription_record.is_lifetime, false),
      expires_at = NOW() + cache_duration,
      is_valid = true,
      updated_at = NOW();

    RETURN QUERY SELECT
      true as subscribed,
      subscription_record.plan_tier,
      subscription_record.current_period_end,
      subscription_record.stripe_customer_id,
      COALESCE(subscription_record.is_lifetime, false) as is_lifetime,
      false as from_cache;
  ELSE
    -- No subscription found
    INSERT INTO public.subscription_cache (
      user_id, organization_id, subscribed, plan_tier,
      subscription_end, stripe_customer_id, is_lifetime, expires_at, is_valid
    ) VALUES (
      p_user_id, p_organization_id, false, 'free',
      NULL, NULL, false, NOW() + (cache_duration / 2), true
    )
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
      subscribed = false,
      plan_tier = 'free',
      subscription_end = NULL,
      stripe_customer_id = NULL,
      is_lifetime = false,
      expires_at = NOW() + (cache_duration / 2),
      is_valid = true,
      updated_at = NOW();

    RETURN QUERY SELECT
      false as subscribed,
      'free'::TEXT as plan_tier,
      NULL::TIMESTAMPTZ as subscription_end,
      NULL::TEXT as stripe_customer_id,
      false as is_lifetime,
      false as from_cache;
  END IF;
END;
$function$;