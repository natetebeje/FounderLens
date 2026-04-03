
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileSubscriptionPage } from "@/components/MobileSubscriptionPage";
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
  Settings
} from "lucide-react";

const Subscription = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { currentOrganization } = useWorkspace();
  const { subscribed, plan_tier, subscription_end, createCheckout, openCustomerPortal, loading } = useSubscription();
  const { limits, usage, canUseFeature, getUsagePercentage, loading: featureLoading } = useFeatureGating(currentOrganization?.id);

  const planDetails = {
    free: { name: "Free", price: "$0", color: "bg-gray-100 text-gray-800" },
    basic: { name: "Basic", price: "$39", color: "bg-blue-100 text-blue-800" },
    pro: { name: "Professional", price: "$99", color: "bg-purple-100 text-purple-800" },
    enterprise: { name: "Enterprise", price: "$299", color: "bg-green-100 text-green-800" }
  };

  const currentPlan = planDetails[plan_tier as keyof typeof planDetails] || planDetails.free;

  const usageItems = [
    {
      name: "Opportunity Discoveries",
      key: "opportunities" as const,
      icon: Target,
      description: "Business opportunities generated"
    },
    {
      name: "AI Generations",
      key: "ai_generations" as const,
      icon: Brain,
      description: "AI-powered analysis requests"
    },
    {
      name: "Team Members",
      key: "team_members" as const,
      icon: Users,
      description: "Active team members"
    },
    {
      name: "Validations",
      key: "validations" as const,
      icon: CheckCircle,
      description: "Validation tasks completed"
    }
  ];

  // Use mobile-optimized version on mobile devices
  if (isMobile) {
    return (
      <MobileSubscriptionPage
        subscribed={subscribed}
        plan_tier={plan_tier}
        subscription_end={subscription_end}
        createCheckout={createCheckout}
        openCustomerPortal={openCustomerPortal}
        loading={loading}
        limits={limits}
        usage={usage}
        canUseFeature={canUseFeature}
        getUsagePercentage={getUsagePercentage}
        featureLoading={featureLoading}
      />
    );
  }

  if (loading || featureLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {loading ? "Loading subscription details..." : "Loading usage data..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Subscription & Billing</h1>
              <p className="text-muted-foreground mt-2">
                Manage your subscription, view usage, and access billing information
              </p>
            </div>
            <Button onClick={() => navigate("/pricing")} variant="outline" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              View All Plans
            </Button>
          </div>

          {/* Current Plan Status */}
          <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <CreditCard className="w-5 h-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge className={currentPlan.color}>
                    {currentPlan.name}
                  </Badge>
                  <span className="text-2xl font-bold">{currentPlan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <div className="flex gap-2">
                  {subscribed && (
                    <Button 
                      onClick={openCustomerPortal}
                      variant="outline"
                      className="gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Manage Billing
                    </Button>
                  )}
                  {plan_tier !== 'enterprise' && (
                    <Button 
                      onClick={() => navigate("/pricing")}
                      variant="hero"
                      className="gap-2"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              </div>

              {subscribed && subscription_end && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Next billing cycle: {format(new Date(subscription_end), 'PPP')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Dashboard */}
          <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5" />
                Usage Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {usageItems.map((item) => {
                  const currentUsage = usage[item.key] || 0;
                  const limit = limits[item.key];
                  const percentage = getUsagePercentage(item.key);
                  const isUnlimited = limit === null;
                  const isNearLimit = !isUnlimited && percentage > 80;
                  
                  return (
                    <div key={item.key} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>
                            {currentUsage} {isUnlimited ? "used" : `of ${limit}`}
                          </span>
                          {!isUnlimited && (
                            <span className={isNearLimit ? "text-orange-600" : "text-muted-foreground"}>
                              {percentage.toFixed(0)}%
                            </span>
                          )}
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
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="font-medium">Opportunities</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Discover new business opportunities
                </p>
                <Button 
                  onClick={() => navigate("/discovery")}
                  variant="outline" 
                  className="w-full"
                  disabled={!canUseFeature('opportunities')}
                >
                  {canUseFeature('opportunities') ? "Start Discovery" : "Upgrade to Create More"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="font-medium">Team</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Invite team members to collaborate
                </p>
                <Button 
                  onClick={() => navigate("/team")}
                  variant="outline" 
                  className="w-full"
                  disabled={!canUseFeature('team_members')}
                >
                  {canUseFeature('team_members') ? "Manage Team" : "Upgrade for More Members"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-medium">Analytics</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  View detailed analytics and insights
                </p>
                <Button 
                  onClick={() => navigate("/analytics")}
                  variant="outline" 
                  className="w-full"
                >
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
