
-- Create organizations table for workspaces
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create organization_members table for team membership
CREATE TABLE public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Add organization_id to existing tables (nullable initially for backward compatibility)
ALTER TABLE public.business_opportunities ADD COLUMN organization_id uuid REFERENCES public.organizations;
ALTER TABLE public.user_goals ADD COLUMN organization_id uuid REFERENCES public.organizations;
ALTER TABLE public.user_skills ADD COLUMN organization_id uuid REFERENCES public.organizations;
ALTER TABLE public.user_experiences ADD COLUMN organization_id uuid REFERENCES public.organizations;
ALTER TABLE public.data_integration_preferences ADD COLUMN organization_id uuid REFERENCES public.organizations;

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations
CREATE POLICY "Users can view organizations they are members of" 
  ON public.organizations 
  FOR SELECT 
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update organizations they own" 
  ON public.organizations 
  FOR UPDATE 
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create organizations" 
  ON public.organizations 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

-- RLS policies for organization_members
CREATE POLICY "Users can view organization members for their organizations" 
  ON public.organization_members 
  FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can manage members" 
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

-- Create personal workspace for all existing users
INSERT INTO public.organizations (name, slug, owner_id)
SELECT 
  COALESCE(p.first_name || '''s Personal Workspace', 'Personal Workspace'),
  'personal-' || u.id::text,
  u.id
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id;

-- Add all users as owners of their personal workspaces
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT o.id, o.owner_id, 'owner'
FROM public.organizations o
WHERE o.slug LIKE 'personal-%';

-- Backfill organization_id for existing data
UPDATE public.business_opportunities 
SET organization_id = (
  SELECT id FROM public.organizations 
  WHERE owner_id = business_opportunities.user_id 
  AND slug LIKE 'personal-%'
);

UPDATE public.user_goals 
SET organization_id = (
  SELECT id FROM public.organizations 
  WHERE owner_id = user_goals.user_id 
  AND slug LIKE 'personal-%'
);

UPDATE public.user_skills 
SET organization_id = (
  SELECT id FROM public.organizations 
  WHERE owner_id = user_skills.user_id 
  AND slug LIKE 'personal-%'
);

UPDATE public.user_experiences 
SET organization_id = (
  SELECT id FROM public.organizations 
  WHERE owner_id = user_experiences.user_id 
  AND slug LIKE 'personal-%'
);

UPDATE public.data_integration_preferences 
SET organization_id = (
  SELECT id FROM public.organizations 
  WHERE owner_id = data_integration_preferences.user_id 
  AND slug LIKE 'personal-%'
);

-- Update existing RLS policies to include organization context
-- Update business_opportunities policies
DROP POLICY IF EXISTS "Users can view their own opportunities" ON public.business_opportunities;
CREATE POLICY "Users can view opportunities in their organizations" 
  ON public.business_opportunities 
  FOR SELECT 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own opportunities" ON public.business_opportunities;
CREATE POLICY "Users can create opportunities in their organizations" 
  ON public.business_opportunities 
  FOR INSERT 
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own opportunities" ON public.business_opportunities;
CREATE POLICY "Users can update opportunities in their organizations" 
  ON public.business_opportunities 
  FOR UPDATE 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own opportunities" ON public.business_opportunities;
CREATE POLICY "Users can delete opportunities in their organizations" 
  ON public.business_opportunities 
  FOR DELETE 
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger to automatically create personal workspace for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Create personal workspace
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data ->> 'first_name' || '''s Personal Workspace', 'Personal Workspace'),
    'personal-' || NEW.id::text,
    NEW.id
  );
  
  -- Add user as owner of their personal workspace
  INSERT INTO public.organization_members (organization_id, user_id, role)
  SELECT id, NEW.id, 'owner'
  FROM public.organizations
  WHERE owner_id = NEW.id AND slug = 'personal-' || NEW.id::text;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user workspace creation
CREATE TRIGGER on_auth_user_created_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_organization();

-- Add updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
