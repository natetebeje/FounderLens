
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSubscriptionCache } from '@/hooks/useSubscriptionCache';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

interface SubscriptionData {
  subscribed: boolean;
  plan_tier: string;
  subscription_end?: string;
  status: string;
  loading: boolean;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionData>({
    subscribed: false,
    plan_tier: 'free',
    status: 'active',
    loading: true
  });
  const { currentOrganization } = useWorkspace();
  const { toast } = useToast();
  const { getCachedSubscription, setCachedSubscription } = useSubscriptionCache();
  const { measureAsync } = usePerformanceMonitor();

  const checkSubscription = useCallback(async (retryCount = 0) => {
    try {
      if (!currentOrganization?.id) {
        console.log('useSubscription: No current organization, using free tier');
        setSubscription({
          subscribed: false,
          plan_tier: 'free',
          status: 'active',
          loading: false
        });
        return;
      }

      // Check cache first for instant loading
      const cached = getCachedSubscription(currentOrganization.id);
      if (cached && retryCount === 0) {
        console.log('useSubscription: Using cached subscription data');
        setSubscription({
          subscribed: cached.subscribed,
          plan_tier: cached.plan_tier,
          subscription_end: cached.subscription_end,
          status: cached.status,
          loading: false
        });
        
        // Verify in background
        verifySubscriptionInBackground(currentOrganization.id);
        return;
      }
      
      setSubscription(prev => ({ ...prev, loading: true }));
      console.log('useSubscription: Checking subscription for organization:', currentOrganization.id, 'Name:', currentOrganization.name, 'retry:', retryCount);
      
      // Use performance monitoring with timeout and retry logic
      const { data, error } = await measureAsync(
        'subscription_check',
        async () => {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Subscription check timeout')), 15000); // 15 second timeout
          });
          
          const subscriptionPromise = supabase.functions.invoke('check-subscription', {
            body: { organizationId: currentOrganization.id }
          });
          
          return Promise.race([subscriptionPromise, timeoutPromise]);
        },
        { organizationId: currentOrganization.id, retryCount }
      ) as any;
      
      if (error) {
        console.error('useSubscription: Error checking subscription:', error);
        throw error;
      }
      
      console.log('useSubscription: Subscription data received:', data, 'for organization:', currentOrganization.name, '(', currentOrganization.id, ')');
      
      const subscriptionData = {
        subscribed: data.subscribed || false,
        plan_tier: data.plan_tier || 'free',
        subscription_end: data.subscription_end,
        status: data.status || 'active',
        loading: false
      };

      setSubscription(subscriptionData);
      
      // Cache the result
      setCachedSubscription(currentOrganization.id, subscriptionData);
    } catch (error) {
      console.error('useSubscription: Error checking subscription:', error);
      
      // Retry logic for timeout errors
      if (error instanceof Error && error.message.includes('timeout') && retryCount < 2) {
        console.log('useSubscription: Retrying subscription check due to timeout, attempt:', retryCount + 1);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
        return checkSubscription(retryCount + 1);
      }
      
      // Show error toast only on final attempt
      if (retryCount >= 2) {
        toast({
          title: 'Subscription Check Failed',
          description: 'Using free tier settings as fallback',
          variant: 'destructive'
        });
      }
      
      setSubscription({
        subscribed: false,
        plan_tier: 'free',
        status: 'active',
        loading: false
      });
    }
  }, [toast, currentOrganization, getCachedSubscription, setCachedSubscription, measureAsync]);

  const verifySubscriptionInBackground = useCallback(async (orgId: string) => {
    try {
      // Silently verify subscription status without blocking UI
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        body: { organizationId: orgId }
      });
      
      if (!error && data) {
        const subscriptionData = {
          subscribed: data.subscribed || false,
          plan_tier: data.plan_tier || 'free',
          subscription_end: data.subscription_end,
          status: data.status || 'active',
          loading: false
        };
        
        // Update cache and state if different
        setCachedSubscription(orgId, subscriptionData);
        setSubscription(subscriptionData);
      }
    } catch (error) {
      console.warn('Background subscription verification failed:', error);
      // Don't show error to user for background checks
    }
  }, [setCachedSubscription]);

  const createCheckout = async (planTier: string) => {
    try {
      if (!currentOrganization) {
        toast({
          title: 'Error',
          description: 'No workspace selected',
          variant: 'destructive'
        });
        return;
      }
      
      console.log('useSubscription: Creating checkout for plan:', planTier, 'organization:', currentOrganization.id);
      
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
      console.error('useSubscription: Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout process',
        variant: 'destructive'
      });
    }
  };

  const openCustomerPortal = async () => {
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
      
      console.log('useSubscription: Opening customer portal for organization:', currentOrganization.id);
      
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
      console.error('useSubscription: Error opening customer portal:', error);
      
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
  };

  useEffect(() => {
    // Don't check if no organization is selected
    if (!currentOrganization) {
      console.log('useSubscription: No organization selected, skipping subscription check');
      setSubscription(prev => ({ ...prev, loading: false }));
      return;
    }
    
    // Use setTimeout to make subscription check non-blocking
    const timer = setTimeout(() => {
      checkSubscription();
    }, 0);
    
    return () => clearTimeout(timer);
  }, [checkSubscription, currentOrganization]);

  return {
    ...subscription,
    checkSubscription,
    createCheckout,
    openCustomerPortal
  };
};
