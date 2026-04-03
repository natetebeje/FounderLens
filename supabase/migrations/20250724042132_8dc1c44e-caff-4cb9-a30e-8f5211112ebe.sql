-- Update the admin user's subscription to enterprise level
-- User ID: 1d161501-e147-427e-b312-3cd63e1432b4
-- Organization ID: ea714dd1-4792-4973-be21-46c5b89a3e5a

-- First, update or insert the subscription record
INSERT INTO public.subscriptions (
  user_id,
  organization_id,
  plan_tier,
  status,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
) VALUES (
  '1d161501-e147-427e-b312-3cd63e1432b4',
  'ea714dd1-4792-4973-be21-46c5b89a3e5a',
  'enterprise',
  'active',
  'enterprise_admin_customer',
  'enterprise_admin_subscription',
  NOW(),
  NOW() + INTERVAL '1 year',
  NOW(),
  NOW()
)
ON CONFLICT (user_id, organization_id) 
DO UPDATE SET
  plan_tier = 'enterprise',
  status = 'active',
  stripe_customer_id = 'enterprise_admin_customer',
  stripe_subscription_id = 'enterprise_admin_subscription',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 year',
  updated_at = NOW();

-- Clear any existing subscription cache for this user/organization
DELETE FROM public.subscription_cache 
WHERE user_id = '1d161501-e147-427e-b312-3cd63e1432b4' 
  AND organization_id = 'ea714dd1-4792-4973-be21-46c5b89a3e5a';

-- Also clear cache entries with null organization_id for this user
DELETE FROM public.subscription_cache 
WHERE user_id = '1d161501-e147-427e-b312-3cd63e1432b4' 
  AND organization_id IS NULL;