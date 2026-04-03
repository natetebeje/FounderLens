
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { Crown, Zap, Users, Target, Check } from "lucide-react";

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  currentUsage: number;
  limit?: number;
}

export const UpgradePrompt = ({ 
  isOpen, 
  onClose, 
  featureName, 
  currentUsage, 
  limit = 100
}: UpgradePromptProps) => {
  const navigate = useNavigate();
  const { plan_tier, createCheckout } = useSubscription();

  const featureDetails = {
    opportunities: {
      name: "Opportunity Discoveries",
      icon: Target,
      description: "Generate more business opportunities with AI analysis"
    },
    ai_generations: {
      name: "AI Generations",
      icon: Zap,
      description: "Access unlimited AI-powered market analysis"
    },
    team_members: {
      name: "Team Members",
      icon: Users,
      description: "Collaborate with more team members"
    },
    validations: {
      name: "Validations",
      icon: Check,
      description: "Run more validation tasks and experiments"
    },
    advanced_analytics: {
      name: "Advanced Analytics",
      icon: Crown,
      description: "Access detailed insights and custom reports"
    },
    enterprise_features: {
      name: "Enterprise Features",
      icon: Crown,
      description: "White-labeling, SSO, and advanced security"
    }
  };

  const currentFeature = featureDetails[featureName as keyof typeof featureDetails];
  const Icon = currentFeature?.icon || Target;

  const recommendedPlan = plan_tier === 'free' ? 'basic' : 'pro';
  const planDetails = {
    basic: { name: "Basic", price: "$39", features: ["10 opportunities", "Advanced AI", "3 team members"] },
    pro: { name: "Professional", price: "$99", features: ["Unlimited opportunities", "Full AI capabilities", "10 team members"] }
  };

  const recommended = planDetails[recommendedPlan as keyof typeof planDetails];

  const handleUpgrade = () => {
    if (recommendedPlan === 'basic') {
      createCheckout('basic');
    } else {
      createCheckout('pro');
    }
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-xl w-full mx-4 p-8">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-6">
              <p className="text-base">
                You've reached your limit for <strong>{currentFeature?.name || featureName}</strong> 
                ({currentUsage || 0}/{limit} used).
              </p>
              
              <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-primary" />
                  <span className="font-medium">Recommended Plan</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Badge variant="outline">{recommended.name}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentFeature?.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{recommended.price}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {recommended.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Check className="w-3 h-3 text-green-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Button onClick={() => navigate("/pricing")} className="w-full sm:w-auto">
            Compare All Plans
          </Button>
          <Button onClick={handleUpgrade} variant="hero" className="gap-2 w-full sm:w-auto">
            <Crown className="w-4 h-4" />
            Upgrade Now
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
