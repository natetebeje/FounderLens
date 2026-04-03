
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Building2, AlertCircle, ChevronDown, RefreshCw } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

export const WorkspaceSwitcher = () => {
  const { 
    currentOrganization,
    organizations,
    isLoading,
    refreshOrganizations
  } = useWorkspace();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { plan_tier } = useSubscription();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Show loading if auth is loading or workspace is loading
  if (authLoading || isLoading) {
    return (
      <Button variant="outline" className="gap-2 min-w-[200px] justify-start" disabled>
        <Building2 className="w-4 h-4" />
        <span className="truncate max-w-[120px]">Loading workspace...</span>
      </Button>
    );
  }
  
  // If user is not authenticated, show appropriate message
  if (!isAuthenticated) {
    return (
      <Button variant="outline" className="gap-2 min-w-[200px] justify-start" disabled>
        <AlertCircle className="w-4 h-4" />
        <span className="truncate max-w-[120px]">Not authenticated</span>
      </Button>
    );
  }
  
  // If authenticated but no workspace yet, might be still loading or error
  if (!currentOrganization) {
    return (
      <Button variant="outline" className="gap-2 min-w-[200px] justify-start" disabled>
        <AlertCircle className="w-4 h-4" />
        <span className="truncate max-w-[120px]">No workspace found</span>
      </Button>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshOrganizations();
    } finally {
      setIsRefreshing(false);
    }
  };

  const planColor = plan_tier === 'enterprise' ? 'text-green-600' : 
                   plan_tier === 'pro' ? 'text-purple-600' : 
                   plan_tier === 'basic' ? 'text-blue-600' : 'text-gray-500';

  // Show workspace dropdown with multiple options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <div className="flex flex-col items-start">
              <span className="truncate max-w-[120px] text-sm font-medium">
                {currentOrganization.name}
              </span>
              <span className={`text-xs capitalize ${planColor}`}>
                {plan_tier} Plan
              </span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        <DropdownMenuLabel>Current Workspace</DropdownMenuLabel>
        <DropdownMenuItem className="flex flex-col items-start py-3">
          <div className="font-medium">{currentOrganization.name}</div>
          <div className={`text-sm capitalize ${planColor}`}>
            {plan_tier} Plan
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {organizations.length} workspace{organizations.length !== 1 ? 's' : ''} available
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
