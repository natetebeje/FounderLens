-- Fix ambiguous column reference in get_or_create_validation_workflow function
-- Explicitly qualify the opportunity_id column in ON CONFLICT clause
CREATE OR REPLACE FUNCTION public.get_or_create_validation_workflow(p_opportunity_id uuid)
 RETURNS TABLE(id uuid, opportunity_id uuid, workflow_type text, status text, progress_percentage integer, started_at timestamp with time zone, completed_at timestamp with time zone, automated_score integer, automated_validation_results jsonb, automated_recommendation text, last_automated_validation timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  workflow_record RECORD;
BEGIN
  -- First try to get existing workflow
  SELECT vw.* INTO workflow_record
  FROM public.validation_workflows vw
  WHERE vw.opportunity_id = p_opportunity_id;
  
  -- If workflow exists, return it
  IF FOUND THEN
    RETURN QUERY
    SELECT 
      workflow_record.id,
      workflow_record.opportunity_id,
      workflow_record.workflow_type,
      workflow_record.status,
      workflow_record.progress_percentage,
      workflow_record.started_at,
      workflow_record.completed_at,
      workflow_record.automated_score,
      workflow_record.automated_validation_results,
      workflow_record.automated_recommendation,
      workflow_record.last_automated_validation,
      workflow_record.created_at,
      workflow_record.updated_at;
    RETURN;
  END IF;
  
  -- If no workflow exists, create one (fix: explicitly qualify column in ON CONFLICT)
  INSERT INTO public.validation_workflows (
    opportunity_id,
    workflow_type,
    status,
    progress_percentage
  ) VALUES (
    p_opportunity_id,
    'standard',
    'not_started',
    0
  )
  ON CONFLICT (validation_workflows.opportunity_id) DO NOTHING;
  
  -- Get the workflow (either the one we just created or one created by concurrent request)
  SELECT vw.* INTO workflow_record
  FROM public.validation_workflows vw
  WHERE vw.opportunity_id = p_opportunity_id;
  
  -- Return the workflow
  RETURN QUERY
  SELECT 
    workflow_record.id,
    workflow_record.opportunity_id,
    workflow_record.workflow_type,
    workflow_record.status,
    workflow_record.progress_percentage,
    workflow_record.started_at,
    workflow_record.completed_at,
    workflow_record.automated_score,
    workflow_record.automated_validation_results,
    workflow_record.automated_recommendation,
    workflow_record.last_automated_validation,
    workflow_record.created_at,
    workflow_record.updated_at;
END;
$function$;