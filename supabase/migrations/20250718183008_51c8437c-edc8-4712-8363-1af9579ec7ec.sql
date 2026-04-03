-- Remove the old constraint and add a new one with the correct values
ALTER TABLE public.validation_tasks 
DROP CONSTRAINT IF EXISTS validation_tasks_task_type_check;

-- Add the updated constraint that matches our template categories
ALTER TABLE public.validation_tasks 
ADD CONSTRAINT validation_tasks_task_type_check 
CHECK (task_type IN (
  'customer_discovery', 
  'market_research', 
  'technical_validation', 
  'financial_validation',
  'customer_interviews',
  'competitor_analysis',
  'mvp_validation',
  'landing_page_test'
));