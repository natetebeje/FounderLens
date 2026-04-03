-- Fix the log_workspace_activity trigger to handle NULL organization_id cases
CREATE OR REPLACE FUNCTION public.log_workspace_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log opportunity creation only if organization_id is present
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'business_opportunities' THEN
    -- Only log if organization_id is not null
    IF NEW.organization_id IS NOT NULL THEN
      INSERT INTO public.workspace_activities (organization_id, user_id, activity_type, activity_data)
      VALUES (
        NEW.organization_id,
        NEW.user_id,
        'opportunity_created',
        jsonb_build_object('opportunity_id', NEW.id, 'opportunity_title', NEW.title)
      );
    END IF;
  END IF;
  
  -- Log opportunity assignment only if organization_id is present
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'business_opportunities' AND 
     OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    -- Only log if organization_id is not null
    IF NEW.organization_id IS NOT NULL THEN
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
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;