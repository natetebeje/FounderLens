
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Check, Crown, Star, Building2, Zap } from 'lucide-react';
import { ModernBackground } from "@/components/ui/modern-background";
import { LifetimePricingCard } from '@/components/LifetimePricingCard';

const Pricing = () => {
  const navigate = useNavigate();
  const { subscribed, plan_tier, createCheckout } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [pricingMode, setPricingMode] = useState<'monthly' | 'lifetime'>('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      icon: Star,
      features: [
        'Up to 9 opportunities',
        '3 discovery sessions included',
        '3 AI generations per month',
        '1 team member',
        '1 validation workflow',
        'Basic analytics',
        'Email support'
      ],
      limitations: [
        'Limited opportunities',
        'Basic AI features',
        'No advanced analytics'
      ],
      cta: 'Current Plan',
      popular: false
    },
    {
      id: 'basic',
      name: 'Basic',
      price: '$39',
      period: 'month',
      description: 'Ideal for solo entrepreneurs',
      icon: Zap,
      features: [
        'Up to 75 opportunities',
        '25 discovery sessions',
        'Unlimited AI generations',
        '3 team members',
        '10 validation workflows',
        'Advanced analytics',
        'Priority email support',
        'Export capabilities'
      ],
      cta: 'Upgrade to Basic',
      popular: true
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$99',
      period: 'month',
      description: 'For growing teams and businesses',
      icon: Crown,
      features: [
        'Unlimited opportunities',
        'Unlimited discoveries',
        'Advanced AI capabilities',
        '10 team members',
        'Unlimited validations',
        'Custom reports',
        'Priority support',
        'API access',
        'Custom integrations'
      ],
      cta: 'Upgrade to Pro',
      popular: false
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$299',
      period: 'month',
      description: 'For large organizations',
      icon: Building2,
      features: [
        'Everything in Pro',
        'Unlimited team members',
        'White-label branding',
        'SSO integration',
        'Custom domain',
        'Dedicated support',
        'SLA guarantee',
        'Custom training'
      ],
      cta: 'Upgrade to Enterprise',
      popular: false
    }
  ];

  const handlePlanSelect = async (planId: string) => {
    if (planId === 'free') return;

    // Handle lifetime plan selection
    if (planId === 'pro_lifetime') {
      if (!user) {
        localStorage.setItem('pendingPlan', planId);
        toast({
          title: "Authentication Required",
          description: "Please sign in to purchase the lifetime plan",
        });
        navigate(`/auth?plan=${planId}`);
        return;
      }
      setLoading(planId);
      try {
        await createCheckout(planId);
      } catch (error) {
        console.error('Error creating checkout:', error);
      } finally {
        setLoading(null);
      }
      return;
    }

    // Handle regular monthly plans
    if (!user) {
      localStorage.setItem('pendingPlan', planId);
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade your plan",
      });
      navigate(`/auth?plan=${planId}`);
      return;
    }

    setLoading(planId);
    try {
      await createCheckout(planId);
    } catch (error) {
      console.error('Error creating checkout:', error);
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planId: string) => {
    return plan_tier === planId;
  };

  return (
    <ModernBackground variant="mesh">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Choose Your <span className="text-primary">Growth Plan</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock your entrepreneurial potential with tools designed to discover, validate, and scale your business ideas.
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const current = isCurrentPlan(plan.id);
              const isLoading = loading === plan.id;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''} ${current ? 'bg-primary/5 border-primary' : ''}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                     <div className="text-3xl font-bold">
                        {plan.price}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{plan.period}
                        </span>
                      </div>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                      <Button
                      onClick={() => handlePlanSelect(plan.id)}
                      disabled={current || isLoading}
                      variant={plan.popular ? "hero" : current ? "outline" : "default"}
                      className="w-full"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </span>
                      ) : current ? (
                        "Current Plan"
                      ) : subscribed ? (
                        plan.cta
                      ) : (
                        `Start ${plan.name}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <LifetimePricingCard 
            onPurchase={handlePlanSelect}
            isCurrentPlan={isCurrentPlan}
            onContactSales={() => navigate('/contact')}
          />
        )}

        <div className="text-center">
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <span>✓ Cancel anytime</span>
            <span>✓ 30-day money-back guarantee</span>
            <span>✓ Secure payment processing</span>
          </div>
        </div>
      </div>
    </ModernBackground>
  );
};

export default Pricing;
