import { useState, useCallback } from 'react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface CachedWorkspaceData {
  organization: Organization;
  userRole: string;
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'workspace_cache';

export const useWorkspaceCache = () => {
  const [cache, setCache] = useState<CachedWorkspaceData | null>(null);

  const getCachedWorkspace = useCallback((userId: string): CachedWorkspaceData | null => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${userId}`);
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      // Check if cache has expired
      if (Date.now() > data.expiresAt) {
        localStorage.removeItem(`${CACHE_KEY}_${userId}`);
        return null;
      }

      setCache(data);
      return data;
    } catch (error) {
      console.error('Error reading workspace cache:', error);
      return null;
    }
  }, []);

  const setCachedWorkspace = useCallback((userId: string, organization: Organization, userRole: string) => {
    try {
      const data: CachedWorkspaceData = {
        organization,
        userRole,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      };

      localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(data));
      setCache(data);
    } catch (error) {
      console.error('Error setting workspace cache:', error);
    }
  }, []);

  const clearCache = useCallback((userId?: string) => {
    if (userId) {
      localStorage.removeItem(`${CACHE_KEY}_${userId}`);
    } else {
      // Clear all workspace caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
    setCache(null);
  }, []);

  return {
    getCachedWorkspace,
    setCachedWorkspace,
    clearCache,
    cache
  };
};