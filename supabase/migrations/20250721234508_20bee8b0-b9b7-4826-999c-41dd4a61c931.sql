-- Grant admin access to ntebejeofficial@gmail.com
UPDATE public.profiles 
SET 
  is_admin = true,
  admin_permissions = jsonb_build_object(
    'can_manage_users', true,
    'can_view_audit_logs', true,
    'can_manage_organizations', true,
    'can_access_admin_panel', true,
    'granted_at', now()
  ),
  updated_at = now()
WHERE user_id = 'fd1605a9-1a5c-4969-bccc-5ee909515102';