-- Fix the foreign key constraint issue first
ALTER TABLE admin_audit_log 
DROP CONSTRAINT IF EXISTS admin_audit_log_admin_user_id_fkey;

-- Add the constraint back with CASCADE delete
ALTER TABLE admin_audit_log 
ADD CONSTRAINT admin_audit_log_admin_user_id_fkey 
FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a function to clean all user data (admin only)
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
  DELETE FROM validation_tasks;
  
  -- 2. Delete validation workflows (references business_opportunities)  
  DELETE FROM validation_workflows;
  
  -- 3. Delete automated market intelligence (references business_opportunities)
  DELETE FROM automated_market_intelligence;
  
  -- 4. Delete business opportunities
  DELETE FROM business_opportunities;
  
  -- 5. Delete workspace activities
  DELETE FROM workspace_activities;
  
  -- 6. Delete workspace invitations
  DELETE FROM workspace_invitations;
  
  -- 7. Delete organization invitations
  DELETE FROM organization_invitations;
  
  -- 8. Delete organization members
  DELETE FROM organization_members;
  
  -- 9. Delete usage tracking
  DELETE FROM usage_tracking;
  
  -- 10. Delete user experiences
  DELETE FROM user_experiences;
  
  -- 11. Delete user goals
  DELETE FROM user_goals;
  
  -- 12. Delete user skills
  DELETE FROM user_skills;
  
  -- 13. Delete data integration preferences
  DELETE FROM data_integration_preferences;
  
  -- 14. Delete subscriptions
  DELETE FROM subscriptions;
  
  -- 15. Delete subscription cache
  DELETE FROM subscription_cache;
  
  -- 16. Delete enterprise settings
  DELETE FROM enterprise_settings;
  
  -- 17. Delete organizations
  DELETE FROM organizations;
  
  -- 18. Delete admin audit logs (this was causing the constraint issue)
  DELETE FROM admin_audit_log;
  
  -- 19. Delete security events
  DELETE FROM security_events;
  
  -- 20. Delete profiles
  DELETE FROM profiles;
  
  -- 21. Count users before deletion
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- 22. Delete all users from auth (this will cascade to any remaining references)
  DELETE FROM auth.users;
  
  -- 23. Clear any remaining caches
  DELETE FROM market_cache;
  DELETE FROM reddit_queries;
  DELETE FROM subreddit_insights;
  DELETE FROM performance_metrics;
  DELETE FROM email_notifications;
  DELETE FROM system_announcements;
  
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