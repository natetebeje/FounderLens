-- Grant admin access to the current user
-- This will make the first user found an admin (assuming it's the account owner)
UPDATE public.profiles 
SET is_admin = true 
WHERE user_id = (
  SELECT user_id 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- If no profiles exist yet, we'll also create a function to auto-grant admin to first user
CREATE OR REPLACE FUNCTION public.auto_grant_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count integer;
BEGIN
  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  -- If this is the first user (count = 1 after insert), make them admin
  IF user_count = 1 THEN
    NEW.is_admin = true;
    RAISE LOG 'Auto-granted admin access to first user: %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-grant admin to first user
DROP TRIGGER IF EXISTS auto_grant_first_admin_trigger ON public.profiles;
CREATE TRIGGER auto_grant_first_admin_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_first_admin();

-- Also create a manual function to grant admin access (admin-only)
CREATE OR REPLACE FUNCTION public.grant_admin_access(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_count integer;
  result json;
BEGIN
  -- Check if there are any existing admins
  SELECT COUNT(*) INTO current_user_count 
  FROM public.profiles 
  WHERE is_admin = true;
  
  -- If no admins exist, allow this operation (bootstrap case)
  -- Otherwise, require current user to be admin
  IF current_user_count > 0 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Grant admin access
  UPDATE public.profiles 
  SET is_admin = true 
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found with ID: %', target_user_id;
  END IF;
  
  -- Log the action if there's a current admin user
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id, 
      action_type, 
      target_user_id, 
      action_details
    ) VALUES (
      auth.uid(), 
      'grant_admin', 
      target_user_id, 
      jsonb_build_object('reason', 'manual_grant')
    );
  END IF;
  
  result := json_build_object(
    'success', true,
    'message', 'Admin access granted successfully',
    'user_id', target_user_id
  );
  
  RETURN result;
END;
$$;