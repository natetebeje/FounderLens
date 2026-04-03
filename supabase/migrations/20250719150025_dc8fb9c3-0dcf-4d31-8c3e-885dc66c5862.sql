-- Complete fix for infinite recursion by making policies completely independent

-- Drop the problematic organizations policy that still has recursion
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON public.organizations;

-- Create completely separate, non-recursive policies

-- For organizations: Only check direct ownership, no cross-table references
CREATE POLICY "Users can view organizations they own" 
  ON public.organizations 
  FOR SELECT 
  USING (owner_id = auth.uid());

-- For organizations: Allow viewing if user is explicitly a member (simple EXISTS check)
CREATE POLICY "Users can view organizations where they are members" 
  ON public.organizations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_members.organization_id = organizations.id 
      AND organization_members.user_id = auth.uid()
    )
  );

-- Ensure the user can insert organizations they create
CREATE POLICY "Users can create organizations" 
  ON public.organizations 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

-- Allow users to update organizations they own
CREATE POLICY "Users can update organizations they own" 
  ON public.organizations 
  FOR UPDATE 
  USING (owner_id = auth.uid());