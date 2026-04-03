import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOptimizedSubscription } from '@/hooks/useOptimizedSubscription';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [subscriptionRefreshed, setSubscriptionRefreshed] = useState(false);
  const { refreshSubscription } = useOptimizedSubscription();
  const { currentOrganization, isLoading: workspaceLoading } = useWorkspace();

  // Refresh subscription once workspace is loaded
  useEffect(() => {
    if (!workspaceLoading && currentOrganization && !subscriptionRefreshed) {
      console.log('SubscriptionSuccess: Refreshing subscription for organization:', currentOrganization.id);
      refreshSubscription();
      setSubscriptionRefreshed(true);
    }
  }, [workspaceLoading, currentOrganization, refreshSubscription, subscriptionRefreshed]);

  // Start countdown timer only after workspace is loaded
  useEffect(() => {
    if (workspaceLoading) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/subscription');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, workspaceLoading]);

  const handleGoToSubscription = () => {
    navigate('/subscription');
  };

  const sessionId = searchParams.get('session_id');

  // Show loading state while workspace is loading
  if (workspaceLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="flex justify-center mb-6">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
            
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Setting up your subscription...
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Please wait while we activate your premium features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Subscription Successful!
          </h1>
          
          <p className="text-muted-foreground mb-6">
            Thank you for subscribing! Your account has been upgraded and you now have access to all premium features.
          </p>

          {sessionId && (
            <p className="text-sm text-muted-foreground mb-4">
              Session ID: {sessionId}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <Button onClick={handleGoToSubscription} className="w-full">
              Go to Subscription Dashboard
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Redirecting in {countdown} seconds...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;