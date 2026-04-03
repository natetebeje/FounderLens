
-- Clean up duplicate feature gate entries and ensure consistent naming
DELETE FROM public.feature_gates WHERE feature_name = 'ai_generation';

-- Update feature gates with correct data structure
DELETE FROM public.feature_gates;

INSERT INTO public.feature_gates (feature_name, plan_tier, limit_value, is_enabled) VALUES
-- Team members limits
('team_members', 'free', 3, true),
('team_members', 'basic', 5, true),
('team_members', 'pro', 10, true),
('team_members', 'enterprise', NULL, true),

-- Opportunities limits  
('opportunities', 'free', 5, true),
('opportunities', 'basic', 25, true),
('opportunities', 'pro', 100, true),
('opportunities', 'enterprise', NULL, true),

-- AI generation limits
('ai_generations', 'free', 10, true),
('ai_generations', 'basic', 50, true),
('ai_generations', 'pro', 200, true),
('ai_generations', 'enterprise', NULL, true),

-- Validation workflows
('validations', 'free', 3, true),
('validations', 'basic', 15, true),
('validations', 'pro', 50, true),
('validations', 'enterprise', NULL, true),

-- Advanced analytics
('advanced_analytics', 'free', 0, false),
('advanced_analytics', 'basic', 1, true),
('advanced_analytics', 'pro', 1, true),
('advanced_analytics', 'enterprise', 1, true),

-- Enterprise features
('enterprise_features', 'free', 0, false),
('enterprise_features', 'basic', 0, false),
('enterprise_features', 'pro', 0, false),
('enterprise_features', 'enterprise', 1, true)

ON CONFLICT (feature_name, plan_tier) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  is_enabled = EXCLUDED.is_enabled;

-- Create function to get real usage counts
CREATE OR REPLACE FUNCTION public.get_real_usage_count(
  p_organization_id UUID,
  p_resource_type TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Update the increment_usage function to handle organization_id properly
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_organization_id UUID,
  p_resource_type TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Fix the check_feature_limit function to use organization_id properly
CREATE OR REPLACE FUNCTION public.check_feature_limit(
  p_user_id UUID,
  p_organization_id UUID,
  p_feature_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_plan TEXT;
  feature_limit INTEGER;
  current_usage INTEGER;
BEGIN
  -- Get current plan (try subscription first, then default to free)
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
  WHERE feature_name = p_feature_name AND plan_tier = current_plan;
  
  -- If limit is NULL, feature is unlimited
  IF feature_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- If limit is 0, feature is disabled
  IF feature_limit = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Get current usage from usage_tracking table first
  SELECT COALESCE(count, 0) INTO current_usage
  FROM public.usage_tracking
  WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND resource_type = p_feature_name
    AND period_start <= NOW()
    AND period_end >= NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no usage tracking data, get real counts
  IF current_usage = 0 THEN
    current_usage := public.get_real_usage_count(p_organization_id, p_feature_name);
  END IF;
  
  -- Check if under limit
  RETURN current_usage < feature_limit;
END;
$$;

-- Add unique constraint to usage_tracking to prevent conflicts
ALTER TABLE public.usage_tracking 
ADD CONSTRAINT unique_user_org_resource_period 
UNIQUE (user_id, organization_id, resource_type, period_start);
