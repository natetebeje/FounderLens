-- Fix contact form submissions security policies
-- Drop existing policies to recreate them with enhanced security

DROP POLICY IF EXISTS "Admins can view all contact submissions" ON public.contact_form_submissions;
DROP POLICY IF EXISTS "Admins can update contact submissions" ON public.contact_form_submissions;
DROP POLICY IF EXISTS "Anyone can insert contact submissions" ON public.contact_form_submissions;

-- Recreate policies with explicit admin-only access
CREATE POLICY "Admins can view all contact submissions" 
ON public.contact_form_submissions
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admin update policy 
CREATE POLICY "Admins can update contact submissions" 
ON public.contact_form_submissions
FOR UPDATE
TO authenticated
USING (public.is_admin());

-- Public insert policy (needed for contact form functionality)
CREATE POLICY "Anyone can insert contact submissions" 
ON public.contact_form_submissions
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Add security comment
COMMENT ON TABLE public.contact_form_submissions IS 'Contact form submissions - Contains sensitive customer data. SELECT/UPDATE access restricted to admin users only via RLS policies.';