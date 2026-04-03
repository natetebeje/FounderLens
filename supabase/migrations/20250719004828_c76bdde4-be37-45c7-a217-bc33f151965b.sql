-- Add missing fields to user_goals table
ALTER TABLE public.user_goals ADD COLUMN current_role text;
ALTER TABLE public.user_goals ADD COLUMN industries text[];
ALTER TABLE public.user_goals ADD COLUMN risk_tolerance text;
ALTER TABLE public.user_goals ADD COLUMN primary_goal text;