
import { useState } from 'react';
import { WorkspaceAnalytics } from '@/components/WorkspaceAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Crown, TrendingUp } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { UpgradePrompt } from '@/components/UpgradePrompt';

const Analytics = () => {
  const { currentOrganization } = useWorkspace();
  const { canUseFeature, getUsagePercentage } = useFeatureGating(currentOrganization?.id);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const hasAdvancedAnalytics = canUseFeature('advanced_analytics');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-16">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                Workspace Analytics
              </h1>
              <p className="text-muted-foreground mt-2">
                Track your team's progress and workspace performance
              </p>
            </div>
            {!hasAdvancedAnalytics && (
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setShowUpgradePrompt(true)}
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade for Advanced Analytics
              </Badge>
            )}
          </div>
        </div>

        {/* Show basic analytics for all users, with upgrade prompt for advanced features */}
        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                View your workspace activity and basic metrics.
              </p>
              {/* Basic analytics component that works for all users */}
              <WorkspaceAnalytics />
            </CardContent>
          </Card>
          
          {!hasAdvancedAnalytics && (
            <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
              <CardContent className="text-center p-8">
                <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Advanced Analytics Available</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Unlock detailed insights, custom reports, and advanced metrics to optimize your business opportunities.
                </p>
                <Badge 
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 px-6 py-2"
                  onClick={() => setShowUpgradePrompt(true)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  View Plans
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>

        <UpgradePrompt
          isOpen={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          featureName="advanced_analytics"
          currentUsage={getUsagePercentage('advanced_analytics')}
        />
      </div>
    </div>
  );
};

export default Analytics;
