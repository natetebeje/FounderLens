
-- Add workspace invitations table
CREATE TABLE public.workspace_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(organization_id, email)
);

-- Add assigned_to field to business_opportunities
ALTER TABLE public.business_opportunities 
ADD COLUMN assigned_to UUID REFERENCES auth.users(id);

-- Add workspace activity log
CREATE TABLE public.workspace_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_invitations
CREATE POLICY "Organization owners can manage invitations"
  ON public.workspace_invitations
  FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.organizations 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view invitations sent to their email"
  ON public.workspace_invitations
  FOR SELECT
  USING (
    email = auth.email() OR
    organization_id IN (
      SELECT id FROM public.organizations 
      WHERE owner_id = auth.uid()
    )
  );

-- RLS policies for workspace_activities
CREATE POLICY "Organization members can view activities"
  ON public.workspace_activities
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Organization members can create activities"
  ON public.workspace_activities
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create function to log workspace activities
CREATE OR REPLACE FUNCTION public.log_workspace_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log opportunity creation
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'business_opportunities' THEN
    INSERT INTO public.workspace_activities (organization_id, user_id, activity_type, activity_data)
    VALUES (
      NEW.organization_id,
      NEW.user_id,
      'opportunity_created',
      jsonb_build_object('opportunity_id', NEW.id, 'opportunity_title', NEW.title)
    );
  END IF;
  
  -- Log opportunity assignment
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'business_opportunities' AND 
     OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.workspace_activities (organization_id, user_id, activity_type, activity_data)
    VALUES (
      NEW.organization_id,
      auth.uid(),
      'opportunity_assigned',
      jsonb_build_object(
        'opportunity_id', NEW.id, 
        'opportunity_title', NEW.title,
        'assigned_to', NEW.assigned_to
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for activity logging
CREATE TRIGGER log_opportunity_activities
  AFTER INSERT OR UPDATE ON public.business_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.log_workspace_activity();

-- Create trigger for member join activities
CREATE OR REPLACE FUNCTION public.log_member_join()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_activities (organization_id, user_id, activity_type, activity_data)
  VALUES (
    NEW.organization_id,
    NEW.user_id,
    'member_joined',
    jsonb_build_object('role', NEW.role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_member_activities
  AFTER INSERT ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.log_member_join();
