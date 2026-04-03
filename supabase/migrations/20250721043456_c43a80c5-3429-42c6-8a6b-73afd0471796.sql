
-- Add user preference columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN notification_preferences jsonb DEFAULT '{"email": true, "push": true, "in_app": true}'::jsonb,
ADD COLUMN privacy_settings jsonb DEFAULT '{"profile_visible": true, "data_sharing": false}'::jsonb,
ADD COLUMN app_preferences jsonb DEFAULT '{"theme": "system", "language": "en"}'::jsonb,
ADD COLUMN email_verified boolean DEFAULT false,
ADD COLUMN is_admin boolean DEFAULT false,
ADD COLUMN admin_permissions jsonb DEFAULT '{}'::jsonb;

-- Create index for faster admin queries
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Create audit log table for admin actions
CREATE TABLE public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid REFERENCES auth.users NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES auth.users,
  action_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  )
);

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (
  admin_user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.is_admin = true
  )
);
