-- Reset subscription plans for existing users to align with production feature gates
-- Update all existing subscriptions to 'free' plan as the default production tier
UPDATE public.subscriptions 
SET 
  plan_tier = 'free',
  updated_at = now()
WHERE plan_tier != 'free';

-- Optional: If you want to give some existing users a Pro trial, uncomment below
-- UPDATE public.subscriptions 
-- SET 
--   plan_tier = 'pro',
--   trial_start = now(),
--   trial_end = now() + interval '14 days',
--   updated_at = now()
-- WHERE user_id IN (
--   -- Add specific user IDs here if you want to give them Pro trials
--   SELECT user_id FROM profiles WHERE is_admin = true
-- );