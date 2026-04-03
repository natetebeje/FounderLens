-- Create Browse.ai integration tables
CREATE TABLE public.scraped_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'competitor', 'market_research', 'customer_feedback'
  data_type TEXT NOT NULL, -- 'pricing', 'features', 'reviews', 'news'
  content JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  opportunity_id UUID,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.monitoring_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  target_urls TEXT[] NOT NULL,
  job_type TEXT NOT NULL, -- 'competitor_tracking', 'market_trends', 'customer_feedback'
  schedule_frequency TEXT NOT NULL DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  browse_ai_robot_id TEXT,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'stopped'
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.market_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID,
  intelligence_type TEXT NOT NULL, -- 'competitor_analysis', 'market_trends', 'customer_insights'
  source_platform TEXT NOT NULL, -- 'browse_ai', 'reddit', 'linkedin', 'news'
  confidence_score INTEGER DEFAULT 0,
  key_insights JSONB DEFAULT '{}',
  competitive_data JSONB DEFAULT '{}',
  market_trends JSONB DEFAULT '{}',
  customer_feedback JSONB DEFAULT '{}',
  validation_impact INTEGER DEFAULT 0, -- How much this impacts validation score
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scraped_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;

-- Create policies for scraped_data
CREATE POLICY "Users can view scraped data in their organizations"
ON public.scraped_data FOR SELECT
USING (organization_id IN (
  SELECT organization_members.organization_id 
  FROM organization_members 
  WHERE organization_members.user_id = auth.uid()
));

CREATE POLICY "System can insert scraped data"
ON public.scraped_data FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update scraped data in their organizations"
ON public.scraped_data FOR UPDATE
USING (organization_id IN (
  SELECT organization_members.organization_id 
  FROM organization_members 
  WHERE organization_members.user_id = auth.uid()
));

-- Create policies for monitoring_jobs
CREATE POLICY "Users can manage monitoring jobs in their organizations"
ON public.monitoring_jobs FOR ALL
USING (organization_id IN (
  SELECT organization_members.organization_id 
  FROM organization_members 
  WHERE organization_members.user_id = auth.uid()
));

-- Create policies for market_intelligence
CREATE POLICY "Users can view market intelligence in their organizations"
ON public.market_intelligence FOR SELECT
USING (organization_id IN (
  SELECT organization_members.organization_id 
  FROM organization_members 
  WHERE organization_members.user_id = auth.uid()
));

CREATE POLICY "System can insert market intelligence"
ON public.market_intelligence FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update market intelligence in their organizations"
ON public.market_intelligence FOR UPDATE
USING (organization_id IN (
  SELECT organization_members.organization_id 
  FROM organization_members 
  WHERE organization_members.user_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_scraped_data_organization_id ON public.scraped_data(organization_id);
CREATE INDEX idx_scraped_data_opportunity_id ON public.scraped_data(opportunity_id);
CREATE INDEX idx_scraped_data_source_type ON public.scraped_data(source_type);
CREATE INDEX idx_monitoring_jobs_organization_id ON public.monitoring_jobs(organization_id);
CREATE INDEX idx_monitoring_jobs_next_run_at ON public.monitoring_jobs(next_run_at);
CREATE INDEX idx_market_intelligence_opportunity_id ON public.market_intelligence(opportunity_id);
CREATE INDEX idx_market_intelligence_organization_id ON public.market_intelligence(organization_id);

-- Create trigger for updated_at
CREATE TRIGGER update_scraped_data_updated_at
  BEFORE UPDATE ON public.scraped_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monitoring_jobs_updated_at
  BEFORE UPDATE ON public.monitoring_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_intelligence_updated_at
  BEFORE UPDATE ON public.market_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();