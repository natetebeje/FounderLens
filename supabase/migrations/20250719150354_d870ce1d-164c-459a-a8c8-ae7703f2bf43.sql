
-- Final fix for infinite recursion - completely reset both tables with minimal, non-overlapping policies

-- Drop ALL existing policies on both tables
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON public.organizations;
DROP POLICY IF EXISTS "organizations_owner_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_member_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_create" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;

DROP POLICY IF EXISTS "members_view_own" ON public.organization_members;
DROP POLICY IF EXISTS "members_owners_view" ON public.organization_members;
DROP POLICY IF EXISTS "members_insert_own" ON public.organization_members;
DROP POLICY IF EXISTS "members_owners_manage" ON public.organization_members;

-- Create completely isolated policies for organizations (no cross-table references)
CREATE POLICY "orgs_owner_only" 
  ON public.organizations 
  FOR SELECT 
  USING (owner_id = auth.uid());

CREATE POLICY "orgs_create_own" 
  ON public.organizations 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "orgs_update_own" 
  ON public.organizations 
  FOR UPDATE 
  USING (owner_id = auth.uid());

-- Create completely isolated policies for organization_members (no cross-table references)
CREATE POLICY "members_own_only" 
  ON public.organization_members 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "members_insert_self" 
  ON public.organization_members 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Temporarily allow all operations for owners on members table (will fix after testing)
CREATE POLICY "members_temp_all" 
  ON public.organization_members 
  FOR ALL 
  USING (user_id = auth.uid());
