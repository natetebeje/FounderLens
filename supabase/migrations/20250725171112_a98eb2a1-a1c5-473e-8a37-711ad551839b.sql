-- Fix the function search path security issue
ALTER FUNCTION public.update_zapier_webhook_updated_at() SET search_path = 'public';