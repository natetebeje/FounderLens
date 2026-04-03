
-- Fix organization policies to allow viewing organizations where user is a member
-- This will restore visibility of opportunities

-- First, drop the overly restrictive policy
DROP POLICY IF EXISTS "orgs_owner_only" ON public.organizations;

-- Create new policies that allow both ownership and membership access
CREATE POLICY "orgs_owner_select" 
  ON public.organizations 
  FOR SELECT 
  USING (owner_id = auth.uid());

CREATE POLICY "orgs_member_select" 
  ON public.organizations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id 
      AND om.user_id = auth.uid()
    )
  );
