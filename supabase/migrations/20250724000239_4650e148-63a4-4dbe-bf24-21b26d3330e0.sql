-- Update feature gates for new pricing structure
-- Remove existing opportunities feature gates
DELETE FROM public.feature_gates WHERE feature_name = 'opportunities';

-- Insert new opportunities feature gates with updated structure
INSERT INTO public.feature_gates (feature_name, plan_tier, limit_value, is_enabled) VALUES
-- Free plan: 9 opportunities (3 discoveries × 3 opportunities each)
('opportunities', 'free', 9, true),
-- Basic plan: 75 opportunities (25 discoveries × 3 opportunities each)  
('opportunities', 'basic', 75, true),
-- Pro plan: unlimited opportunities
('opportunities', 'pro', NULL, true),
-- Enterprise plan: unlimited opportunities
('opportunities', 'enterprise', NULL, true)

ON CONFLICT (feature_name, plan_tier) DO UPDATE SET
  limit_value = EXCLUDED.limit_value,
  is_enabled = EXCLUDED.is_enabled;