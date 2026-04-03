-- Fix security warnings by adding search_path to functions
CREATE OR REPLACE FUNCTION public.setup_support_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
      
    RAISE LOG 'Granted admin access to existing user: support@founderlens.io (%)', support_user_id;
  ELSE
    RAISE LOG 'User support@founderlens.io does not exist yet. Admin access will be granted when they sign up.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_grant_support_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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