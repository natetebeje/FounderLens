-- Fix email_notifications security vulnerability
-- Remove the overly permissive policy that allows public access
DROP POLICY IF EXISTS "System can manage email notifications" ON public.email_notifications;
DROP POLICY IF EXISTS "Admins can view email notifications" ON public.email_notifications;

-- Create secure policies for email_notifications table
-- Policy 1: Service role can manage email notifications (for edge functions)
CREATE POLICY "Service role can manage email notifications" 
ON public.email_notifications 
FOR ALL 
TO service_role
USING (true);

-- Policy 2: Admins can view and manage email notifications
CREATE POLICY "Admins can manage email notifications" 
ON public.email_notifications 
FOR ALL 
TO authenticated
USING (public.is_admin());

-- Policy 3: Users can only view their own email notifications (if we add user_id in future)
-- This is commented out as the table doesn't currently have user_id
-- CREATE POLICY "Users can view their own email notifications" 
-- ON public.email_notifications 
-- FOR SELECT 
-- TO authenticated
-- USING (user_id = auth.uid());

-- No public access allowed - all unauthenticated requests will be denied
-- No general "system" policy that could be exploited