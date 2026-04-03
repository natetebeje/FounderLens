-- Complete reset of organization policies to fix infinite recursion

-- Drop ALL existing policies on organizations table
DROP POLICY IF EXISTS "Users can view organizations they own" ON public.organizations;
DROP POLICY IF EXISTS "Users can view organizations where they are members" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can update organizations they own" ON public.organizations;

-- Create fresh, simple policies with no cross-table recursion

-- Policy 1: Users can view organizations they own (direct check, no joins)
CREATE POLICY "organizations_owner_select" 
  ON public.organizations 
  FOR SELECT 
  USING (owner_id = auth.uid());

-- Policy 2: Users can view organizations where they are members (simple EXISTS)
CREATE POLICY "organizations_member_select" 
  ON public.organizations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organizations.id 
      AND om.user_id = auth.uid()
    )
  );

-- Policy 3: Users can create organizations
CREATE POLICY "organizations_create" 
  ON public.organizations 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

-- Policy 4: Users can update organizations they own
CREATE POLICY "organizations_update" 
  ON public.organizations 
  FOR UPDATE 
  USING (owner_id = auth.uid());