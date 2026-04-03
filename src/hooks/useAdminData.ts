
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseAdminDataOptions {
  refetchInterval?: number;
  retryAttempts?: number;
  cacheKey?: string;
  onError?: (error: Error) => void;
  timeout?: number;
}

interface AdminDataState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastFetch: Date | null;
}

export function useAdminData<T>(
  fetcher: () => Promise<T>,
  options: UseAdminDataOptions = {}
) {
  const {
    refetchInterval = 30000, // 30 seconds
    retryAttempts = 3,
    cacheKey,
    onError,
    timeout = 8000 // 8 second default timeout
  } = options;
  
  const { toast } = useToast();
  const fetcherRef = useRef(fetcher);
  
  // Update the fetcher ref when it changes
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);
  
  const [state, setState] = useState<AdminDataState<T>>({
    data: null,
    loading: true,
    error: null,
    lastFetch: null
  });

  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!isRetry) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }

    try {
      // Check cache first if cache key is provided
      if (cacheKey && !isRetry) {
        const cached = getCachedData<T>(cacheKey);
        if (cached && isCacheValid(cached.timestamp, refetchInterval)) {
          setState({
            data: cached.data,
            loading: false,
            error: null,
            lastFetch: cached.timestamp
          });
          return;
        }
      }

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), timeout);
      });

      // Race between the fetcher and the timeout
      const data = await Promise.race([
        fetcherRef.current(),
        timeoutPromise
      ]);
      
      // Cache the data if cache key is provided
      if (cacheKey) {
        setCachedData(cacheKey, data);
      }

      setState({
        data,
        loading: false,
        error: null,
        lastFetch: new Date()
      });
      
      setRetryCount(0);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('Admin data fetch error:', err);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: err
      }));

      // Retry logic
      if (retryCount < retryAttempts) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchData(true);
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      } else {
        // Show error toast after all retries failed
        toast({
          title: "Data Loading Error",
          description: err.message,
          variant: "destructive"
        });
        
        if (onError) {
          onError(err);
        }
      }
    }
  }, [cacheKey, refetchInterval, retryAttempts, retryCount, toast, onError, timeout]);

  const refetch = useCallback(() => {
    setRetryCount(0);
    fetchData();
  }, [fetchData]);

  const clearCache = useCallback(() => {
    if (cacheKey) {
      localStorage.removeItem(`admin_cache_${cacheKey}`);
    }
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, []); // Empty dependency array - fetchData is stable with useRef

  // Set up automatic refetch interval
  useEffect(() => {
    if (refetchInterval > 0) {
      const interval = setInterval(() => {
        if (!state.loading) {
          fetchData();
        }
      }, refetchInterval);

      return () => clearInterval(interval);
    }
  }, [refetchInterval, state.loading]); // Removed fetchData dependency

  return {
    ...state,
    refetch,
    clearCache,
    isStale: state.lastFetch ? Date.now() - state.lastFetch.getTime() > refetchInterval : true
  };
}

// Cache utilities
function getCachedData<T>(key: string): { data: T; timestamp: Date } | null {
  try {
    const cached = localStorage.getItem(`admin_cache_${key}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        data: parsed.data,
        timestamp: new Date(parsed.timestamp)
      };
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`admin_cache_${key}`, JSON.stringify({
      data,
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

function isCacheValid(timestamp: Date, maxAge: number): boolean {
  return Date.now() - timestamp.getTime() < maxAge;
}
