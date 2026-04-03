-- Step 1: Clean up duplicate subscription records and ensure enterprise plan takes precedence

-- First, let's see what subscriptions exist for the user
-- Then clean up conflicts by keeping only the most permissive subscription per user/organization

-- Create a function to clean up subscription conflicts
CREATE OR REPLACE FUNCTION public.cleanup_subscription_conflicts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conflict_record RECORD;
BEGIN
  -- For each user/organization combo with multiple subscriptions, keep only the best one
  FOR conflict_record IN
    SELECT user_id, organization_id, COUNT(*) as sub_count
    FROM public.subscriptions
    WHERE status = 'active'
    GROUP BY user_id, organization_id
    HAVING COUNT(*) > 1
  LOOP
    -- Delete all but the most permissive subscription (enterprise > pro > basic > free)
    DELETE FROM public.subscriptions
    WHERE user_id = conflict_record.user_id
      AND (organization_id = conflict_record.organization_id OR (organization_id IS NULL AND conflict_record.organization_id IS NULL))
      AND status = 'active'
      AND id NOT IN (
        SELECT id FROM public.subscriptions
        WHERE user_id = conflict_record.user_id
          AND (organization_id = conflict_record.organization_id OR (organization_id IS NULL AND conflict_record.organization_id IS NULL))
          AND status = 'active'
        ORDER BY
          CASE plan_tier
            WHEN 'enterprise' THEN 4
            WHEN 'pro' THEN 3
            WHEN 'basic' THEN 2
            WHEN 'free' THEN 1
            ELSE 0
          END DESC,
          created_at DESC
        LIMIT 1
      );
      
    RAISE LOG 'Cleaned up subscription conflicts for user_id: %, organization_id: %', conflict_record.user_id, conflict_record.organization_id;
  END LOOP;
  
  -- Clear the subscription cache to force fresh reads
  DELETE FROM public.subscription_cache;
  
  RAISE LOG 'Subscription conflicts cleanup completed and cache cleared';
END;
$function$;

-- Update the check_feature_limit function to handle multiple subscriptions better
CREATE OR REPLACE FUNCTION public.check_feature_limit(p_user_id uuid, p_organization_id uuid, p_feature_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_plan TEXT;
  feature_limit INTEGER;
  current_usage INTEGER;
  subscription_count INTEGER;
BEGIN
  -- Count active subscriptions for debugging
  SELECT COUNT(*) INTO subscription_count
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND (organization_id = p_organization_id OR organization_id IS NULL)
    AND status = 'active';
    
  RAISE LOG 'check_feature_limit: user_id=%, org_id=%, feature=%, active_subs=%', p_user_id, p_organization_id, p_feature_name, subscription_count;

  -- Get the most permissive active subscription (enterprise > pro > basic > free)
  SELECT plan_tier INTO current_plan
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND (organization_id = p_organization_id OR organization_id IS NULL)
    AND status = 'active'
  ORDER BY
    CASE plan_tier
      WHEN 'enterprise' THEN 4
      WHEN 'pro' THEN 3
      WHEN 'basic' THEN 2
      WHEN 'free' THEN 1
      ELSE 0
    END DESC,
    created_at DESC
  LIMIT 1;
  
  -- Default to free if no subscription found
  IF current_plan IS NULL THEN
    current_plan := 'free';
  END IF;
  
  RAISE LOG 'check_feature_limit: selected plan_tier=% for user_id=%, org_id=%', current_plan, p_user_id, p_organization_id;
  
  -- Get feature limit for the selected plan
  SELECT limit_value INTO feature_limit
  FROM public.feature_gates
  WHERE feature_name = p_feature_name AND plan_tier = current_plan
  LIMIT 1;
  
  RAISE LOG 'check_feature_limit: feature_limit=% for feature=% on plan=%', feature_limit, p_feature_name, current_plan;
  
  -- If limit is NULL, feature is unlimited (enterprise/pro plans)
  IF feature_limit IS NULL THEN
    RAISE LOG 'check_feature_limit: UNLIMITED access granted for feature=% on plan=%', p_feature_name, current_plan;
    RETURN TRUE;
  END IF;
  
  -- If limit is 0, feature is disabled
  IF feature_limit = 0 THEN
    RAISE LOG 'check_feature_limit: DISABLED feature=% on plan=%', p_feature_name, current_plan;
    RETURN FALSE;
  END IF;
  
  -- Get current usage
  current_usage := public.get_real_usage_count(p_organization_id, p_feature_name);
  
  RAISE LOG 'check_feature_limit: current_usage=% vs limit=% for feature=%', current_usage, feature_limit, p_feature_name;
  
  -- Check if under limit
  IF current_usage < feature_limit THEN
    RAISE LOG 'check_feature_limit: ALLOWED (usage % < limit %) for feature=%', current_usage, feature_limit, p_feature_name;
    RETURN TRUE;
  ELSE
    RAISE LOG 'check_feature_limit: DENIED (usage % >= limit %) for feature=%', current_usage, feature_limit, p_feature_name;
    RETURN FALSE;
  END IF;
END;
$function$;

-- Run the cleanup function
SELECT public.cleanup_subscription_conflicts();