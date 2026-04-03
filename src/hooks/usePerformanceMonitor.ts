import { useCallback } from 'react';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export const usePerformanceMonitor = () => {
  const startTimer = useCallback((name: string) => {
    return performance.now();
  }, []);

  const endTimer = useCallback((name: string, startTime: number, metadata?: Record<string, any>) => {
    const duration = performance.now() - startTime;
    
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    };

    // Log performance metric
    console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`, metadata);

    // Store in session storage for debugging (last 100 entries)
    try {
      const existing = JSON.parse(sessionStorage.getItem('performance_metrics') || '[]');
      const updated = [...existing, metric].slice(-100);
      sessionStorage.setItem('performance_metrics', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to store performance metric:', error);
    }

    return duration;
  }, []);

  const measureAsync = useCallback(async <T>(
    name: string, 
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const start = startTimer(name);
    try {
      const result = await fn();
      endTimer(name, start, { ...metadata, success: true });
      return result;
    } catch (error) {
      endTimer(name, start, { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }, [startTimer, endTimer]);

  return {
    startTimer,
    endTimer,
    measureAsync
  };
};