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