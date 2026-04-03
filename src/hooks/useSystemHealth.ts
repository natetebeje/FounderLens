import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'down';
  response_time: number;
  timestamp: string;
  details: {
    database: 'healthy' | 'error';
    auth: 'healthy' | 'error';
    edge_functions: 'healthy' | 'error';
    external_apis: 'healthy' | 'error';
  };
}

interface SystemMetrics {
  uptime: number;
  error_rate: number;
  avg_response_time: number;
  active_users: number;
  last_updated: string;
}

export const useSystemHealth = () => {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSystemHealth = async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    try {
      // Test database connectivity
      const dbTest = supabase.from('profiles').select('id').limit(1);
      
      // Test auth service
      const authTest = supabase.auth.getSession();
      
      // Test edge functions (non-critical)
      const edgeFunctionTest = supabase.functions.invoke('contact-form-submit', {
        body: { test: true }
      }).catch(() => ({ error: 'edge_function_unavailable' }));

      const [dbResult, authResult, edgeResult] = await Promise.allSettled([
        dbTest,
        authTest,
        edgeFunctionTest
      ]);

      const response_time = Date.now() - startTime;

      const details = {
        database: dbResult.status === 'fulfilled' ? 'healthy' as const : 'error' as const,
        auth: authResult.status === 'fulfilled' ? 'healthy' as const : 'error' as const,
        edge_functions: edgeResult.status === 'fulfilled' ? 'healthy' as const : 'error' as const,
        external_apis: 'healthy' as const // Placeholder for external API checks
      };

      // Determine overall status
      const criticalServices = [details.database, details.auth];
      const hasErrors = criticalServices.some(service => service === 'error');
      const hasWarnings = details.edge_functions === 'error';

      let status: 'healthy' | 'degraded' | 'down';
      if (hasErrors) {
        status = 'down';
      } else if (hasWarnings || response_time > 5000) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }

      return {
        status,
        response_time,
        timestamp,
        details
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'down',
        response_time: Date.now() - startTime,
        timestamp,
        details: {
          database: 'error',
          auth: 'error',
          edge_functions: 'error',
          external_apis: 'error'
        }
      };
    }
  };

  useEffect(() => {
    const runHealthCheck = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await checkSystemHealth();
        setHealthStatus(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Health check failed');
      } finally {
        setIsLoading(false);
      }
    };

    runHealthCheck();

    // Run health check every 5 minutes
    const interval = setInterval(runHealthCheck, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    healthStatus,
    isLoading,
    error,
    refreshHealthCheck: () => checkSystemHealth().then(setHealthStatus)
  };
};

export const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        // In production, this would fetch real metrics from monitoring service
        // For now, we'll simulate metrics
        const mockMetrics: SystemMetrics = {
          uptime: 99.9,
          error_rate: 0.1,
          avg_response_time: 285,
          active_users: 1247,
          last_updated: new Date().toISOString()
        };

        setTimeout(() => {
          setMetrics(mockMetrics);
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to load system metrics:', error);
        setIsLoading(false);
      }
    };

    loadMetrics();

    // Refresh metrics every minute
    const interval = setInterval(loadMetrics, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { metrics, isLoading };
};

// Alert system for critical issues
export const alertManager = {
  // Send critical alerts (in production, integrate with PagerDuty, Slack, etc.)
  sendAlert: async (level: 'info' | 'warning' | 'critical', message: string, details?: any) => {
    console.log(`[${level.toUpperCase()}] ALERT:`, message, details);
    
    // In production, integrate with external alerting services
    if (level === 'critical') {
      // Send to PagerDuty, Slack, email, etc.
      try {
        await supabase.functions.invoke('send-alert', {
          body: {
            level,
            message,
            details,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Failed to send alert:', error);
      }
    }
  },

  // Monitor and alert on key metrics
  monitorMetrics: (metrics: SystemMetrics) => {
    if (metrics.uptime < 99.0) {
      alertManager.sendAlert('critical', 'System uptime below 99%', { uptime: metrics.uptime });
    }
    
    if (metrics.error_rate > 5.0) {
      alertManager.sendAlert('warning', 'Error rate above 5%', { error_rate: metrics.error_rate });
    }
    
    if (metrics.avg_response_time > 2000) {
      alertManager.sendAlert('warning', 'Average response time above 2s', { 
        avg_response_time: metrics.avg_response_time 
      });
    }
  }
};