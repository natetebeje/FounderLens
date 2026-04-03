-- Add unique constraint to reddit_discussions table to enable upsert operations
ALTER TABLE public.reddit_discussions 
ADD CONSTRAINT reddit_discussions_post_opportunity_unique 
UNIQUE (post_id, opportunity_id);

-- Add index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_reddit_discussions_opportunity_id 
ON public.reddit_discussions (opportunity_id);

-- Add index for better performance on queries by subreddit
CREATE INDEX IF NOT EXISTS idx_reddit_discussions_subreddit 
ON public.reddit_discussions (subreddit);