-- Clean up the duplicate personal workspace that's causing free subscription conflicts
-- Personal workspace to remove: 53823832-5deb-4f90-bbde-2a6691bc75d6
-- Enterprise workspace to keep: ea714dd1-4792-4973-be21-46c5b89a3e5a

-- Step 1: Delete the free subscription for the duplicate personal workspace
DELETE FROM public.subscriptions 
WHERE organization_id = '53823832-5deb-4f90-bbde-2a6691bc75d6';

-- Step 2: Delete organization membership for the duplicate personal workspace
DELETE FROM public.organization_members 
WHERE organization_id = '53823832-5deb-4f90-bbde-2a6691bc75d6';

-- Step 3: Delete the duplicate personal workspace
DELETE FROM public.organizations 
WHERE id = '53823832-5deb-4f90-bbde-2a6691bc75d6';

-- Step 4: Clear all subscription cache to force fresh data
DELETE FROM public.subscription_cache 
WHERE user_id = '70c735a9-6726-461f-a63c-71449cb4b000';

-- Step 5: Verify the final state - user should only have enterprise workspace
SELECT 
  'Final cleanup verification' as check_type,
  o.id,
  o.name,
  o.slug,
  om.role,
  s.plan_tier,
  s.status
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id 
LEFT JOIN subscriptions s ON o.id = s.organization_id
WHERE om.user_id = '70c735a9-6726-461f-a63c-71449cb4b000'
   OR o.owner_id = '70c735a9-6726-461f-a63c-71449cb4b000';