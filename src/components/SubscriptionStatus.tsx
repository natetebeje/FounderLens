
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { Crown, AlertTriangle, TrendingUp } from "lucide-react";

interface SubscriptionStatusProps {
  compact?: boolean;
}

export const SubscriptionStatus = ({ compact = false }: SubscriptionStatusProps) => {
  const navigate = useNavigate();
  const { currentOrganization } = useWorkspace();
  const { subscribed, plan_tier, loading } = useSubscription();
  const { getUsagePercentage } = useFeatureGating(currentOrganization?.id);

  const planDetails = {
    free: { name: "Free", color: "bg-gray-100 text-gray-800" },
    basic: { name: "Basic", color: "bg-blue-100 text-blue-800" },
    pro: { name: "Professional", color: "bg-purple-100 text-purple-800" },
    enterprise: { name: "Enterprise", color: "bg-green-100 text-green-800" }
  };

  const currentPlan = planDetails[plan_tier as keyof typeof planDetails] || planDetails.free;

  // Check if user is approaching limits
  const opportunitiesUsage = getUsagePercentage('opportunities');
  const aiGenerationsUsage = getUsagePercentage('ai_generations');
  const isApproachingLimit = opportunitiesUsage > 80 || aiGenerationsUsage > 80;

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 w-16 bg-muted rounded"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={currentPlan.color}>
          {currentPlan.name}
        </Badge>
        {isApproachingLimit && plan_tier === 'free' && (
          <AlertTriangle className="w-4 h-4 text-orange-500" />
        )}
      </div>
    );
  }

  return (
    <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <Badge className={currentPlan.color}>
                  {currentPlan.name}
                </Badge>
                {subscribed && (
                  <span className="text-xs text-green-600">Active</span>
                )}
              </div>
              {isApproachingLimit && plan_tier === 'free' && (
                <p className="text-xs text-orange-600 mt-1">
                  Approaching usage limits
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate("/subscription")}
              variant="outline"
              size="sm"
            >
              Manage
            </Button>
            {plan_tier !== 'enterprise' && (
              <Button 
                onClick={() => navigate("/pricing")}
                variant="hero"
                size="sm"
                className="gap-2"
              >
                <TrendingUp className="w-3 h-3" />
                Upgrade
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
