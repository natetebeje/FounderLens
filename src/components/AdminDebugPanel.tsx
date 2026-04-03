import React from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const AdminDebugPanel: React.FC = () => {
  const { currentOrganization, organizations, currentUserRole } = useWorkspace();
  const { plan_tier, subscribed, loading: subscriptionLoading } = useSubscription();
  const { isAdmin, canUseFeature, usage, limits, planTier } = useFeatureGating(currentOrganization?.id);

  // Only show debug panel for admins
  if (!isAdmin) return null;

  return (
    <Card className="mt-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <CardHeader>
        <CardTitle className="text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
          🛠️ Admin Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Workspace Info */}
        <div>
          <h4 className="font-semibold mb-2">Workspace Context</h4>
          <div className="space-y-1 text-sm">
            <div>Current Organization: <Badge variant="outline">{currentOrganization?.name || 'None'}</Badge></div>
            <div>Organization ID: <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">{currentOrganization?.id || 'None'}</code></div>
            <div>User Role: <Badge>{currentUserRole || 'None'}</Badge></div>
            <div>Total Organizations: {organizations.length}</div>
            <div>Admin Status: <Badge variant={isAdmin ? "default" : "destructive"}>{isAdmin ? 'Yes' : 'No'}</Badge></div>
          </div>
        </div>

        {/* Subscription Info */}
        <div>
          <h4 className="font-semibold mb-2">Subscription Context</h4>
          <div className="space-y-1 text-sm">
            <div>Loading: <Badge variant={subscriptionLoading ? "destructive" : "default"}>{subscriptionLoading ? 'Yes' : 'No'}</Badge></div>
            <div>Subscribed: <Badge variant={subscribed ? "default" : "destructive"}>{subscribed ? 'Yes' : 'No'}</Badge></div>
            <div>Plan Tier: <Badge variant="outline">{plan_tier}</Badge></div>
            <div>Feature Gating Plan: <Badge variant="outline">{planTier}</Badge></div>
          </div>
        </div>

        {/* Feature Gating Info */}
        <div>
          <h4 className="font-semibold mb-2">Feature Gating Status</h4>
          <div className="space-y-1 text-sm">
            <div>Can Use Opportunities: <Badge variant={canUseFeature('opportunities') ? "default" : "destructive"}>{canUseFeature('opportunities') ? 'Yes' : 'No'}</Badge></div>
            <div>Opportunities Usage: {usage.opportunities} / {limits.opportunities || 'Unlimited'}</div>
            <div>Can Use AI Generations: <Badge variant={canUseFeature('ai_generations') ? "default" : "destructive"}>{canUseFeature('ai_generations') ? 'Yes' : 'No'}</Badge></div>
            <div>AI Generations Usage: {usage.ai_generations} / {limits.ai_generations || 'Unlimited'}</div>
          </div>
        </div>

        {/* All Organizations */}
        <div>
          <h4 className="font-semibold mb-2">All Organizations</h4>
          <div className="space-y-1 text-xs">
            {organizations.map((org, index) => (
              <div key={org.id} className={`p-2 rounded ${org.id === currentOrganization?.id ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <div>#{index + 1}: {org.name}</div>
                <div>ID: {org.id}</div>
                <div>Slug: {org.slug}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};