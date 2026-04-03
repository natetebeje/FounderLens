-- Clean up admin user subscription duplicates and fix enterprise access
-- User ID: 1d161501-e147-427e-b312-3cd63e1432b4
-- Organization ID: ea714dd1-4792-4973-be21-46c5b89a3e5a

-- Step 1: Delete all duplicate free subscriptions with NULL organization_id for the admin user
DELETE FROM public.subscriptions 
WHERE user_id = '1d161501-e147-427e-b312-3cd63e1432b4' 
  AND organization_id IS NULL 
  AND plan_tier = 'free';

-- Step 2: Clear all subscription cache entries for this user to force fresh data
DELETE FROM public.subscription_cache 
WHERE user_id = '1d161501-e147-427e-b312-3cd63e1432b4';

-- Step 3: Verify the enterprise subscription is still there (this is just for logging)
-- The enterprise subscription should remain untouched
SELECT user_id, organization_id, plan_tier, status, created_at, updated_at
FROM public.subscriptions 
WHERE user_id = '1d161501-e147-427e-b312-3cd63e1432b4'
ORDER BY created_at DESC;