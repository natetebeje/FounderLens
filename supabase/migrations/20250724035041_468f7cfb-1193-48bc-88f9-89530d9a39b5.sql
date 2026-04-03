-- Remove admin access from all existing users
UPDATE public.profiles 
SET 
  is_admin = false,
  admin_permissions = '{}'::jsonb,
  updated_at = now()
WHERE is_admin = true;

-- Grant admin access to support@founderlens.io
-- First, we need to find if this user exists in auth.users
-- If they don't exist yet, they'll need to sign up first, then this will activate when they do

-- Create or update profile for support@founderlens.io when they sign up
-- This uses a function that will work regardless of whether the user exists yet
CREATE OR REPLACE FUNCTION public.setup_support_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  support_user_id uuid;
BEGIN
  -- Try to find the user by email in auth.users
  SELECT id INTO support_user_id 
  FROM auth.users 
  WHERE email = 'support@founderlens.io' 
  LIMIT 1;
  
  -- If user exists, update their profile
  IF support_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      user_id, 
      first_name, 
      last_name, 
      full_name,
      is_admin, 
      email_verified,
      admin_permissions
    ) VALUES (
      support_user_id,
      'Support',
      'Team',
      'Support Team',
      true,
      true,
      jsonb_build_object(
        'can_manage_users', true,
        'can_view_audit_logs', true,
        'can_manage_organizations', true,
        'can_access_admin_panel', true,
        'granted_at', now()
      )
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      is_admin = true,
      email_verified = true,
      first_name = COALESCE(profiles.first_name, 'Support'),
      last_name = COALESCE(profiles.last_name, 'Team'),
      full_name = COALESCE(profiles.full_name, 'Support Team'),
      admin_permissions = jsonb_build_object(
        'can_manage_users', true,
        'can_view_audit_logs', true,
        'can_manage_organizations', true,
        'can_access_admin_panel', true,
        'granted_at', now()
      ),
      updated_at = now();
      
    RAISE LOG 'Granted admin access to existing user: support@founderlens.io (%))', support_user_id;
  ELSE
    RAISE LOG 'User support@founderlens.io does not exist yet. Admin access will be granted when they sign up.';
  END IF;
END;
$$;

-- Execute the function
SELECT public.setup_support_admin();

-- Create a trigger to automatically grant admin to support@founderlens.io when they sign up
CREATE OR REPLACE FUNCTION public.auto_grant_support_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if this is the support email
  IF NEW.email = 'support@founderlens.io' THEN
    -- Update the profile that will be created by the existing trigger
    -- Use a slight delay to ensure the profile creation trigger runs first
    PERFORM pg_sleep(0.1);
    
    UPDATE public.profiles 
    SET 
      is_admin = true,
      email_verified = true,
      admin_permissions = jsonb_build_object(
        'can_manage_users', true,
        'can_view_audit_logs', true,
        'can_manage_organizations', true,
        'can_access_admin_panel', true,
        'granted_at', now()
      ),
      updated_at = now()
    WHERE user_id = NEW.id;
    
    RAISE LOG 'Auto-granted admin access to support@founderlens.io';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for future signups
DROP TRIGGER IF EXISTS on_support_user_created ON auth.users;
CREATE TRIGGER on_support_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_grant_support_admin();