-- Also fix organization_members policies to ensure no recursion

-- Drop existing organization_members policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can view all members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can join organizations when invited" ON public.organization_members;

-- Create simple, direct policies for organization_members

-- Policy 1: Users can view their own memberships
CREATE POLICY "members_view_own" 
  ON public.organization_members 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Policy 2: Organization owners can view members of their organizations
CREATE POLICY "members_owners_view" 
  ON public.organization_members 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o 
      WHERE o.id = organization_members.organization_id 
      AND o.owner_id = auth.uid()
    )
  );

-- Policy 3: Users can insert their own memberships (when invited)
CREATE POLICY "members_insert_own" 
  ON public.organization_members 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Organization owners can manage members
CREATE POLICY "members_owners_manage" 
  ON public.organization_members 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o 
      WHERE o.id = organization_members.organization_id 
      AND o.owner_id = auth.uid()
    )
  );