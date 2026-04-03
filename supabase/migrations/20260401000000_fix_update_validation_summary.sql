-- Fix update_validation_summary to read research score from the correct source
-- Previously read from reddit_discussions table (often empty), now reads from
-- validation_workflows.reddit_validation_results JSONB where the score is actually stored.

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

  -- Fallback: check validation_workflows.automated_score
  IF ai_score = 0 THEN
    SELECT COALESCE(automated_score, 0) INTO ai_score
    FROM public.validation_workflows
    WHERE opportunity_id = p_opportunity_id;
  END IF;

  -- Get community/research score from validation_workflows.reddit_validation_results JSONB
  -- This is where validate-opportunity-research stores the researchScore
  SELECT COALESCE((reddit_validation_results->>'researchScore')::integer, 0)
  INTO reddit_score
  FROM public.validation_workflows
  WHERE opportunity_id = p_opportunity_id;

  -- Fallback: if no JSONB score, check reddit_discussions table
  IF reddit_score = 0 THEN
    SELECT COALESCE(AVG(relevance_score), 0)::integer INTO reddit_score
    FROM public.reddit_discussions
    WHERE opportunity_id = p_opportunity_id;
  END IF;

  -- Calculate composite score (weighted average: 60% AI, 40% community research)
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
