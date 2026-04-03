-- Fix infinite recursion in organization_members policies
-- The issue is that organization_members policies were referencing organization_members table itself

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view organization members for their organizations" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can join organizations when invited" ON public.organization_members;

-- Create simpler, non-recursive policies for organization_members
CREATE POLICY "Users can view their own memberships" 
  ON public.organization_members 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can view memberships in organizations they own" 
  ON public.organization_members 
  FOR SELECT 
  USING (
    organization_id IN (
      SELECT id 
      FROM public.organizations 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can manage all members" 
  ON public.organization_members 
  FOR ALL 
  USING (
    organization_id IN (
      SELECT id 
      FROM public.organizations 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can join organizations when invited" 
  ON public.organization_members 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());