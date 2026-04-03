-- Transfer enterprise subscription from natnaelgetachew9@gmail.com to support@founderlens.io
-- From: 1d161501-e147-427e-b312-3cd63e1432b4 (natnaelgetachew9@gmail.com)
-- To: 70c735a9-6726-461f-a63c-71449cb4b000 (support@founderlens.io)
-- Organization: ea714dd1-4792-4973-be21-46c5b89a3e5a

-- Step 1: Delete the existing free subscription for support@founderlens.io to avoid conflicts
DELETE FROM public.subscriptions 
WHERE user_id = '70c735a9-6726-461f-a63c-71449cb4b000'
  AND organization_id = '163960f0-a9c4-4ea0-a472-b808799facc1'
  AND plan_tier = 'free';

-- Step 2: Transfer the enterprise subscription by updating the user_id
UPDATE public.subscriptions 
SET 
  user_id = '70c735a9-6726-461f-a63c-71449cb4b000',
  updated_at = NOW()
WHERE user_id = '1d161501-e147-427e-b312-3cd63e1432b4'
  AND organization_id = 'ea714dd1-4792-4973-be21-46c5b89a3e5a'
  AND plan_tier = 'enterprise';

-- Step 3: Clear subscription cache for both users to force fresh data
DELETE FROM public.subscription_cache 
WHERE user_id IN (
  '1d161501-e147-427e-b312-3cd63e1432b4',
  '70c735a9-6726-461f-a63c-71449cb4b000'
);

-- Step 4: Verify the transfer worked - support@founderlens.io should now have the enterprise subscription
SELECT 
  user_id,
  organization_id,
  plan_tier,
  status,
  stripe_customer_id,
  created_at,
  updated_at
FROM public.subscriptions 
WHERE user_id = '70c735a9-6726-461f-a63c-71449cb4b000'
ORDER BY created_at DESC;