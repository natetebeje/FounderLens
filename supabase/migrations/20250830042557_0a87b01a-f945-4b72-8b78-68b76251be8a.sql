-- Add composite_score and last_signal_at to validation_workflows table
ALTER TABLE public.validation_workflows 
ADD COLUMN IF NOT EXISTS composite_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_signal_at timestamp with time zone DEFAULT NULL;

-- Drop and recreate the function with new return columns
DROP FUNCTION IF EXISTS public.get_or_create_validation_workflow(uuid);

CREATE OR REPLACE FUNCTION public.get_or_create_validation_workflow(p_opportunity_id uuid)
RETURNS TABLE(
  id uuid, 
  opportunity_id uuid, 
  workflow_type text, 
  status text, 
  progress_percentage integer, 
  started_at timestamp with time zone, 
  completed_at timestamp with time zone, 
  automated_score integer, 
  automated_validation_results jsonb, 
  automated_recommendation text, 
  last_automated_validation timestamp with time zone, 
  reddit_validation_results jsonb, 
  composite_score integer,
  last_signal_at timestamp with time zone,
  created_at timestamp with time zone, 
  updated_at timestamp with time zone
)
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
      workflow_record.reddit_validation_results,
      workflow_record.composite_score,
      workflow_record.last_signal_at,
      workflow_record.created_at,
      workflow_record.updated_at;
    RETURN;
  END IF;
  
  -- If no workflow exists, create one
  INSERT INTO public.validation_workflows (
    opportunity_id,
    workflow_type,
    status,
    progress_percentage,
    composite_score
  ) VALUES (
    p_opportunity_id,
    'standard',
    'not_started',
    0,
    0
  );
  
  -- Get the newly created workflow
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
    workflow_record.reddit_validation_results,
    workflow_record.composite_score,
    workflow_record.last_signal_at,
    workflow_record.created_at,
    workflow_record.updated_at;
END;
$function$;