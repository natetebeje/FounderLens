
-- Phase 1: Database Cleanup - Remove all generated data but keep user accounts
-- Delete all business opportunities and cascading related data
DELETE FROM public.business_opportunities;

-- Delete automated market intelligence (should cascade, but ensuring cleanup)
DELETE FROM public.automated_market_intelligence;

-- Delete validation tasks and workflows (should cascade, but ensuring cleanup)
DELETE FROM public.validation_tasks;
DELETE FROM public.validation_workflows;

-- Clear workspace activities (keep user activities but remove opportunity-related ones)
DELETE FROM public.workspace_activities;

-- Reset usage tracking for fresh start
DELETE FROM public.usage_tracking;

-- Clear Reddit queries cache for fresh start
DELETE FROM public.reddit_queries;

-- Phase 2: Clean up and restructure feature gates
-- First, remove all existing feature gates to avoid conflicts
DELETE FROM public.feature_gates;

-- Phase 3: Insert production-ready feature gates with consistent naming
INSERT INTO public.feature_gates (feature_name, plan_tier, limit_value, is_enabled) VALUES
-- FREE PLAN (generous to attract users)
('opportunities', 'free', 9, true),           -- 9 opportunities as requested
('ai_generations', 'free', 3, true),          -- 3 MVP generations as requested
('team_members', 'free', 1, true),            -- Single user
('validations', 'free', 2, true),             -- Basic validation workflows
('advanced_analytics', 'free', 0, false),     -- Disabled for free

-- PRO PLAN (professional tier)
('opportunities', 'pro', 50, true),           -- Good for small teams
('ai_generations', 'pro', 25, true),          -- Active usage allowance
('team_members', 'pro', 10, true),            -- Small team collaboration
('validations', 'pro', 20, true),             -- Comprehensive validation
('advanced_analytics', 'pro', 1, true),       -- Enabled

-- ENTERPRISE PLAN (unlimited)
('opportunities', 'enterprise', NULL, true),    -- Unlimited
('ai_generations', 'enterprise', NULL, true),   -- Unlimited
('team_members', 'enterprise', NULL, true),     -- Unlimited
('validations', 'enterprise', NULL, true),      -- Unlimited
('advanced_analytics', 'enterprise', 1, true),  -- Enabled
('enterprise_features', 'enterprise', 1, true)  -- Exclusive enterprise features

ON CONFLICT (feature_name, plan_tier) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  is_enabled = EXCLUDED.is_enabled;

-- Update the get_real_usage_count function to handle the cleaned database
CREATE OR REPLACE FUNCTION public.get_real_usage_count(
  p_organization_id UUID,
  p_resource_type TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
