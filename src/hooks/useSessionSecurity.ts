import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SessionSecurityConfig {
  timeoutWarningMinutes: number;
  maxIdleMinutes: number;
  checkIntervalSeconds: number;
}

const DEFAULT_CONFIG: SessionSecurityConfig = {
  timeoutWarningMinutes: 5,
  maxIdleMinutes: 30,
  checkIntervalSeconds: 60
};

export const useSessionSecurity = (config: Partial<SessionSecurityConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { isAuthenticated, signOut } = useAuth();
  const { toast } = useToast();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [warningShown, setWarningShown] = useState(false);

  // Update activity timestamp
  const updateActivity = () => {
    setLastActivity(Date.now());
    setWarningShown(false);
  };

  // Check for session timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = async () => {
      const now = Date.now();
      const idleTime = now - lastActivity;
      const idleMinutes = idleTime / (1000 * 60);

      // Show warning before timeout
      if (idleMinutes >= finalConfig.maxIdleMinutes - finalConfig.timeoutWarningMinutes && !warningShown) {
        setWarningShown(true);
        toast({
          title: "Session timeout warning",
          description: `Your session will expire in ${finalConfig.timeoutWarningMinutes} minutes due to inactivity.`,
          duration: 10000,
        });
      }

      // Force logout on timeout
      if (idleMinutes >= finalConfig.maxIdleMinutes) {
        toast({
          title: "Session expired",
          description: "You have been logged out due to inactivity.",
          variant: "destructive",
        });
        await signOut();
      }
    };

    const interval = setInterval(checkSession, finalConfig.checkIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, lastActivity, finalConfig, warningShown, toast, signOut]);

  // Track user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const throttledUpdateActivity = throttle(updateActivity, 5000); // Throttle to every 5 seconds

    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity, true);
      });
    };
  }, [isAuthenticated]);

  // Monitor for suspicious activity  
  const logSecurityEvent = async (eventType: string, details?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert security event without IP address (client-side can't determine real IP)
      const { error } = await supabase
        .from('security_events')
        .insert({
          user_id: user.id,
          event_type: eventType,
          event_data: details || {},
          user_agent: navigator.userAgent,
          // ip_address: null (will be handled server-side if needed)
        });

      if (error) {
        console.error('Failed to log security event:', error);
        // Don't throw - security logging should not break app functionality
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Silent fail for security logging to prevent app disruption
    }
  };

  // Detect multiple tabs/windows
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateActivity();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'session_active' && e.newValue) {
        const sessionData = JSON.parse(e.newValue);
        if (sessionData.timestamp > lastActivity) {
          logSecurityEvent('concurrent_session_detected', {
            other_session_timestamp: sessionData.timestamp,
            current_session_timestamp: lastActivity
          });
        }
      }
    };

    // Broadcast activity to other tabs
    const broadcastActivity = () => {
      localStorage.setItem('session_active', JSON.stringify({
        timestamp: Date.now(),
        tab_id: Math.random().toString(36)
      }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    
    const broadcastInterval = setInterval(broadcastActivity, 10000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(broadcastInterval);
    };
  }, [isAuthenticated, lastActivity]);

  return {
    lastActivity,
    updateActivity,
    isIdle: (Date.now() - lastActivity) / (1000 * 60) > finalConfig.maxIdleMinutes / 2,
    logSecurityEvent
  };
};

// Utility function for throttling
function throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return ((...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  }) as T;
}