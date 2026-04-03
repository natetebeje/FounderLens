-- Fix the function search path issue by updating the function
CREATE OR REPLACE FUNCTION public.clean_all_user_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_counts json;
  user_count integer;
BEGIN
  -- Check if the caller is an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Start the cleanup process
  RAISE LOG 'Starting complete user data cleanup...';

  -- Delete in order to avoid foreign key violations
  
  -- 1. Delete validation tasks first (references business_opportunities)
  DELETE FROM public.validation_tasks;
  
  -- 2. Delete validation workflows (references business_opportunities)  
  DELETE FROM public.validation_workflows;
  
  -- 3. Delete automated market intelligence (references business_opportunities)
  DELETE FROM public.automated_market_intelligence;
  
  -- 4. Delete business opportunities
  DELETE FROM public.business_opportunities;
  
  -- 5. Delete workspace activities
  DELETE FROM public.workspace_activities;
  
  -- 6. Delete workspace invitations
  DELETE FROM public.workspace_invitations;
  
  -- 7. Delete organization invitations
  DELETE FROM public.organization_invitations;
  
  -- 8. Delete organization members
  DELETE FROM public.organization_members;
  
  -- 9. Delete usage tracking
  DELETE FROM public.usage_tracking;
  
  -- 10. Delete user experiences
  DELETE FROM public.user_experiences;
  
  -- 11. Delete user goals
  DELETE FROM public.user_goals;
  
  -- 12. Delete user skills
  DELETE FROM public.user_skills;
  
  -- 13. Delete data integration preferences
  DELETE FROM public.data_integration_preferences;
  
  -- 14. Delete subscriptions
  DELETE FROM public.subscriptions;
  
  -- 15. Delete subscription cache
  DELETE FROM public.subscription_cache;
  
  -- 16. Delete enterprise settings
  DELETE FROM public.enterprise_settings;
  
  -- 17. Delete organizations
  DELETE FROM public.organizations;
  
  -- 18. Delete admin audit logs (this was causing the constraint issue)
  DELETE FROM public.admin_audit_log;
  
  -- 19. Delete security events
  DELETE FROM public.security_events;
  
  -- 20. Delete profiles
  DELETE FROM public.profiles;
  
  -- 21. Count users before deletion
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- 22. Delete all users from auth (this will cascade to any remaining references)
  DELETE FROM auth.users;
  
  -- 23. Clear any remaining caches
  DELETE FROM public.market_cache;
  DELETE FROM public.reddit_queries;
  DELETE FROM public.subreddit_insights;
  DELETE FROM public.performance_metrics;
  DELETE FROM public.email_notifications;
  DELETE FROM public.system_announcements;
  
  RAISE LOG 'User data cleanup completed. Deleted % users and all associated data.', user_count;
  
  -- Return summary
  deleted_counts := json_build_object(
    'message', 'All user data cleaned successfully',
    'users_deleted', user_count,
    'timestamp', now()
  );
  
  RETURN deleted_counts;
  
EXCEPTION 
  WHEN OTHERS THEN
    RAISE LOG 'Error during cleanup: %', SQLERRM;
    RAISE EXCEPTION 'Cleanup failed: %', SQLERRM;
END;
$$;