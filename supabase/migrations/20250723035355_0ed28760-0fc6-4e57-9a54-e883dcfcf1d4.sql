-- Upgrade ntebejeofficial@gmail.com user to Pro plan
UPDATE public.subscriptions 
SET 
  plan_tier = 'pro',
  status = 'active',
  updated_at = now()
WHERE user_id = 'fd1605a9-1a5c-4969-bccc-5ee909515102';