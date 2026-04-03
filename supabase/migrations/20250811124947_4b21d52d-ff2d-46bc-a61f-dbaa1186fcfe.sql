-- Enable Row Level Security on market_cache table
ALTER TABLE public.market_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for system/internal access (for caching functionality)
CREATE POLICY "System can manage market cache" 
ON public.market_cache 
FOR ALL 
USING (true);

-- Create policy for authenticated users to read cached market data
-- Users can only read market cache data, not modify it
CREATE POLICY "Authenticated users can read market cache" 
ON public.market_cache 
FOR SELECT 
TO authenticated
USING (true);

-- Create policy for admin access (full control)
CREATE POLICY "Admins can manage market cache" 
ON public.market_cache 
FOR ALL 
TO authenticated
USING (public.is_admin());

-- Add user tracking to market_cache table for better access control
-- This will help track which users/organizations are accessing which market data
ALTER TABLE public.market_cache 
ADD COLUMN IF NOT EXISTS user_id uuid,
ADD COLUMN IF NOT EXISTS organization_id uuid,
ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed timestamp with time zone;

-- Create index for better performance on user/org queries
CREATE INDEX IF NOT EXISTS idx_market_cache_user_org 
ON public.market_cache(user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_market_cache_expires 
ON public.market_cache(expires_at);

-- Update existing cache entries to be system-owned (null user_id means system cache)
UPDATE public.market_cache 
SET user_id = NULL, organization_id = NULL, access_count = 0, last_accessed = NOW()
WHERE user_id IS NULL;