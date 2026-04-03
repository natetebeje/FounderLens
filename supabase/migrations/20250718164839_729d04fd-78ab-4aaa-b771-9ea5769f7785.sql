-- Create business opportunities table
CREATE TABLE public.business_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  target_market TEXT NOT NULL,
  solution_approach TEXT,
  market_size_estimate TEXT,
  competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high')),
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  time_to_market TEXT,
  founder_fit_score INTEGER CHECK (founder_fit_score >= 1 AND founder_fit_score <= 100),
  opportunity_tags TEXT[] DEFAULT '{}',
  validation_status TEXT DEFAULT 'not_started' CHECK (validation_status IN ('not_started', 'in_progress', 'validated', 'rejected')),
  ai_confidence_score INTEGER CHECK (ai_confidence_score >= 1 AND ai_confidence_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_favorited BOOLEAN DEFAULT false
);

-- Create validation tasks table
CREATE TABLE public.validation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.business_opportunities(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('market_research', 'customer_interviews', 'competitor_analysis', 'mvp_validation', 'landing_page_test')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date DATE,
  results TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.business_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for business_opportunities
CREATE POLICY "Users can view their own opportunities" 
ON public.business_opportunities FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own opportunities" 
ON public.business_opportunities FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opportunities" 
ON public.business_opportunities FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own opportunities" 
ON public.business_opportunities FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for validation_tasks
CREATE POLICY "Users can view their own validation tasks" 
ON public.validation_tasks FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM public.business_opportunities WHERE id = opportunity_id));

CREATE POLICY "Users can insert their own validation tasks" 
ON public.validation_tasks FOR INSERT 
WITH CHECK (auth.uid() = (SELECT user_id FROM public.business_opportunities WHERE id = opportunity_id));

CREATE POLICY "Users can update their own validation tasks" 
ON public.validation_tasks FOR UPDATE 
USING (auth.uid() = (SELECT user_id FROM public.business_opportunities WHERE id = opportunity_id));

CREATE POLICY "Users can delete their own validation tasks" 
ON public.validation_tasks FOR DELETE 
USING (auth.uid() = (SELECT user_id FROM public.business_opportunities WHERE id = opportunity_id));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_business_opportunities_updated_at
  BEFORE UPDATE ON public.business_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_validation_tasks_updated_at
  BEFORE UPDATE ON public.validation_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();