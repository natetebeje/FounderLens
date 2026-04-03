import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { LIFETIME_PLANS } from "@/utils/constants";

interface LifetimePricingCardProps {
  onPurchase: (planTier: string) => void;
  isCurrentPlan: (planTier: string) => boolean;
  onContactSales: () => void;
}

export const LifetimePricingCard = ({ 
  onPurchase, 
  isCurrentPlan, 
  onContactSales 
}: LifetimePricingCardProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {/* Free Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Free</CardTitle>
          <div className="flex items-baseline">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-muted-foreground ml-1">forever</span>
          </div>
          <p className="text-muted-foreground">Perfect for getting started</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">9 opportunities</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">5 AI generations</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">Basic validation tools</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            variant="outline"
            disabled={isCurrentPlan('free')}
          >
            {isCurrentPlan('free') ? "Current Plan" : "Get Started"}
          </Button>
        </CardFooter>
      </Card>

      {/* Professional Lifetime */}
      <Card className="relative ring-2 ring-primary">
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
            Best Value
          </span>
        </div>
        <CardHeader>
          <CardTitle className="text-2xl">Professional Lifetime</CardTitle>
          <div className="flex items-baseline">
            <span className="text-4xl font-bold">${LIFETIME_PLANS.pro_lifetime.price}</span>
            <span className="text-muted-foreground ml-1">one-time</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="line-through">${LIFETIME_PLANS.pro_lifetime.originalMonthlyPrice}/month</span>
            <span className="ml-2 text-primary font-medium">
              Save {Math.round((1 - LIFETIME_PLANS.pro_lifetime.price / (LIFETIME_PLANS.pro_lifetime.originalMonthlyPrice * 12 * 10)) * 100)}%
            </span>
          </div>
          <p className="text-muted-foreground">{LIFETIME_PLANS.pro_lifetime.description}</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">Unlimited opportunities</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">1,000 AI generations/month</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">10 team members</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">50GB storage</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">API access (10K calls/month)</span>
            </li>
          </ul>
          
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Lifetime includes:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• All future core updates</li>
              <li>• Email support</li>
              <li>• One-time payment, no recurring fees</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => onPurchase('pro_lifetime')}
            disabled={isCurrentPlan('pro_lifetime')}
          >
            {isCurrentPlan('pro_lifetime') ? "Current Plan" : "Get Lifetime Access"}
          </Button>
        </CardFooter>
      </Card>

      {/* Enterprise (contact) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Enterprise</CardTitle>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold">Custom</span>
          </div>
          <p className="text-muted-foreground">For large teams and custom needs</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">Everything in Professional</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">Unlimited team members</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">Priority support</span>
            </li>
            <li className="flex items-center">
              <Check className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
              <span className="text-sm">Custom integrations</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            variant="outline"
            onClick={onContactSales}
          >
            Contact Sales
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};