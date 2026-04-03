-- Add missing fields to user_goals table
ALTER TABLE public.user_goals 
ADD COLUMN current_role text,
ADD COLUMN industries text[],
ADD COLUMN risk_tolerance text,
ADD COLUMN primary_goal text;