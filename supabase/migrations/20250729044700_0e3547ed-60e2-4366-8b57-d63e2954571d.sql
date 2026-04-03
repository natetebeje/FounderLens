-- Remove the free plan subscription for the personal workspace
DELETE FROM public.subscriptions 
WHERE user_id IN (
  SELECT user_id FROM auth.users WHERE email = 'support@founderlens.io'
) 
AND plan_tier = 'free'
AND organization_id = 'd406548b-e90c-4e30-a941-2a11eb9693af';

-- Clean up any subscription conflicts and cache
SELECT public.cleanup_subscription_conflicts();

-- Clear subscription cache to force fresh reads
DELETE FROM public.subscription_cache 
WHERE user_id IN (
  SELECT user_id FROM auth.users WHERE email = 'support@founderlens.io'
);