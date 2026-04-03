-- Drop the problematic policies first
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can view all business opportunities" ON public.business_opportunities;
DROP POLICY IF EXISTS "Admins can view all validation tasks" ON public.validation_tasks;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can view all organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can view all workspace activities" ON public.workspace_activities;
DROP POLICY IF EXISTS "Admins can view all usage tracking" ON public.usage_tracking;
DROP POLICY IF EXISTS "Admins can view all automated market intelligence" ON public.automated_market_intelligence;
DROP POLICY IF EXISTS "Admins can view all validation workflows" ON public.validation_workflows;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Now create the admin policies using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all organizations" 
ON public.organizations 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all business opportunities" 
ON public.business_opportunities 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all validation tasks" 
ON public.validation_tasks 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all organization members" 
ON public.organization_members 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all workspace activities" 
ON public.workspace_activities 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all usage tracking" 
ON public.usage_tracking 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all automated market intelligence" 
ON public.automated_market_intelligence 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can view all validation workflows" 
ON public.validation_workflows 
FOR SELECT 
USING (public.is_admin());