-- Phase 1: Security & Database Hardening

-- 1. Create missing subscription_cache table
CREATE TABLE IF NOT EXISTS public.subscription_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  subscription_end TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_org_cache UNIQUE (user_id, organization_id)
);

-- Enable RLS on subscription_cache
ALTER TABLE public.subscription_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscription_cache
CREATE POLICY "Users can view their own subscription cache"
ON public.subscription_cache
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription cache"
ON public.subscription_cache
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription cache"
ON public.subscription_cache
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscription cache"
ON public.subscription_cache
FOR DELETE
USING (auth.uid() = user_id);

-- 2. Fix function search path security issue
-- Update existing functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_subscription_status(p_user_id uuid, p_organization_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(subscribed boolean, plan_tier text, subscription_end timestamp with time zone, stripe_customer_id text, from_cache boolean)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $function$
DECLARE
  cache_record RECORD;
  subscription_record RECORD;
  cache_duration INTERVAL := '5 minutes'::INTERVAL;
BEGIN
  -- First check cache for valid, non-expired data
  SELECT * INTO cache_record
  FROM public.subscription_cache
  WHERE user_id = p_user_id 
    AND (organization_id = p_organization_id OR (organization_id IS NULL AND p_organization_id IS NULL))
    AND expires_at > NOW()
    AND is_valid = true;

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

  -- No valid cache, query subscriptions table
  SELECT * INTO subscription_record
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND (organization_id = p_organization_id OR (organization_id IS NULL AND p_organization_id IS NULL))
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Determine subscription status
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
    -- No active subscription, cache the negative result
    INSERT INTO public.subscription_cache (
      user_id, organization_id, subscribed, plan_tier,
      subscription_end, stripe_customer_id, expires_at, is_valid
    ) VALUES (
      p_user_id, p_organization_id, false, 'free',
      NULL, NULL, NOW() + cache_duration, true
    )
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
      subscribed = false,
      plan_tier = 'free',
      subscription_end = NULL,
      stripe_customer_id = NULL,
      expires_at = NOW() + cache_duration,
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

-- Update other functions with proper search_path
CREATE OR REPLACE FUNCTION public.invalidate_subscription_cache(p_user_id uuid, p_organization_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Delete matching cache entries
  DELETE FROM public.subscription_cache
  WHERE user_id = p_user_id 
    AND (organization_id = p_organization_id OR (organization_id IS NULL AND p_organization_id IS NULL));
    
  -- Log the cache invalidation for debugging
  RAISE LOG 'Invalidated subscription cache for user_id: %, organization_id: %', p_user_id, p_organization_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_feature_limit(p_user_id uuid, p_organization_id uuid, p_feature_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $function$
DECLARE
  current_plan TEXT;
  feature_limit INTEGER;
  current_usage INTEGER;
BEGIN
  -- Get current plan (get the most recent single subscription)
  SELECT plan_tier INTO current_plan
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND (organization_id = p_organization_id OR organization_id IS NULL)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Default to free if no subscription found
  IF current_plan IS NULL THEN
    current_plan := 'free';
  END IF;
  
  -- Get feature limit
  SELECT limit_value INTO feature_limit
  FROM public.feature_gates
  WHERE feature_name = p_feature_name AND plan_tier = current_plan
  LIMIT 1; -- Ensure we only get one result
  
  -- If limit is NULL, feature is unlimited
  IF feature_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- If limit is 0, feature is disabled
  IF feature_limit = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Get real usage count directly (simpler and more reliable)
  current_usage := public.get_real_usage_count(p_organization_id, p_feature_name);
  
  -- Check if under limit
  RETURN current_usage < feature_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_real_usage_count(p_organization_id uuid, p_resource_type text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $function$
DECLARE
  usage_count INTEGER := 0;
BEGIN
  CASE p_resource_type
    WHEN 'opportunities' THEN
      SELECT COUNT(*) INTO usage_count
      FROM public.business_opportunities
      WHERE organization_id = p_organization_id
        AND created_at >= date_trunc('month', NOW());
    
    WHEN 'team_members' THEN
      SELECT COUNT(*) INTO usage_count
      FROM public.organization_members
      WHERE organization_id = p_organization_id;
    
    WHEN 'ai_generations' THEN
      SELECT COUNT(*) INTO usage_count
      FROM public.automated_market_intelligence ami
      JOIN public.business_opportunities bo ON ami.opportunity_id = bo.id
      WHERE bo.organization_id = p_organization_id
        AND ami.created_at >= date_trunc('month', NOW());
    
    WHEN 'validations' THEN
      SELECT COUNT(*) INTO usage_count
      FROM public.validation_tasks vt
      JOIN public.business_opportunities bo ON vt.opportunity_id = bo.id
      WHERE bo.organization_id = p_organization_id
        AND vt.created_at >= date_trunc('month', NOW());
    
    ELSE
      usage_count := 0;
  END CASE;
  
  RETURN usage_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_workspace_data(p_user_id uuid)
RETURNS TABLE(org_id uuid, org_name text, org_slug text, org_owner_id uuid, org_created_at timestamp with time zone, org_updated_at timestamp with time zone, user_role text, subscription_plan text, subscription_status text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as org_id,
    o.name as org_name,
    o.slug as org_slug,
    o.owner_id as org_owner_id,
    o.created_at as org_created_at,
    o.updated_at as org_updated_at,
    om.role as user_role,
    COALESCE(s.plan_tier, 'free') as subscription_plan,
    COALESCE(s.status, 'active') as subscription_status
  FROM public.organizations o
  LEFT JOIN public.organization_members om ON o.id = om.organization_id
  LEFT JOIN public.subscriptions s ON o.id = s.organization_id AND s.user_id = p_user_id
  WHERE o.slug = 'personal-' || p_user_id::text
    AND om.user_id = p_user_id
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id uuid, p_organization_id uuid, p_resource_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_period_start TIMESTAMPTZ;
  current_period_end TIMESTAMPTZ;
BEGIN
  -- Calculate current billing period (monthly)
  current_period_start := date_trunc('month', NOW());
  current_period_end := current_period_start + interval '1 month';
  
  -- Insert or update usage
  INSERT INTO public.usage_tracking (
    user_id, organization_id, resource_type, count, period_start, period_end
  ) VALUES (
    p_user_id, p_organization_id, p_resource_type, 1, current_period_start, current_period_end
  )
  ON CONFLICT (user_id, organization_id, resource_type, period_start)
  DO UPDATE SET count = usage_tracking.count + 1, updated_at = NOW();
END;
$function$;

-- 3. Add triggers for cache invalidation
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Invalidate cache for the affected user/organization
  IF TG_OP = 'DELETE' THEN
    PERFORM public.invalidate_subscription_cache(OLD.user_id, OLD.organization_id);
    RETURN OLD;
  ELSE
    PERFORM public.invalidate_subscription_cache(NEW.user_id, NEW.organization_id);
    RETURN NEW;
  END IF;
END;
$function$;

-- Create triggers if they don't exist
DROP TRIGGER IF EXISTS subscription_cache_invalidation ON public.subscriptions;
CREATE TRIGGER subscription_cache_invalidation
AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.invalidate_cache_on_subscription_change();

-- 4. Add updated_at trigger for subscription_cache
CREATE TRIGGER update_subscription_cache_updated_at
BEFORE UPDATE ON public.subscription_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();