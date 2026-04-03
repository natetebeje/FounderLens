-- Fix the check_feature_limit function to handle duplicate subscriptions properly
-- The function was returning null because there were multiple subscription rows

CREATE OR REPLACE FUNCTION public.check_feature_limit(p_user_id uuid, p_organization_id uuid, p_feature_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_plan TEXT;
  feature_limit INTEGER;
  current_usage INTEGER;
BEGIN
  -- Get current plan (get the most recent single subscription)
  SELECT plan_tier INTO current_plan
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND (organization_id = p_organization_id OR organization_id IS NULL)
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Default to free if no subscription found
  IF current_plan IS NULL THEN
    current_plan := 'free';
  END IF;
  
  -- Get feature limit
  SELECT limit_value INTO feature_limit
  FROM public.feature_gates
  WHERE feature_name = p_feature_name AND plan_tier = current_plan
  LIMIT 1; -- Ensure we only get one result
  
  -- If limit is NULL, feature is unlimited
  IF feature_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- If limit is 0, feature is disabled
  IF feature_limit = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Get real usage count directly (simpler and more reliable)
  current_usage := public.get_real_usage_count(p_organization_id, p_feature_name);
  
  -- Check if under limit
  RETURN current_usage < feature_limit;
END;
$function$;

-- Test the fixed function
SELECT public.check_feature_limit(
  '8113c128-4016-4c89-a06d-a1742e439ee2',
  'ddb9de7f-3c36-481b-b724-c047be6a7615', 
  'opportunities'
) as can_generate_opportunities;