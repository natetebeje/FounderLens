-- Set the current user as admin
-- User ID from auth logs: fd1605a9-1a5c-4969-bccc-5ee909515102

-- First, ensure the profile exists
INSERT INTO public.profiles (user_id, first_name, last_name, is_admin, email_verified)
VALUES (
  'fd1605a9-1a5c-4969-bccc-5ee909515102',
  'Admin',
  'Tebeje',
  true,
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  is_admin = true,
  email_verified = true,
  first_name = COALESCE(profiles.first_name, 'Admin'),
  last_name = COALESCE(profiles.last_name, 'Tebeje');

-- Optionally create a personal organization for this admin user if it doesn't exist
INSERT INTO public.organizations (name, slug, owner_id)
VALUES (
  'Admin Personal Workspace',
  'personal-fd1605a9-1a5c-4969-bccc-5ee909515102',
  'fd1605a9-1a5c-4969-bccc-5ee909515102'
)
ON CONFLICT (slug) DO NOTHING;

-- Add the user as owner of their personal workspace
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT 
  o.id,
  'fd1605a9-1a5c-4969-bccc-5ee909515102',
  'owner'
FROM public.organizations o 
WHERE o.slug = 'personal-fd1605a9-1a5c-4969-bccc-5ee909515102'
ON CONFLICT (organization_id, user_id) DO NOTHING;