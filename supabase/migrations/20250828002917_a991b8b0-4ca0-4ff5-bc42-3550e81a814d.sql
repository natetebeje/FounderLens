-- Add composite score and last signal timestamp to validation workflows
ALTER TABLE public.validation_workflows 
ADD COLUMN composite_score integer DEFAULT NULL,
ADD COLUMN last_signal_at timestamp with time zone DEFAULT NULL;

-- Create function to update validation summary based on AI and Reddit results
CREATE OR REPLACE FUNCTION public.update_validation_summary(p_opportunity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ai_score integer := 0;
  reddit_score integer := 0;
  final_score integer := 0;
  validation_status text := 'needs_validation';
  result jsonb;
BEGIN
  -- Get AI validation score from automated_market_intelligence
  SELECT COALESCE(confidence_score, 0) INTO ai_score
  FROM public.automated_market_intelligence
  WHERE opportunity_id = p_opportunity_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get Reddit validation score from reddit_discussions (average relevance_score)
  SELECT COALESCE(AVG(relevance_score), 0)::integer INTO reddit_score
  FROM public.reddit_discussions
  WHERE opportunity_id = p_opportunity_id;
  
  -- Calculate composite score (weighted average: 60% AI, 40% Reddit)
  final_score := ROUND((ai_score * 0.6) + (reddit_score * 0.4));
  
  -- Determine status based on score
  IF final_score >= 70 THEN
    validation_status := 'ready_to_build';
  ELSIF final_score >= 50 THEN
    validation_status := 'needs_focused_tasks';
  ELSE
    validation_status := 'needs_validation';
  END IF;
  
  -- Update validation workflow
  UPDATE public.validation_workflows
  SET 
    composite_score = final_score,
    last_signal_at = NOW(),
    status = validation_status,
    updated_at = NOW()
  WHERE opportunity_id = p_opportunity_id;
  
  -- Return summary
  result := jsonb_build_object(
    'composite_score', final_score,
    'ai_score', ai_score,
    'reddit_score', reddit_score,
    'status', validation_status,
    'last_signal_at', NOW()
  );
  
  RETURN result;
END;
$function$;