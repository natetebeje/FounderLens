
-- Add columns to validation_workflows for automated results
ALTER TABLE validation_workflows 
ADD COLUMN automated_validation_results JSONB DEFAULT '{}',
ADD COLUMN automated_score INTEGER DEFAULT 0,
ADD COLUMN automated_recommendation TEXT,
ADD COLUMN last_automated_validation TIMESTAMP WITH TIME ZONE;

-- Add columns to validation_tasks for automation status
ALTER TABLE validation_tasks 
ADD COLUMN is_automated BOOLEAN DEFAULT false,
ADD COLUMN automated_results JSONB DEFAULT '{}',
ADD COLUMN automation_status TEXT DEFAULT 'pending';

-- Create table for automated market intelligence
CREATE TABLE automated_market_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID REFERENCES business_opportunities NOT NULL,
  competitor_analysis JSONB DEFAULT '{}',
  market_sizing JSONB DEFAULT '{}',
  pricing_research JSONB DEFAULT '{}',
  trends_analysis JSONB DEFAULT '{}',
  confidence_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new table
ALTER TABLE automated_market_intelligence ENABLE ROW LEVEL SECURITY;

-- Create policies for automated_market_intelligence
CREATE POLICY "Users can view their own market intelligence" 
  ON automated_market_intelligence 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM business_opportunities 
      WHERE business_opportunities.id = automated_market_intelligence.opportunity_id 
      AND business_opportunities.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own market intelligence" 
  ON automated_market_intelligence 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_opportunities 
      WHERE business_opportunities.id = automated_market_intelligence.opportunity_id 
      AND business_opportunities.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own market intelligence" 
  ON automated_market_intelligence 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM business_opportunities 
      WHERE business_opportunities.id = automated_market_intelligence.opportunity_id 
      AND business_opportunities.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_automated_market_intelligence_updated_at
  BEFORE UPDATE ON automated_market_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
