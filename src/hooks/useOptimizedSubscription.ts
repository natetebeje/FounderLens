import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { deduplicateSubscriptionCheck } from '@/utils/requestDeduplicator';
import { logger } from '@/utils/logger';

interface SubscriptionData {
  subscribed: boolean;
  plan_tier: string;
  subscription_end?: string;
  status: string;
  loading: boolean;
  error?: string;
}

export const useOptimizedSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionData>({
    subscribed: false,
    plan_tier: 'free',
    status: 'active',
    loading: true
  });

  const { currentOrganization } = useWorkspace();
  const { toast } = useToast();
  const { measureAsync } = usePerformanceMonitor();
  
  // Refs to prevent stale closures and track state
  const lastCheckRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const backgroundCheckRef = useRef<NodeJS.Timeout>();

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (backgroundCheckRef.current) {
        clearTimeout(backgroundCheckRef.current);
      }
    };
  }, []);

  const checkSubscription = useCallback(async (isBackground = false) => {
    try {
      if (!currentOrganization?.id) {
        logger.info('useOptimizedSubscription: No current organization, using free tier');
        if (mountedRef.current) {
          setSubscription({
            subscribed: false,
            plan_tier: 'free',
            status: 'active',
            loading: false
          });
        }
        return;
      }

      // Don't show loading state for background checks
      if (!isBackground && mountedRef.current) {
        setSubscription(prev => ({ ...prev, loading: true, error: undefined }));
      }

      logger.info('useOptimizedSubscription: Checking subscription for organization:', currentOrganization.id);

      // Use request deduplication to prevent race conditions
      const result = await deduplicateSubscriptionCheck(
        currentOrganization.id,
        currentOrganization.id,
        async () => {
          return measureAsync(
            'subscription_check_optimized',
            async () => {
              // Try optimized database function first (faster)
              try {
                const { data: user } = await supabase.auth.getUser();
                if (user.user) {
                  const { data: dbResult, error: dbError } = await supabase
                    .rpc('get_subscription_status_optimized', {
                      p_user_id: user.user.id,
                      p_organization_id: currentOrganization.id
                    });

                  if (!dbError && dbResult && dbResult.length > 0) {
                    const sub = dbResult[0];
                    logger.info('useOptimizedSubscription: Using optimized DB function result');
                    return {
                      subscribed: sub.subscribed,
                      plan_tier: sub.plan_tier,
                      subscription_end: sub.subscription_end,
                      status: sub.subscribed ? 'active' : 'free'
                    };
                  }
                }
              } catch (dbError) {
                logger.warn('useOptimizedSubscription: DB function failed, falling back to edge function:', dbError);
              }

              // Fallback to edge function with timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

              try {
                const { data, error } = await supabase.functions.invoke('check-subscription', {
                  body: { organizationId: currentOrganization.id },
                  headers: {
                    'X-Request-Deduped': 'true'
                  }
                });

                clearTimeout(timeoutId);

                if (error) {
                  logger.error('useOptimizedSubscription: Supabase function error:', error);
                  throw error;
                }

                return data;
              } catch (error) {
                clearTimeout(timeoutId);
                throw error;
              }
            },
            { organizationId: currentOrganization.id, isBackground }
          );
        }
      );

      logger.info('useOptimizedSubscription: Subscription data received:', result);

      const subscriptionData: SubscriptionData = {
        subscribed: result.subscribed || false,
        plan_tier: result.plan_tier || 'free',
        subscription_end: result.subscription_end,
        status: result.status || 'active',
        loading: false
      };

      if (mountedRef.current) {
        setSubscription(subscriptionData);
        lastCheckRef.current = Date.now();
      }

      // Schedule background refresh if this was a foreground check
      if (!isBackground && mountedRef.current) {
        if (backgroundCheckRef.current) {
          clearTimeout(backgroundCheckRef.current);
        }
        backgroundCheckRef.current = setTimeout(() => {
          if (mountedRef.current) {
            checkSubscription(true);
          }
        }, 10 * 60 * 1000); // Increased to 10 minutes to reduce frequency
      }

    } catch (error) {
      logger.error('useOptimizedSubscription: Error checking subscription:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (mountedRef.current) {
        // Only show error for multiple consecutive failures, not network glitches
        const isNetworkError = errorMessage.includes('Failed to fetch') || 
                               errorMessage.includes('Failed to send a request');
        
        if (!isBackground && !isNetworkError) {
          toast({
            title: 'Subscription Check Failed',
            description: 'Please try refreshing the page',
            variant: 'destructive'
          });
        }

        // For network errors, keep previous subscription state instead of resetting to free
        if (isNetworkError) {
          setSubscription(prev => ({
            ...prev,
            loading: false,
            error: errorMessage
          }));
        } else {
          setSubscription(prev => ({
            subscribed: false,
            plan_tier: 'free',
            status: 'active',
            loading: false,
            error: errorMessage
          }));
        }
      }
    }
  }, [currentOrganization, toast, measureAsync]);

  const createCheckout = useCallback(async (planTier: string) => {
    try {
      if (!currentOrganization) {
        toast({
          title: 'Error',
          description: 'No workspace selected',
          variant: 'destructive'
        });
        return;
      }

      logger.info('useOptimizedSubscription: Creating checkout for plan:', planTier, 'organization:', currentOrganization.id);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          planTier,
          organizationId: currentOrganization.id 
        }
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      logger.error('useOptimizedSubscription: Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout process',
        variant: 'destructive'
      });
    }
  }, [currentOrganization, toast]);

  const openCustomerPortal = useCallback(async () => {
    let portalWindow: Window | null = null;
    
    try {
      if (!currentOrganization) {
        toast({
          title: 'Error',
          description: 'No workspace selected',
          variant: 'destructive'
        });
        return;
      }

      logger.info('useOptimizedSubscription: Opening customer portal for organization:', currentOrganization.id);

      // Pre-open window immediately to prevent Safari popup blocking
      portalWindow = window.open('about:blank', '_blank');

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { organizationId: currentOrganization.id }
      });

      if (error) throw error;

      // Update the pre-opened window with the portal URL
      if (data.url && portalWindow) {
        portalWindow.location.href = data.url;
      } else if (data.url) {
        // Fallback if pre-opening failed
        window.open(data.url, '_blank');
      }
    } catch (error) {
      logger.error('useOptimizedSubscription: Error opening customer portal:', error);
      
      // Close the blank window if API failed
      if (portalWindow && !portalWindow.closed) {
        portalWindow.close();
      }
      
      toast({
        title: 'Error',
        description: 'Failed to open customer portal',
        variant: 'destructive'
      });
    }
  }, [currentOrganization, toast]);

  // Initial subscription check when organization changes
  useEffect(() => {
    if (!currentOrganization) {
      logger.info('useOptimizedSubscription: No organization selected, skipping subscription check');
      if (mountedRef.current) {
        setSubscription(prev => ({ ...prev, loading: false }));
      }
      return;
    }

    // Clear any cached subscription data for this organization
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.includes('subscription_cache') && key.includes(currentOrganization.id)
    );
    cacheKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    // Reset to loading state and force immediate fresh check
    if (mountedRef.current) {
      setSubscription({
        subscribed: false,
        plan_tier: 'free',
        status: 'active',
        loading: true
      });
      checkSubscription(false);
    }
  }, [checkSubscription, currentOrganization?.id]);

  // Refresh subscription when returning to foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && mountedRef.current && currentOrganization) {
        const timeSinceLastCheck = Date.now() - lastCheckRef.current;
        // Only refresh if it's been more than 5 minutes since last check
        if (timeSinceLastCheck > 5 * 60 * 1000) {
          checkSubscription(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkSubscription, currentOrganization]);

  return {
    ...subscription,
    checkSubscription: () => checkSubscription(false),
    createCheckout,
    openCustomerPortal,
    refreshSubscription: () => checkSubscription(true)
  };
};