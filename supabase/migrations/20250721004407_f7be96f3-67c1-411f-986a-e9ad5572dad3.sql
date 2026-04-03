-- Populate feature gates with proper data to prevent automatic upgrade prompts
INSERT INTO public.feature_gates (feature_name, plan_tier, limit_value, is_enabled) VALUES
-- Team members limits
('team_members', 'free', 3, true),
('team_members', 'pro', 10, true),
('team_members', 'enterprise', NULL, true),

-- Opportunities limits  
('opportunities', 'free', 5, true),
('opportunities', 'pro', 50, true),
('opportunities', 'enterprise', NULL, true),

-- AI generation limits
('ai_generation', 'free', 3, true),
('ai_generation', 'pro', 25, true),
('ai_generation', 'enterprise', NULL, true),

-- Advanced analytics (NULL means not available for that tier)
('advanced_analytics', 'free', NULL, false),
('advanced_analytics', 'pro', 1, true),
('advanced_analytics', 'enterprise', 1, true),

-- Validation workflows
('validation_workflows', 'free', 2, true),
('validation_workflows', 'pro', 10, true),
('validation_workflows', 'enterprise', NULL, true)

ON CONFLICT (feature_name, plan_tier) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  is_enabled = EXCLUDED.is_enabled;