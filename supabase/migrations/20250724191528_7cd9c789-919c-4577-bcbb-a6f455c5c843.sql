-- Fix function search path security issues by setting search_path to 'public' for all functions
-- This prevents potential privilege escalation attacks

-- Update all existing functions to have secure search_path
ALTER FUNCTION public.is_admin() SET search_path TO 'public';
ALTER FUNCTION public.invalidate_subscription_cache(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.increment_usage(uuid, uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.invalidate_cache_on_subscription_change() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user_organization() SET search_path TO 'public';
ALTER FUNCTION public.user_is_organization_member(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.user_owns_organization(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.log_workspace_activity() SET search_path TO 'public';
ALTER FUNCTION public.log_member_join() SET search_path TO 'public';
ALTER FUNCTION public.notify_subscription_change() SET search_path TO 'public';
ALTER FUNCTION public.get_subscription_status(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.check_feature_limit(uuid, uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.get_real_usage_count(uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.get_user_workspace_data(uuid) SET search_path TO 'public';
ALTER FUNCTION public.clean_all_user_data() SET search_path TO 'public';
ALTER FUNCTION public.auto_grant_first_admin() SET search_path TO 'public';
ALTER FUNCTION public.grant_admin_access(uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path TO 'public';
ALTER FUNCTION public.setup_support_admin() SET search_path TO 'public';
ALTER FUNCTION public.auto_grant_support_admin() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';