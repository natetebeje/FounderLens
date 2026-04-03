import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { format } from "date-fns";
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Users, 
  Target, 
  Brain,
  CheckCircle,
  ArrowUpRight,
  Settings,
  RefreshCw
} from "lucide-react";

interface MobileSubscriptionPageProps {
  subscribed: boolean;
  plan_tier: string;
  subscription_end?: string;
  createCheckout: (planTier: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  loading: boolean;
  limits: any;
  usage: any;
  canUseFeature: (feature: string) => boolean;
  getUsagePercentage: (feature: string) => number;
  featureLoading: boolean;
}

export const MobileSubscriptionPage = ({
  subscribed,
  plan_tier,
  subscription_end,
  createCheckout,
  openCustomerPortal,
  loading,
  limits,
  usage,
  canUseFeature,
  getUsagePercentage,
  featureLoading
}: MobileSubscriptionPageProps) => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Add haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const { isRefreshing: pullRefreshing } = usePullToRefresh(handleRefresh);

  const planDetails = {
    free: { name: "Free", price: "$0", color: "bg-gray-100 text-gray-800" },
    basic: { name: "Basic", price: "$39", color: "bg-blue-100 text-blue-800" },
    pro: { name: "Professional", price: "$99", color: "bg-purple-100 text-purple-800" },
    enterprise: { name: "Enterprise", price: "$299", color: "bg-green-100 text-green-800" }
  };

  const currentPlan = planDetails[plan_tier as keyof typeof planDetails] || planDetails.free;

  const usageItems = [
    {
      name: "Opportunities",
      key: "opportunities" as const,
      icon: Target,
      description: "Discoveries"
    },
    {
      name: "AI Generations",
      key: "ai_generations" as const,
      icon: Brain,
      description: "AI requests"
    },
    {
      name: "Team Members",
      key: "team_members" as const,
      icon: Users,
      description: "Active members"
    }
  ];

  if (loading || featureLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">
            {loading ? "Loading subscription..." : "Loading usage..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 py-6 space-y-6">
        {/* Pull to refresh indicator */}
        {(isRefreshing || pullRefreshing) && (
          <div className="flex items-center justify-center py-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Refreshing...</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
          <p className="text-muted-foreground text-sm">
            Manage your plan and usage
          </p>
        </div>

        {/* Current Plan - Mobile Optimized */}
        <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Badge className={currentPlan.color}>
                  {currentPlan.name}
                </Badge>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold">{currentPlan.price}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </div>
            </div>

            {subscribed && subscription_end && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Next billing: {format(new Date(subscription_end), 'MMM d')}</span>
              </div>
            )}

            <div className="flex gap-2">
              {subscribed && (
                <Button 
                  onClick={openCustomerPortal}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Manage
                </Button>
              )}
              {plan_tier !== 'enterprise' && (
                <Button 
                  onClick={() => navigate("/pricing")}
                  variant="hero"
                  size="sm"
                  className="flex-1"
                >
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  Upgrade
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Overview - Mobile Optimized */}
        <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usageItems.map((item) => {
                const currentUsage = usage[item.key] || 0;
                const limit = limits[item.key];
                const percentage = getUsagePercentage(item.key);
                const isUnlimited = limit === null;
                const isNearLimit = !isUnlimited && percentage > 80;
                
                return (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <item.icon className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {currentUsage}{!isUnlimited && ` / ${limit}`}
                        </p>
                        {!isUnlimited && (
                          <p className={`text-xs ${isNearLimit ? "text-orange-600" : "text-muted-foreground"}`}>
                            {percentage.toFixed(0)}%
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!isUnlimited && (
                      <Progress 
                        value={percentage} 
                        className={`h-2 ${isNearLimit ? "[&>div]:bg-orange-500" : ""}`}
                      />
                    )}
                    
                    {isUnlimited && (
                      <Badge variant="outline" className="text-xs">
                        Unlimited
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Mobile Optimized */}
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Quick Actions</h3>
          <div className="space-y-3">
            <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="font-medium text-sm">Opportunities</h4>
                      <p className="text-xs text-muted-foreground">Discover new ideas</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate("/discovery")}
                    size="sm"
                    variant="outline"
                    disabled={!canUseFeature('opportunities')}
                  >
                    {canUseFeature('opportunities') ? "Start" : "Upgrade"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="font-medium text-sm">Team</h4>
                      <p className="text-xs text-muted-foreground">Invite members</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate("/team")}
                    size="sm"
                    variant="outline"
                    disabled={!canUseFeature('team_members')}
                  >
                    {canUseFeature('team_members') ? "Manage" : "Upgrade"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="font-medium text-sm">Analytics</h4>
                      <p className="text-xs text-muted-foreground">View insights</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate("/analytics")}
                    size="sm"
                    variant="outline"
                  >
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};