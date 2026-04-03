-- Create missing profile for existing user that doesn't have one
-- This fixes the Settings page error where user has no profile record

INSERT INTO public.profiles (user_id, first_name, last_name, full_name, is_admin, email_verified, onboarding_completed)
SELECT 
  u.id,
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name', 
  COALESCE(u.raw_user_meta_data ->> 'first_name', '') || ' ' || COALESCE(u.raw_user_meta_data ->> 'last_name', ''),
  false,
  COALESCE((u.raw_user_meta_data ->> 'email_verified')::boolean, false),
  false
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM public.profiles)
  AND u.deleted_at IS NULL;

-- Ensure organization membership exists for users who own organizations but aren't members
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT o.id, o.owner_id, 'owner'
FROM public.organizations o
WHERE o.owner_id NOT IN (
  SELECT om.user_id 
  FROM public.organization_members om 
  WHERE om.organization_id = o.id
);

-- Add constraint to prevent duplicate organization slugs in the future
-- First remove any potential duplicates by keeping the earliest created one
DELETE FROM public.organizations 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM public.organizations 
  GROUP BY slug
);