-- First, remove all existing policies on market_cache
DROP POLICY IF EXISTS "Anyone can read market cache data" ON public.market_cache;
DROP POLICY IF EXISTS "System can manage market cache" ON public.market_cache;
DROP POLICY IF EXISTS "System can manage market cache data" ON public.market_cache;
DROP POLICY IF EXISTS "Authenticated users can read market cache" ON public.market_cache;
DROP POLICY IF EXISTS "Admins can manage market cache" ON public.market_cache;

-- Create secure, targeted policies
-- Policy 1: System role can manage cache (for edge functions)
CREATE POLICY "Service role can manage market cache" 
ON public.market_cache 
FOR ALL 
TO service_role
USING (true);

-- Policy 2: Authenticated users can only read cached data (not modify)
CREATE POLICY "Authenticated users can read market cache" 
ON public.market_cache 
FOR SELECT 
TO authenticated
USING (true);

-- Policy 3: Admins can manage all cache data
CREATE POLICY "Admins can manage market cache" 
ON public.market_cache 
FOR ALL 
TO authenticated
USING (public.is_admin());

-- No public access - all unauthenticated requests will be denied