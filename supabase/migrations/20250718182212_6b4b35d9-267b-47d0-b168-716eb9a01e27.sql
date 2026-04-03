-- Create validation task templates table
CREATE TABLE public.validation_task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'customer_discovery', 'market_research', 'technical_validation', 'financial_validation'
  estimated_duration TEXT, -- '1-2 hours', '3-5 days', etc.
  difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  instructions TEXT,
  expected_outcomes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add validation workflow columns to existing validation_tasks table
ALTER TABLE public.validation_tasks 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.validation_task_templates(id),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER,
ADD COLUMN IF NOT EXISTS actual_hours INTEGER,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP WITH TIME ZONE;

-- Create validation workflows table to track overall progress per opportunity
CREATE TABLE public.validation_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.business_opportunities(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'lean_startup', 'design_thinking'
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'paused'
  progress_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id)
);

-- Enable RLS on new tables
ALTER TABLE public.validation_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_workflows ENABLE ROW LEVEL SECURITY;

-- RLS policies for validation_task_templates (public read, admin write)
CREATE POLICY "Anyone can view validation task templates" 
ON public.validation_task_templates 
FOR SELECT 
USING (true);

-- RLS policies for validation_workflows
CREATE POLICY "Users can view their own validation workflows" 
ON public.validation_workflows 
FOR SELECT 
USING (auth.uid() = (
  SELECT user_id FROM public.business_opportunities 
  WHERE id = validation_workflows.opportunity_id
));

CREATE POLICY "Users can insert their own validation workflows" 
ON public.validation_workflows 
FOR INSERT 
WITH CHECK (auth.uid() = (
  SELECT user_id FROM public.business_opportunities 
  WHERE id = validation_workflows.opportunity_id
));

CREATE POLICY "Users can update their own validation workflows" 
ON public.validation_workflows 
FOR UPDATE 
USING (auth.uid() = (
  SELECT user_id FROM public.business_opportunities 
  WHERE id = validation_workflows.opportunity_id
));

-- Insert default validation task templates
INSERT INTO public.validation_task_templates (name, description, category, estimated_duration, difficulty_level, instructions, expected_outcomes) VALUES
('Customer Problem Interviews', 'Conduct interviews with potential customers to validate the problem exists', 'customer_discovery', '2-3 weeks', 'beginner', 'Interview 10-15 potential customers about their current pain points and how they currently solve the problem.', ARRAY['Problem validation', 'Customer insights', 'Pain point severity']),
('Competitor Analysis', 'Research and analyze direct and indirect competitors in your market', 'market_research', '1-2 weeks', 'beginner', 'Identify 5-10 competitors, analyze their solutions, pricing, and market positioning.', ARRAY['Competitive landscape', 'Market gaps', 'Differentiation opportunities']),
('Solution Validation Interviews', 'Test your proposed solution with potential customers', 'customer_discovery', '2-3 weeks', 'intermediate', 'Present your solution concept to previous interviewees and gather feedback on value proposition.', ARRAY['Solution-problem fit', 'Feature priorities', 'Willingness to pay']),
('Market Size Analysis', 'Calculate total addressable market and serviceable addressable market', 'market_research', '1 week', 'intermediate', 'Research market size using top-down and bottom-up approaches, validate with industry reports.', ARRAY['TAM/SAM calculations', 'Market growth trends', 'Revenue potential']),
('MVP Development', 'Build a minimum viable product to test core assumptions', 'technical_validation', '4-8 weeks', 'advanced', 'Develop the simplest version of your product that can validate core hypotheses.', ARRAY['Technical feasibility', 'User feedback', 'Core feature validation']),
('Pricing Research', 'Determine optimal pricing strategy through customer research', 'financial_validation', '1-2 weeks', 'intermediate', 'Test different pricing models with potential customers through surveys and interviews.', ARRAY['Price sensitivity', 'Value perception', 'Revenue model validation']);

-- Create trigger for updating timestamps
CREATE TRIGGER update_validation_task_templates_updated_at
BEFORE UPDATE ON public.validation_task_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_validation_workflows_updated_at
BEFORE UPDATE ON public.validation_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();