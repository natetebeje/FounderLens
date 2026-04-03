-- Give admin users Pro plan for better testing and management capabilities
UPDATE public.subscriptions 
SET 
  plan_tier = 'pro',
  updated_at = now()
WHERE user_id IN (
  SELECT user_id FROM profiles WHERE is_admin = true
);