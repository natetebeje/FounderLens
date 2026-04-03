-- Database Optimization Phase 3: Batch Operations and Cache Cleanup

-- Create optimized function for batch opportunity queries
CREATE OR REPLACE FUNCTION public.get_opportunities_batch(p_user_id uuid, p_organization_ids uuid[], p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  organization_id uuid,
  created_at timestamp with time zone,
  validation_status text,
  is_favorited boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    bo.id,
    bo.title,
    bo.description,
    bo.organization_id,
    bo.created_at,
    bo.validation_status,
    bo.is_favorited
  FROM public.business_opportunities bo
  WHERE bo.organization_id = ANY(p_organization_ids)
    AND EXISTS (
      SELECT 1 FROM public.organization_members om 
      WHERE om.organization_id = bo.organization_id 
      AND om.user_id = p_user_id
    )
  ORDER BY bo.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Create function to clean up expired cache entries (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Clean up expired subscription cache
  DELETE FROM public.subscription_cache
  WHERE expires_at < NOW() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up old market cache
  DELETE FROM public.market_cache
  WHERE expires_at < NOW();
  
  -- Clean up old reddit queries
  DELETE FROM public.reddit_queries
  WHERE expires_at < NOW() - INTERVAL '2 hours';
  
  RETURN deleted_count;
END;
$function$;