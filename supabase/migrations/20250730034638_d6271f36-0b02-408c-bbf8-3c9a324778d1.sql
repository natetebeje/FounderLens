-- Create table for storing detailed Reddit discussions
CREATE TABLE public.reddit_discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL,
  organization_id UUID,
  post_id TEXT NOT NULL,
  title TEXT NOT NULL,
  selftext TEXT,
  url TEXT,
  author TEXT,
  subreddit TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  num_comments INTEGER DEFAULT 0,
  upvote_ratio NUMERIC,
  created_utc BIGINT,
  permalink TEXT,
  full_content JSONB DEFAULT '{}',
  top_comments JSONB DEFAULT '[]',
  engagement_metrics JSONB DEFAULT '{}',
  relevance_score INTEGER DEFAULT 0,
  pain_points_extracted JSONB DEFAULT '[]',
  solutions_mentioned JSONB DEFAULT '[]',
  is_marked_for_mvp BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for user-generated discussion summaries
CREATE TABLE public.discussion_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.reddit_discussions(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  organization_id UUID,
  summary_type TEXT NOT NULL DEFAULT 'general',
  ai_generated_summary TEXT,
  user_edited_summary TEXT,
  key_pain_points JSONB DEFAULT '[]',
  proposed_solutions JSONB DEFAULT '[]',
  market_signals JSONB DEFAULT '[]',
  user_demographics JSONB DEFAULT '{}',
  confidence_score INTEGER DEFAULT 0,
  is_relevant_for_mvp BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for MVP insights extracted from discussions
CREATE TABLE public.mvp_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL,
  organization_id UUID,
  source_discussion_id UUID REFERENCES public.reddit_discussions(id),
  source_summary_id UUID REFERENCES public.discussion_summaries(id),
  insight_type TEXT NOT NULL, -- 'feature_request', 'pain_point', 'competitor_analysis', 'pricing_insight'
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  supporting_evidence JSONB DEFAULT '{}',
  impact_score INTEGER DEFAULT 0,
  implementation_complexity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  user_validation_count INTEGER DEFAULT 0,
  is_included_in_mvp BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.reddit_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_insights ENABLE ROW LEVEL SECURITY;

-- Create policies for reddit_discussions
CREATE POLICY "Users can view discussions in their organizations" 
ON public.reddit_discussions 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_members.organization_id
  FROM organization_members
  WHERE organization_members.user_id = auth.uid()
));

CREATE POLICY "System can insert reddit discussions" 
ON public.reddit_discussions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update discussions in their organizations" 
ON public.reddit_discussions 
FOR UPDATE 
USING (organization_id IN (
  SELECT organization_members.organization_id
  FROM organization_members
  WHERE organization_members.user_id = auth.uid()
));

-- Create policies for discussion_summaries
CREATE POLICY "Users can view summaries in their organizations" 
ON public.discussion_summaries 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_members.organization_id
  FROM organization_members
  WHERE organization_members.user_id = auth.uid()
));

CREATE POLICY "Users can create summaries in their organizations" 
ON public.discussion_summaries 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  organization_id IN (
    SELECT organization_members.organization_id
    FROM organization_members
    WHERE organization_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own summaries" 
ON public.discussion_summaries 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for mvp_insights
CREATE POLICY "Users can view mvp insights in their organizations" 
ON public.mvp_insights 
FOR SELECT 
USING (organization_id IN (
  SELECT organization_members.organization_id
  FROM organization_members
  WHERE organization_members.user_id = auth.uid()
));

CREATE POLICY "System can insert mvp insights" 
ON public.mvp_insights 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update mvp insights in their organizations" 
ON public.mvp_insights 
FOR UPDATE 
USING (organization_id IN (
  SELECT organization_members.organization_id
  FROM organization_members
  WHERE organization_members.user_id = auth.uid()
));

-- Create indexes for better performance
CREATE INDEX idx_reddit_discussions_opportunity_id ON public.reddit_discussions(opportunity_id);
CREATE INDEX idx_reddit_discussions_organization_id ON public.reddit_discussions(organization_id);
CREATE INDEX idx_reddit_discussions_relevance_score ON public.reddit_discussions(relevance_score DESC);
CREATE INDEX idx_discussion_summaries_discussion_id ON public.discussion_summaries(discussion_id);
CREATE INDEX idx_mvp_insights_opportunity_id ON public.mvp_insights(opportunity_id);

-- Create trigger for updated_at
CREATE TRIGGER update_reddit_discussions_updated_at
BEFORE UPDATE ON public.reddit_discussions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discussion_summaries_updated_at
BEFORE UPDATE ON public.discussion_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mvp_insights_updated_at
BEFORE UPDATE ON public.mvp_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();