
-- Step 1: Clean up duplicate subscription records
-- Remove all duplicate Pro subscription records with NULL organization_id, keeping only one
WITH ranked_subscriptions AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY user_id, plan_tier ORDER BY created_at DESC) as rn
  FROM public.subscriptions 
  WHERE user_id = 'fd1605a9-1a5c-4969-bccc-5ee909515102' 
    AND plan_tier = 'pro' 
    AND organization_id IS NULL
)
DELETE FROM public.subscriptions 
WHERE id IN (
  SELECT id FROM ranked_subscriptions WHERE rn > 1
);

-- Step 2: Update the organization-specific subscription from 'free' to 'pro'
UPDATE public.subscriptions 
SET 
  plan_tier = 'pro',
  updated_at = NOW()
WHERE user_id = 'fd1605a9-1a5c-4969-bccc-5ee909515102' 
  AND organization_id = 'f4059d92-a979-42b9-a6cb-c4696667244d'
  AND plan_tier = 'free';

-- Step 3: Ensure data integrity by adding a unique constraint to prevent future duplicates
-- This will prevent having multiple subscription records for the same user-organization combination
ALTER TABLE public.subscriptions 
ADD CONSTRAINT unique_user_organization_subscription 
UNIQUE (user_id, organization_id);

-- Step 4: Verify the cleanup worked - this should show only the relevant subscription records
SELECT user_id, organization_id, plan_tier, status, created_at, updated_at
FROM public.subscriptions 
WHERE user_id = 'fd1605a9-1a5c-4969-bccc-5ee909515102'
ORDER BY created_at DESC;
