
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { LIFETIME_PLANS } from "@/utils/constants";
import { LifetimePricingCard } from "./LifetimePricingCard";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for validating your first idea",
    features: [
      "Up to 9 opportunities",
      "3 validation projects",
      "Reddit research", 
      "Basic build templates",
      "Community access"
    ],
    popular: false
  },
  {
    name: "Basic",
    price: "$39",
    period: "/month",
    originalPrice: "$49",
    description: "Ready to reach first revenue fast",
    features: [
      "Up to 75 opportunities", 
      "25 validation projects",
      "Full validation suite",
      "Build Lab programs",
      "3 team members",
      "Launch templates",
      "Revenue tracking"
    ],
    popular: true
  },
  {
    name: "Professional", 
    price: "$99",
    period: "/month",
    originalPrice: "$129",
    description: "For product teams building multiple projects",
    features: [
      "Unlimited opportunities",
      "Unlimited validation projects", 
      "Advanced automation",
      "Team collaboration hub",
      "10 team members",
      "Custom build programs",
      "API access",
      "Priority support"
    ],
    popular: false
  },
  {
    name: "Enterprise",
    price: "$299",
    period: "/month",
    originalPrice: "$399", 
    description: "For large organizations",
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "Custom AI training",
      "Dedicated support",
      "SSO integration",
      "Custom deployment",
      "SLA guarantee"
    ],
    popular: false
  }
];

const PricingSection = () => {
  const { subscribed, plan_tier, createCheckout } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pricingMode, setPricingMode] = useState<'monthly' | 'lifetime'>('monthly');

  const handlePlanSelect = (planName: string) => {
    if (planName === "free") return;
    
    const planTier = planName === 'professional' ? 'pro' : planName;
    
    // Check if user is authenticated
    if (!user) {
      // Store the selected plan in localStorage for after auth
      localStorage.setItem('pendingPlan', planTier);
      
      // Show toast to inform user
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade your plan",
      });
      
      // Redirect to auth page with plan parameter
      navigate(`/auth?plan=${planTier}`);
      return;
    }
    
    // User is authenticated, proceed with checkout
    createCheckout(planTier);
  };

  const isCurrentPlan = (planName: string) => {
    const planKey = planName === 'professional' ? 'pro' : planName;
    return plan_tier === planKey;
  };

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your validation and launch timeline. Upgrade or downgrade at any time.
          </p>
          
          {/* Pricing Mode Toggle */}
          <div className="flex items-center justify-center mt-8 mb-8">
            <div className="bg-muted rounded-lg p-1 flex">
              <button
                onClick={() => setPricingMode('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  pricingMode === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPricingMode('lifetime')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  pricingMode === 'lifetime'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Lifetime
              </button>
            </div>
          </div>
          
          {pricingMode === 'monthly' && (
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-glass px-4 py-2 rounded-full border border-white/20">
              <span className="text-sm text-muted-foreground">💰 Save 20% with annual billing</span>
            </div>
          )}
        </div>

        {pricingMode === 'monthly' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative bg-white/10 backdrop-blur-glass p-6 rounded-2xl border transition-smooth hover:shadow-glow animate-fade-in ${
                  plan.popular 
                    ? "border-primary/50 shadow-glow scale-105 bg-white/15" 
                    : "border-white/20 shadow-soft hover:bg-white/15"
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-primary px-4 py-1 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 text-white" />
                      <span className="text-xs text-white font-medium">Most Popular</span>
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2 text-foreground">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.originalPrice && (
                    <div className="text-sm text-muted-foreground line-through">
                      {plan.originalPrice}/month
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.popular ? "hero" : "outline"} 
                  className="w-full"
                  size="lg"
                  onClick={() => handlePlanSelect(plan.name.toLowerCase())}
                  disabled={isCurrentPlan(plan.name.toLowerCase())}
                >
                  {isCurrentPlan(plan.name.toLowerCase()) 
                    ? "Current Plan" 
                    : plan.name === "Free" 
                      ? "Get Started" 
                      : user 
                        ? "Upgrade Now"
                        : `Start ${plan.name}`
                  }
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <LifetimePricingCard 
            onPurchase={handlePlanSelect}
            isCurrentPlan={isCurrentPlan}
            onContactSales={() => navigate('/contact')}
          />
        )}

        <div className="text-center mt-12">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span>✓ Cancel anytime</span>
            <span>✓ Money-back guarantee</span>
            <span>✓ 24/7 support</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export { PricingSection };
