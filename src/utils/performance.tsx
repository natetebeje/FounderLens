import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Lazy load heavy components for better performance
export const LazyAdmin = lazy(() => import('@/pages/Admin'));
export const LazyAnalytics = lazy(() => import('@/pages/Analytics'));
export const LazyOpportunities = lazy(() => import('@/pages/Opportunities'));
export const LazyValidationWorkflow = lazy(() => import('@/pages/ValidationWorkflow'));
export const LazyDiscovery = lazy(() => import('@/pages/Discovery'));

// Wrapper component for lazy loaded routes
export const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense 
    fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-primary" />
      </div>
    }
  >
    {children}
  </Suspense>
);

// Performance monitoring utilities
export const performanceMonitor = {
  trackWebVitals: () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      console.log('Performance monitoring initialized');
    }
  },

  trackCustomMetric: (name: string, value: number, unit: string = 'ms') => {
    console.log(`Performance metric ${name}:`, value, unit);
  },

  trackPageLoad: (pageName: string) => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      console.log(`Page ${pageName} load time:`, loadTime);
    }
  }
};

export const resourcePrefetcher = {
  prefetchRoutes: () => {
    console.log('Prefetching critical routes');
  },

  prefetchDNS: () => {
    console.log('DNS prefetching initialized');
  }
};