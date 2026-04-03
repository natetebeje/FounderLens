-- Add reddit validation results column to validation_workflows table
ALTER TABLE public.validation_workflows 
ADD COLUMN reddit_validation_results JSONB DEFAULT '{}'::jsonb;