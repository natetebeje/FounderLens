-- Update existing RLS policies for user-related tables to include organization context

-- Update user_goals policies to work with organizations
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON public.user_goals;
DROP POLICY IF EXISTS "Users can view their own goals" ON public.user_goals;

CREATE POLICY "Users can insert goals in their organizations" 
  ON public.user_goals 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update goals in their organizations" 
  ON public.user_goals 
  FOR UPDATE 
  USING (
    auth.uid() = user_id AND
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view goals in their organizations" 
  ON public.user_goals 
  FOR SELECT 
  USING (
    auth.uid() = user_id AND
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Update user_skills policies to work with organizations
DROP POLICY IF EXISTS "Users can insert their own skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users can update their own skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users can view their own skills" ON public.user_skills;
DROP POLICY IF EXISTS "Users can delete their own skills" ON public.user_skills;

CREATE POLICY "Users can insert skills in their organizations" 
  ON public.user_skills 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update skills in their organizations" 
  ON public.user_skills 
  FOR UPDATE 
  USING (
    auth.uid() = user_id AND
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view skills in their organizations" 
  ON public.user_skills 
  FOR SELECT 
  USING (
    auth.uid() = user_id AND
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete skills in their organizations" 
  ON public.user_skills 
  FOR DELETE 
  USING (
    auth.uid() = user_id AND
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );