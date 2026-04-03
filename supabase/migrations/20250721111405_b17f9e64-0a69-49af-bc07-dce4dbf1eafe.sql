
-- Add reddit_analysis column to business_opportunities if it doesn't exist
ALTER TABLE business_opportunities 
ADD COLUMN IF NOT EXISTS reddit_analysis JSONB DEFAULT '{}'::jsonb;

-- Create table to cache Reddit queries and results
CREATE TABLE IF NOT EXISTS reddit_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,
  market_keywords TEXT NOT NULL,
  subreddits TEXT[] NOT NULL,
  search_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 hour')
);

-- Create table for subreddit insights and metrics
CREATE TABLE IF NOT EXISTS subreddit_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit_name TEXT NOT NULL,
  subscriber_count INTEGER,
  activity_level TEXT,
  relevance_score INTEGER,
  last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(subreddit_name)
);

-- Enable RLS on new tables
ALTER TABLE reddit_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subreddit_insights ENABLE ROW LEVEL SECURITY;

-- Create policies for reddit_queries (public read for caching)
CREATE POLICY "Anyone can read reddit queries for caching" 
  ON reddit_queries FOR SELECT 
  USING (true);

CREATE POLICY "System can insert reddit queries" 
  ON reddit_queries FOR INSERT 
  WITH CHECK (true);

-- Create policies for subreddit_insights (public read)
CREATE POLICY "Anyone can read subreddit insights" 
  ON subreddit_insights FOR SELECT 
  USING (true);

CREATE POLICY "System can manage subreddit insights" 
  ON subreddit_insights FOR ALL 
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reddit_queries_hash ON reddit_queries(query_hash);
CREATE INDEX IF NOT EXISTS idx_reddit_queries_expires ON reddit_queries(expires_at);
CREATE INDEX IF NOT EXISTS idx_subreddit_insights_name ON subreddit_insights(subreddit_name);
