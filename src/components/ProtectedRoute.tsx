import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireWorkspace?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireWorkspace = false
}) => {
  const { user, loading: authLoading } = useAuth();
  const { isLoading: workspaceLoading, currentOrganization, refreshOrganizations } = useWorkspace();
  const [hasRetried, setHasRetried] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Auto-retry once if workspace failed to load (handles new user timing)
  useEffect(() => {
    if (requireWorkspace && !workspaceLoading && !currentOrganization && user && !hasRetried) {
      setHasRetried(true);
      setRetrying(true);
      const timer = setTimeout(async () => {
        await refreshOrganizations();
        setRetrying(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [requireWorkspace, workspaceLoading, currentOrganization, user, hasRetried, refreshOrganizations]);

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show loading while workspace is being loaded (if required)
  if (requireWorkspace && (workspaceLoading || retrying)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Show error if workspace is required but not found after retry
  if (requireWorkspace && !workspaceLoading && !currentOrganization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Could not load your workspace.</p>
          <button
            onClick={() => {
              setHasRetried(false);
              setRetrying(true);
              refreshOrganizations().finally(() => setRetrying(false));
            }}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
