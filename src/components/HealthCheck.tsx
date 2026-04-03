import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface HealthStatus {
  database: boolean;
  auth: boolean;
  functions: boolean;
  lastCheck: Date;
}

export const HealthCheck = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    
    try {
      const healthResults: HealthStatus = {
        database: false,
        auth: false,
        functions: false,
        lastCheck: new Date()
      };

      // Check database connectivity
      try {
        const { error: dbError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        healthResults.database = !dbError;
      } catch (error) {
        logger.error('Health check - Database failed:', error);
      }

      // Check auth system
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        healthResults.auth = !authError;
      } catch (error) {
        logger.error('Health check - Auth failed:', error);
      }

      // Check edge functions (lightweight ping)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/api/health', {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        healthResults.functions = response.ok;
      } catch (error) {
        logger.error('Health check - Functions failed:', error);
      }

      setHealth(healthResults);
      
      // Log overall health status
      const overallHealth = Object.values(healthResults).every(Boolean);
      logger.info('Health check completed:', { ...healthResults, overall: overallHealth });
      
    } catch (error) {
      logger.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial health check
    checkHealth();
    
    // Check health every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Only show health status in development or when there are issues
  if (process.env.NODE_ENV === 'production' && health && 
      health.database && health.auth && health.functions) {
    return null;
  }

  if (!health && !isChecking) {
    return null;
  }

  const hasIssues = health && (!health.database || !health.auth || !health.functions);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Alert variant={hasIssues ? "destructive" : "default"} className="w-80">
        <div className="flex items-center gap-2">
          {isChecking ? (
            <Clock className="h-4 w-4 animate-spin" />
          ) : hasIssues ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          
          <div className="flex-1">
            <AlertDescription>
              <div className="font-medium mb-1">
                {isChecking ? 'Checking system health...' : 'System Status'}
              </div>
              
              {health && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Database:</span>
                    <span className={health.database ? 'text-green-600' : 'text-red-600'}>
                      {health.database ? 'OK' : 'Error'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auth:</span>
                    <span className={health.auth ? 'text-green-600' : 'text-red-600'}>
                      {health.auth ? 'OK' : 'Error'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Functions:</span>
                    <span className={health.functions ? 'text-green-600' : 'text-red-600'}>
                      {health.functions ? 'OK' : 'Error'}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Last check: {health.lastCheck.toLocaleTimeString()}
                  </div>
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
};