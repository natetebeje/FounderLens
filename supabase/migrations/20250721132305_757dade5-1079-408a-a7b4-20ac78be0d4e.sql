
-- Create the market_cache table that the market-intelligence function expects
CREATE TABLE IF NOT EXISTS public.market_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  cached_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_market_cache_key ON public.market_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_market_cache_expires ON public.market_cache(expires_at);

-- Enable RLS
ALTER TABLE public.market_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cache data (it's market data, not user-specific)
CREATE POLICY "Anyone can read market cache data" 
  ON public.market_cache 
  FOR SELECT 
  USING (true);

-- Allow system to manage cache data
CREATE POLICY "System can manage market cache data" 
  ON public.market_cache 
  FOR ALL 
  USING (true);

-- Add trigger to update updated_at column
CREATE OR REPLACE TRIGGER update_market_cache_updated_at
  BEFORE UPDATE ON public.market_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
