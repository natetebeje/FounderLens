-- Option C: Transfer enterprise organization ownership to support@founderlens.io and clean up duplicate workspace
-- Enterprise org: ea714dd1-4792-4973-be21-46c5b89a3e5a 
-- Duplicate personal workspace: 163960f0-a9c4-4ea0-a472-b808799facc1
-- support@founderlens.io: 70c735a9-6726-461f-a63c-71449cb4b000
-- natnaelgetachew9@gmail.com: 1d161501-e147-427e-b312-3cd63e1432b4

-- Step 1: Transfer ownership of the enterprise organization
UPDATE public.organizations 
SET 
  owner_id = '70c735a9-6726-461f-a63c-71449cb4b000',
  name = 'FounderLens Admin Workspace',
  slug = 'founderlens-admin-workspace',
  updated_at = NOW()
WHERE id = 'ea714dd1-4792-4973-be21-46c5b89a3e5a';

-- Step 2: Update organization membership - remove old owner and add new owner
DELETE FROM public.organization_members 
WHERE organization_id = 'ea714dd1-4792-4973-be21-46c5b89a3e5a' 
  AND user_id = '1d161501-e147-427e-b312-3cd63e1432b4';

-- Add support@founderlens.io as owner of the enterprise organization
INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES ('ea714dd1-4792-4973-be21-46c5b89a3e5a', '70c735a9-6726-461f-a63c-71449cb4b000', 'owner')
ON CONFLICT (organization_id, user_id) 
DO UPDATE SET role = 'owner', joined_at = NOW();

-- Step 3: Clean up the duplicate personal workspace
-- Delete the free subscription first
DELETE FROM public.subscriptions 
WHERE user_id = '70c735a9-6726-461f-a63c-71449cb4b000'
  AND organization_id = '163960f0-a9c4-4ea0-a472-b808799facc1'
  AND plan_tier = 'free';

-- Delete organization membership for the duplicate workspace
DELETE FROM public.organization_members 
WHERE organization_id = '163960f0-a9c4-4ea0-a472-b808799facc1';

-- Delete the duplicate personal workspace organization
DELETE FROM public.organizations 
WHERE id = '163960f0-a9c4-4ea0-a472-b808799facc1';

-- Step 4: Clear all subscription cache entries for both users
DELETE FROM public.subscription_cache 
WHERE user_id IN (
  '1d161501-e147-427e-b312-3cd63e1432b4',
  '70c735a9-6726-461f-a63c-71449cb4b000'
);

-- Step 5: Verify the final state
SELECT 
  'Organization ownership transfer' as check_type,
  o.id as org_id,
  o.name as org_name,
  o.owner_id,
  p.email as owner_email
FROM public.organizations o
LEFT JOIN auth.users au ON o.owner_id = au.id
LEFT JOIN public.profiles p ON o.owner_id = p.user_id
WHERE o.id = 'ea714dd1-4792-4973-be21-46c5b89a3e5a';

-- Verify subscription ownership
SELECT 
  'Subscription ownership' as check_type,
  s.user_id,
  s.organization_id,
  s.plan_tier,
  s.status,
  au.email
FROM public.subscriptions s
LEFT JOIN auth.users au ON s.user_id = au.id
WHERE s.organization_id = 'ea714dd1-4792-4973-be21-46c5b89a3e5a';