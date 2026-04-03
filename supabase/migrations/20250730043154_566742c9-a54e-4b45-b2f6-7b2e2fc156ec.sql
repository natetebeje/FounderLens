-- Fix the search path for the debug function
CREATE OR REPLACE FUNCTION public.debug_reddit_discussions_access(p_opportunity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  user_orgs uuid[];
  discussion_orgs uuid[];
  auth_user_id uuid;
BEGIN
  auth_user_id := auth.uid();
  
  -- Get user's organizations
  SELECT array_agg(organization_id) INTO user_orgs
  FROM public.organization_members 
  WHERE user_id = auth_user_id;
  
  -- Get organization_ids from reddit discussions for this opportunity
  SELECT array_agg(DISTINCT organization_id) INTO discussion_orgs
  FROM public.reddit_discussions 
  WHERE opportunity_id = p_opportunity_id;
  
  result := jsonb_build_object(
    'auth_uid', auth_user_id,
    'user_organizations', user_orgs,
    'discussion_organizations', discussion_orgs,
    'opportunity_id', p_opportunity_id,
    'discussion_count', (
      SELECT COUNT(*) 
      FROM public.reddit_discussions 
      WHERE opportunity_id = p_opportunity_id
    )
  );
  
  RETURN result;
END;
$$;