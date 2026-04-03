import { useState, useCallback } from 'react';

interface SubscriptionData {
  subscribed: boolean;
  plan_tier: string;
  subscription_end?: string;
  status: string;
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for subscription data
const CACHE_KEY = 'subscription_cache';

export const useSubscriptionCache = () => {
  const [cache, setCache] = useState<SubscriptionData | null>(null);

  const getCachedSubscription = useCallback((orgId: string): SubscriptionData | null => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${orgId}`);
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      // Check if cache has expired
      if (Date.now() > data.expiresAt) {
        localStorage.removeItem(`${CACHE_KEY}_${orgId}`);
        return null;
      }

      setCache(data);
      return data;
    } catch (error) {
      console.error('Error reading subscription cache:', error);
      return null;
    }
  }, []);

  const setCachedSubscription = useCallback((orgId: string, subscriptionData: Omit<SubscriptionData, 'timestamp' | 'expiresAt'>) => {
    try {
      const data: SubscriptionData = {
        ...subscriptionData,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      };

      localStorage.setItem(`${CACHE_KEY}_${orgId}`, JSON.stringify(data));
      setCache(data);
    } catch (error) {
      console.error('Error setting subscription cache:', error);
    }
  }, []);

  const clearSubscriptionCache = useCallback((orgId?: string) => {
    if (orgId) {
      localStorage.removeItem(`${CACHE_KEY}_${orgId}`);
    } else {
      // Clear all subscription caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
    setCache(null);
  }, []);

  return {
    getCachedSubscription,
    setCachedSubscription,
    clearSubscriptionCache,
    cache
  };
};