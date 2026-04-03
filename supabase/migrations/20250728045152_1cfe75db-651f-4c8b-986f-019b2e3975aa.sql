-- Manual deletion of three problematic accounts
-- User IDs to delete:
-- bgtebeje@gmail.com: d82dadce-bf1c-4b5e-b851-44e76d97c1e8
-- bestattiresblog@gmail.com: a39bce49-c496-4810-9ae0-c760e6495437
-- yoyowinenliquor@gmail.com: b84007b2-0bcc-4bc6-8796-3bb839d1beb6

DO $$
DECLARE
  target_users UUID[] := ARRAY[
    'd82dadce-bf1c-4b5e-b851-44e76d97c1e8',
    'a39bce49-c496-4810-9ae0-c760e6495437', 
    'b84007b2-0bcc-4bc6-8796-3bb839d1beb6'
  ];
  user_id UUID;
  user_orgs UUID[];
BEGIN
  FOREACH user_id IN ARRAY target_users
  LOOP
    RAISE LOG 'Deleting data for user: %', user_id;
    
    -- Get organizations owned by this user
    SELECT ARRAY(SELECT id FROM public.organizations WHERE owner_id = user_id) INTO user_orgs;
    
    -- 1. Delete validation tasks (references business_opportunities)
    DELETE FROM public.validation_tasks 
    WHERE opportunity_id IN (
      SELECT id FROM public.business_opportunities WHERE user_id = user_id
    );
    
    -- 2. Delete validation workflows (references business_opportunities)
    DELETE FROM public.validation_workflows 
    WHERE opportunity_id IN (
      SELECT id FROM public.business_opportunities WHERE user_id = user_id
    );
    
    -- 3. Delete automated market intelligence (references business_opportunities)
    DELETE FROM public.automated_market_intelligence 
    WHERE opportunity_id IN (
      SELECT id FROM public.business_opportunities WHERE user_id = user_id
    );
    
    -- 4. Delete business opportunities
    DELETE FROM public.business_opportunities WHERE user_id = user_id;
    DELETE FROM public.business_opportunities WHERE organization_id = ANY(user_orgs);
    
    -- 5. Delete workspace activities
    DELETE FROM public.workspace_activities WHERE user_id = user_id;
    DELETE FROM public.workspace_activities WHERE organization_id = ANY(user_orgs);
    
    -- 6. Delete usage tracking
    DELETE FROM public.usage_tracking WHERE user_id = user_id;
    DELETE FROM public.usage_tracking WHERE organization_id = ANY(user_orgs);
    
    -- 7. Delete organization members
    DELETE FROM public.organization_members WHERE user_id = user_id;
    DELETE FROM public.organization_members WHERE organization_id = ANY(user_orgs);
    
    -- 8. Delete organization invitations
    DELETE FROM public.organization_invitations WHERE invited_by = user_id;
    DELETE FROM public.organization_invitations WHERE organization_id = ANY(user_orgs);
    
    -- 9. Delete workspace invitations  
    DELETE FROM public.workspace_invitations WHERE invited_by = user_id;
    DELETE FROM public.workspace_invitations WHERE organization_id = ANY(user_orgs);
    
    -- 10. Delete enterprise settings
    DELETE FROM public.enterprise_settings WHERE organization_id = ANY(user_orgs);
    
    -- 11. Delete organizations owned by user
    DELETE FROM public.organizations WHERE owner_id = user_id;
    
    -- 12. Delete subscriptions
    DELETE FROM public.subscriptions WHERE user_id = user_id;
    
    -- 13. Delete user experiences, goals, skills
    DELETE FROM public.user_experiences WHERE user_id = user_id;
    DELETE FROM public.user_goals WHERE user_id = user_id;
    DELETE FROM public.user_skills WHERE user_id = user_id;
    
    -- 14. Delete data integration preferences
    DELETE FROM public.data_integration_preferences WHERE user_id = user_id;
    
    -- 15. Delete security events (this was causing the constraint issue)
    DELETE FROM public.security_events WHERE user_id = user_id;
    
    -- 16. Delete admin audit log entries
    DELETE FROM public.admin_audit_log WHERE admin_user_id = user_id;
    DELETE FROM public.admin_audit_log WHERE target_user_id = user_id;
    
    -- 17. Delete subscription cache
    DELETE FROM public.subscription_cache WHERE user_id = user_id;
    
    -- 18. Delete profile
    DELETE FROM public.profiles WHERE user_id = user_id;
    
    -- 19. Finally delete from auth.users
    DELETE FROM auth.users WHERE id = user_id;
    
    RAISE LOG 'Successfully deleted user: %', user_id;
  END LOOP;
  
  RAISE LOG 'Manual account deletion completed for all three users';
END $$;