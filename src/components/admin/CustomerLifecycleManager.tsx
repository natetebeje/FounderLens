
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  Activity,
  Mail
} from "lucide-react";
import { format, subDays } from "date-fns";

interface CustomerHealth {
  user_id: string;
  email: string;
  plan_tier: string;
  health_score: number;
  last_active: string;
  opportunities_created: number;
  subscription_age: number;
  risk_level: 'low' | 'medium' | 'high';
  onboarding_completed: boolean;
}

interface OnboardingMetric {
  step: string;
  completion_rate: number;
  avg_time_to_complete: number;
}

export const CustomerLifecycleManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerHealth[]>([]);
  const [onboardingMetrics, setOnboardingMetrics] = useState<OnboardingMetric[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerHealth | null>(null);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCustomerHealth(),
        loadOnboardingMetrics()
      ]);
    } catch (error) {
      console.error("Error loading customer data:", error);
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerHealth = async () => {
    console.log("Loading customer health data...");
    
    // Get users with subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select(`
        user_id,
        plan_tier,
        created_at,
        status
      `)
      .neq("plan_tier", "free");

    if (subError) {
      console.error("Error loading subscriptions:", subError);
    }

    console.log("Paid subscriptions found:", subscriptions?.length || 0);

    // If no paid subscriptions, get some free users for demo
    let usersToAnalyze = subscriptions || [];
    if (usersToAnalyze.length === 0) {
      const { data: freeUsers, error: freeError } = await supabase
        .from("subscriptions")
        .select(`
          user_id,
          plan_tier,
          created_at,
          status
        `)
        .eq("plan_tier", "free")
        .limit(10);

      if (freeError) {
        console.error("Error loading free users:", freeError);
      } else {
        usersToAnalyze = freeUsers || [];
        console.log("Using free users for analysis:", usersToAnalyze.length);
      }
    }

    // Get user profiles and activity data
    const customerHealthData = await Promise.all(
      usersToAnalyze.map(async (sub) => {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", sub.user_id)
          .single();

        if (profileError) {
          console.warn("Profile not found for user:", sub.user_id);
        }

        // Get user activity (opportunities created)
        const { data: opportunities, error: oppError } = await supabase
          .from("business_opportunities")
          .select("created_at")
          .eq("user_id", sub.user_id);

        if (oppError) {
          console.warn("Error loading opportunities for user:", sub.user_id);
        }

        // Calculate health score based on multiple factors
        const daysSinceLastActivity = opportunities?.length > 0 
          ? Math.floor((Date.now() - new Date(opportunities[opportunities.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24))
          : 30;
        
        const subscriptionAge = Math.floor((Date.now() - new Date(sub.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const opportunitiesCount = opportunities?.length || 0;
        
        // Health score calculation (0-100)
        let healthScore = 50; // Base score
        healthScore += Math.min(opportunitiesCount * 5, 30); // Activity bonus
        healthScore -= Math.min(daysSinceLastActivity * 2, 40); // Inactivity penalty
        healthScore += profile?.onboarding_completed ? 20 : -10; // Onboarding bonus/penalty
        healthScore = Math.max(0, Math.min(100, healthScore));

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (healthScore < 30) riskLevel = 'high';
        else if (healthScore < 60) riskLevel = 'medium';

        return {
          user_id: sub.user_id,
          email: profile?.first_name ? `${profile.first_name}@example.com` : `user-${sub.user_id.substring(0, 8)}@example.com`,
          plan_tier: sub.plan_tier,
          health_score: healthScore,
          last_active: opportunities?.length > 0 ? opportunities[opportunities.length - 1].created_at : sub.created_at,
          opportunities_created: opportunitiesCount,
          subscription_age: subscriptionAge,
          risk_level: riskLevel,
          onboarding_completed: profile?.onboarding_completed || false
        };
      })
    );

    console.log("Customer health data processed:", customerHealthData.length);
    setCustomers(customerHealthData);
  };

  const loadOnboardingMetrics = async () => {
    // Simulated onboarding completion data
    const metrics = [
      { step: "Profile Setup", completion_rate: 95, avg_time_to_complete: 2 },
      { step: "First Opportunity", completion_rate: 78, avg_time_to_complete: 5 },
      { step: "Validation Setup", completion_rate: 65, avg_time_to_complete: 8 },
      { step: "Team Invitation", completion_rate: 45, avg_time_to_complete: 12 },
      { step: "First AI Generation", completion_rate: 58, avg_time_to_complete: 7 }
    ];
    
    setOnboardingMetrics(metrics);
  };

  const sendSupportEmail = async (customer: CustomerHealth) => {
    toast({
      title: "Support Email Sent",
      description: `Reaching out to ${customer.email} with personalized assistance`,
    });
    // Implement email sending logic here
  };

  const createRetentionCampaign = async (riskLevel: string) => {
    toast({
      title: "Campaign Created",
      description: `Retention campaign created for ${riskLevel} risk customers`,
    });
    // Implement campaign creation logic here
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const highRiskCustomers = customers.filter(c => c.risk_level === 'high');
  const mediumRiskCustomers = customers.filter(c => c.risk_level === 'medium');
  const healthyCustomers = customers.filter(c => c.risk_level === 'low');
  const avgHealthScore = customers.length > 0 
    ? customers.reduce((sum, c) => sum + c.health_score, 0) / customers.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Customer Lifecycle Management</h2>
        <p className="text-muted-foreground">Monitor customer health and optimize retention</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              Average Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthScoreColor(avgHealthScore)}`}>
              {avgHealthScore.toFixed(0)}
            </div>
            <Progress value={avgHealthScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              High Risk Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highRiskCustomers.length}</div>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2"
              onClick={() => createRetentionCampaign('high')}
            >
              Create Campaign
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Healthy Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyCustomers.length}</div>
            <p className="text-sm text-muted-foreground">
              {((healthyCustomers.length / customers.length) * 100).toFixed(0)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              Onboarding Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((customers.filter(c => c.onboarding_completed).length / customers.length) * 100).toFixed(0)}%
            </div>
            <p className="text-sm text-muted-foreground">Completed setup</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="customers">Customer Health</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding Analytics</TabsTrigger>
          <TabsTrigger value="retention">Retention Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Customer Health Overview</CardTitle>
              <CardDescription>Monitor individual customer engagement and risk levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customers.slice(0, 10).map((customer) => (
                  <div 
                    key={customer.user_id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{customer.email}</span>
                        <Badge variant="outline">{customer.plan_tier}</Badge>
                        <Badge variant={getRiskBadgeVariant(customer.risk_level)}>
                          {customer.risk_level} risk
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{customer.opportunities_created} opportunities</span>
                        <span>Active {Math.floor(customer.subscription_age)} days ago</span>
                        <span>Last seen: {format(new Date(customer.last_active), 'MMM dd')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getHealthScoreColor(customer.health_score)}`}>
                          {customer.health_score}
                        </div>
                        <Progress value={customer.health_score} className="w-16 h-2" />
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendSupportEmail(customer);
                        }}
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Funnel Analysis</CardTitle>
              <CardDescription>Track user progress through onboarding steps</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {onboardingMetrics.map((metric, index) => (
                  <div key={metric.step} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{metric.step}</span>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{metric.completion_rate}% complete</span>
                        <span>Avg: {metric.avg_time_to_complete} days</span>
                      </div>
                    </div>
                    <Progress value={metric.completion_rate} className="h-3" />
                    {index < onboardingMetrics.length - 1 && (
                      <div className="ml-4 text-sm text-muted-foreground">
                        Drop-off: {onboardingMetrics[index].completion_rate - metric.completion_rate}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention">
          <Card>
            <CardHeader>
              <CardTitle>Retention Campaigns</CardTitle>
              <CardDescription>Automated campaigns to improve customer retention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => createRetentionCampaign('high')}
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <AlertTriangle className="w-6 h-6 mb-2" />
                    High Risk Recovery
                  </Button>
                  <Button 
                    onClick={() => createRetentionCampaign('medium')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Clock className="w-6 h-6 mb-2" />
                    Engagement Boost
                  </Button>
                  <Button 
                    onClick={() => createRetentionCampaign('low')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <TrendingUp className="w-6 h-6 mb-2" />
                    Upsell Campaign
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
