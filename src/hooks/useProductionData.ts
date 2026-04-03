import { useState, useEffect, useCallback, useRef } from 'react';
import { mockDataGenerator } from '@/utils/mockDataGenerator';

interface UseProductionDataOptions {
  enabled?: boolean;
  refetchInterval?: number;
  retryCount?: number;
  retryDelay?: number;
  cacheTime?: number;
  staleTime?: number;
  fallbackData?: any;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

interface DataState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isStale: boolean;
  isFetching: boolean;
  retryCount: number;
  lastFetchTime: number | null;
}

type FetcherFunction<T> = () => Promise<T>;

export function useProductionData<T>(
  key: string,
  fetcher: FetcherFunction<T>,
  options: UseProductionDataOptions = {}
): DataState<T> & {
  refetch: () => Promise<void>;
  invalidate: () => void;
  mutate: (data: T) => void;
} {
  const {
    enabled = true,
    refetchInterval,
    retryCount: maxRetries = 3,
    retryDelay = 1000,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 1 * 60 * 1000, // 1 minute
    fallbackData,
    onError,
    onSuccess
  } = options;

  const [state, setState] = useState<DataState<T>>({
    data: fallbackData || null,
    isLoading: enabled,
    isError: false,
    error: null,
    isStale: false,
    isFetching: false,
    retryCount: 0,
    lastFetchTime: null
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Cache management
  const getCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(`data-cache-${key}`);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const isExpired = Date.now() - parsed.timestamp > cacheTime;
      
      if (isExpired) {
        localStorage.removeItem(`data-cache-${key}`);
        return null;
      }

      return parsed.data;
    } catch {
      return null;
    }
  }, [key, cacheTime]);

  const setCachedData = useCallback((data: T) => {
    try {
      localStorage.setItem(`data-cache-${key}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }, [key]);

  const fetchData = useCallback(async (isRetry = false, currentRetryCount = 0) => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isFetching: true,
      isError: false,
      error: null,
      retryCount: currentRetryCount
    }));

    try {
      // Check cache first
      const cachedData = getCachedData();
      if (cachedData && !isRetry) {
        const isStale = Date.now() - (state.lastFetchTime || 0) > staleTime;
        setState(prev => ({
          ...prev,
          data: cachedData,
          isLoading: false,
          isFetching: false,
          isStale,
          lastFetchTime: Date.now()
        }));

        if (!isStale) {
          return;
        }
      }

      // Add simulated delay in development
      if (import.meta.env.DEV) {
        await new Promise(resolve => 
          setTimeout(resolve, mockDataGenerator.getLoadingDelay())
        );
      }

      const data = await fetcher();

      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        isStale: false,
        retryCount: 0,
        lastFetchTime: Date.now()
      }));

      setCachedData(data);
      onSuccess?.(data);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }

      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      
      if (currentRetryCount < maxRetries) {
        // Schedule retry with exponential backoff
        const delay = retryDelay * Math.pow(2, currentRetryCount);
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(true, currentRetryCount + 1);
        }, delay);
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isError: true,
          error: errorObj,
          isFetching: false,
          retryCount: currentRetryCount
        }));

        onError?.(errorObj);
      }
    }
  }, [enabled, fetcher, getCachedData, setCachedData, maxRetries, retryDelay, staleTime, onError, onSuccess]);

  const refetch = useCallback(async () => {
    await fetchData(true, 0);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    localStorage.removeItem(`data-cache-${key}`);
    setState(prev => ({ ...prev, isStale: true }));
  }, [key]);

  const mutate = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      isStale: false,
      lastFetchTime: Date.now()
    }));
    setCachedData(data);
  }, [setCachedData]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, key]); // Re-fetch when key changes

  // Polling
  useEffect(() => {
    if (refetchInterval && enabled && !state.isError) {
      intervalRef.current = setInterval(() => {
        fetchData(true, 0);
      }, refetchInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refetchInterval, enabled, state.isError, fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    refetch,
    invalidate,
    mutate
  };
}