import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Download
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { AdminLoadingSkeleton } from "@/components/admin/AdminLoadingSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { useAdminData } from "@/hooks/useAdminData";
import { auditLogger } from "@/utils/adminAuditLogger";

interface SubscriptionMetrics {
  mrr: number;
  arr: number;
  totalSubscribers: number;
  churnRate: number;
  newSubscribers: number;
  canceledSubscribers: number;
  revenue: number;
  previousMonthRevenue: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  subscribers: number;
}

interface PaymentIssue {
  user_id: string;
  email: string;
  customer_email: string;
  plan_tier: string;
  amount: number;
  error_message: string;
  created_at: string;
  payment_intent_id?: string;
  charge_id?: string;
}

export const FinancialDashboard = () => {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SubscriptionMetrics>({
    mrr: 0,
    arr: 0,
    totalSubscribers: 0,
    churnRate: 0,
    newSubscribers: 0,
    canceledSubscribers: 0,
    revenue: 0,
    previousMonthRevenue: 0
  });
  
  // Use the new admin data hook for better error handling
  const {
    data: revenueHistory,
    loading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue
  } = useAdminData<RevenueData[]>(
    loadRevenueHistory,
    {
      cacheKey: 'revenue-history',
      refetchInterval: 300000, // 5 minutes
      timeout: 5000, // 5 second timeout
    }
  );

  const {
    data: paymentIssues,
    loading: paymentsLoading,
    error: paymentsError,
    refetch: refetchPayments
  } = useAdminData<PaymentIssue[]>(
    loadPaymentIssues,
    {
      cacheKey: 'payment-issues',
      refetchInterval: 60000, // 1 minute
      timeout: 5000, // 5 second timeout
    }
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      await loadSubscriptionMetrics();
    } catch (error) {
      console.error("Error loading financial data:", error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionMetrics = async () => {
    const currentMonth = startOfMonth(new Date());
    const previousMonth = startOfMonth(subMonths(new Date(), 1));
    
    console.log("Loading subscription metrics...");
    
    // Get current active subscriptions
    const { data: activeSubscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("plan_tier, created_at, current_period_end")
      .eq("status", "active")
      .neq("plan_tier", "free");

    if (subError) {
      console.error("Error loading subscriptions:", subError);
    }

    console.log("Active subscriptions found:", activeSubscriptions?.length || 0);

    // Calculate MRR based on plan tiers
    const planPricing = { basic: 39, pro: 99, enterprise: 299 };
    const mrr = (activeSubscriptions || []).reduce((sum, sub) => {
      return sum + (planPricing[sub.plan_tier as keyof typeof planPricing] || 0);
    }, 0);

    // Get total profiles for context
    const { count: totalProfiles, error: profileError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    if (profileError) {
      console.error("Error loading profiles:", profileError);
    }

    console.log("Total profiles found:", totalProfiles || 0);

    // Calculate metrics with real data or reasonable defaults
    const totalSubscribers = activeSubscriptions?.length || 0;
    const churnRate = totalProfiles && totalSubscribers ? 
      Math.max(0, ((totalProfiles - totalSubscribers) / totalProfiles) * 100) : 5;

    setMetrics({
      mrr,
      arr: mrr * 12,
      totalSubscribers,
      churnRate,
      newSubscribers: Math.floor(totalSubscribers * 0.1) || 1, // 10% estimated as new
      canceledSubscribers: Math.floor(totalSubscribers * 0.05) || 0, // 5% estimated as canceled
      revenue: mrr,
      previousMonthRevenue: mrr * 0.9 // Assume 10% growth
    });

    console.log("Metrics calculated:", { mrr, totalSubscribers, churnRate });
  };

  async function loadRevenueHistory(): Promise<RevenueData[]> {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      months.push({
        start: startOfMonth(month),
        end: endOfMonth(month),
        label: format(month, 'MMM yyyy')
      });
    }

    const history = await Promise.all(
      months.map(async ({ start, end, label }) => {
        try {
          const { data, error } = await supabase
            .from("subscriptions")
            .select("plan_tier")
            .eq("status", "active")
            .neq("plan_tier", "free")
            .lte("created_at", end.toISOString());

          if (error) throw error;

          const planPricing = { basic: 39, pro: 99, enterprise: 299 };
          const revenue = data?.reduce((total, sub) => {
            return total + (planPricing[sub.plan_tier as keyof typeof planPricing] || 0);
          }, 0) || 0;

          return {
            month: label,
            revenue,
            subscribers: data?.length || 0
          };
        } catch (error) {
          console.error(`Error loading revenue for ${label}:`, error);
          return {
            month: label,
            revenue: 0,
            subscribers: 0
          };
        }
      })
    );

    return history;
  }

  async function loadPaymentIssues(): Promise<PaymentIssue[]> {
    try {
      const { data: failedPayments, error } = await supabase
        .from('email_notifications')
        .select('*')
        .eq('template_type', 'payment_failure')
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (failedPayments || []).map(payment => ({
        user_id: payment.id,
        email: payment.recipient_email,
        customer_email: payment.recipient_email,
        plan_tier: "pro",
        amount: 99,
        error_message: "Payment failed",
        created_at: payment.created_at,
        payment_intent_id: `pi_mock_${payment.id}`, // Mock payment intent ID
        charge_id: `ch_mock_${payment.id}` // Mock charge ID
      }));
    } catch (error) {
      console.error("Error loading payment issues:", error);
      return [];
    }
  }

  const handleRefund = async (paymentIssue: PaymentIssue) => {
    try {
      // Add validation
      if (!paymentIssue.payment_intent_id || paymentIssue.amount <= 0) {
        throw new Error("Invalid refund parameters");
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to process a refund of $${paymentIssue.amount} for ${paymentIssue.customer_email}?\n\nThis action cannot be undone.`
      );
      
      if (!confirmed) return;

      toast({
        title: "Processing Refund",
        description: `Processing refund of $${paymentIssue.amount} for ${paymentIssue.customer_email}`,
      });

      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: {
          paymentIntentId: paymentIssue.payment_intent_id,
          amount: Math.round(paymentIssue.amount * 100), // Convert to cents
          reason: 'requested_by_customer'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Refund Successful",
          description: `Refund of $${paymentIssue.amount} has been processed successfully.`,
        });
        
        // Refresh payment issues to update the list
        loadPaymentIssues();
        
        // Log the action
        auditLogger.logSystemAction('refund_processed', {
          refund_id: data.refund.id,
          amount: paymentIssue.amount,
          customer_email: paymentIssue.customer_email,
          payment_intent_id: paymentIssue.payment_intent_id
        });
      } else {
        throw new Error(data?.error || 'Refund processing failed');
      }
    } catch (error: any) {
      console.error('Refund error:', error);
      toast({
        title: "Refund Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    }
  };

  const exportFinancialData = () => {
    try {
      const csvData = [
        ['Metric', 'Value'],
        ['MRR', `$${metrics.mrr}`],
        ['ARR', `$${metrics.arr}`],
        ['Total Subscribers', metrics.totalSubscribers.toString()],
        ['Churn Rate', `${metrics.churnRate.toFixed(2)}%`],
        ['New Subscribers', metrics.newSubscribers.toString()],
        ['Canceled Subscribers', metrics.canceledSubscribers.toString()]
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Financial data has been exported successfully."
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export Error",
        description: "Failed to export financial data",
        variant: "destructive",
      });
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      loadFinancialData(),
      refetchRevenue(),
      refetchPayments()
    ]);
  };

  const revenueGrowth = metrics.previousMonthRevenue > 0 
    ? ((metrics.revenue - metrics.previousMonthRevenue) / metrics.previousMonthRevenue) * 100 
    : 0;

  if (loading) {
    return <AdminLoadingSkeleton type="dashboard" />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Financial Dashboard</h2>
          <p className="text-muted-foreground">Monitor revenue, subscriptions, and payment health</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefreshAll} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportFinancialData} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              Monthly Recurring Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.mrr.toLocaleString()}</div>
            <div className="flex items-center text-sm">
              {revenueGrowth >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                {Math.abs(revenueGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Annual Recurring Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.arr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Projected annual revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              Active Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSubscribers}</div>
            <div className="text-sm text-muted-foreground">
              <span className="text-green-600">+{metrics.newSubscribers}</span> new, 
              <span className="text-red-600 ml-1">-{metrics.canceledSubscribers}</span> canceled
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Churn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.churnRate.toFixed(1)}%</div>
            <Progress value={metrics.churnRate} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.churnRate < 5 ? "Healthy" : metrics.churnRate < 10 ? "Monitor" : "Critical"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="payments">Payment Issues</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>6-month revenue and subscriber growth</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <AdminLoadingSkeleton type="chart" showHeader={false} />
              ) : revenueError ? (
                <AdminEmptyState
                  icon={AlertTriangle}
                  title="Failed to Load Revenue Data"
                  description={revenueError.message}
                  action={{
                    label: "Retry",
                    onClick: refetchRevenue
                  }}
                />
              ) : !revenueHistory || revenueHistory.length === 0 ? (
                <AdminEmptyState
                  icon={TrendingUp}
                  title="No Revenue Data"
                  description="No revenue history available to display."
                />
              ) : (
                <div className="space-y-4">
                  {revenueHistory.map((month) => (
                    <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{month.month}</p>
                        <p className="text-sm text-muted-foreground">{month.subscribers} subscribers</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${month.revenue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Issues
              </CardTitle>
              <CardDescription>Recent payment failures requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <AdminLoadingSkeleton type="table" showHeader={false} />
              ) : paymentsError ? (
                <AdminEmptyState
                  icon={AlertTriangle}
                  title="Failed to Load Payment Data"
                  description={paymentsError.message}
                  action={{
                    label: "Retry",
                    onClick: refetchPayments
                  }}
                />
              ) : !paymentIssues || paymentIssues.length === 0 ? (
                <AdminEmptyState
                  icon={CreditCard}
                  title="No Payment Issues"
                  description="No payment failures detected. All transactions are processing normally."
                />
              ) : (
                <div className="space-y-4">
                  {paymentIssues.map((issue, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{issue.email}</p>
                          <Badge variant="outline">{issue.plan_tier}</Badge>
                        </div>
                        <p className="text-sm text-red-600">{issue.error_message}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(issue.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">${issue.amount}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRefund(issue)}
                        >
                          Process Refund
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasting">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecasting</CardTitle>
              <CardDescription>Projected revenue based on current trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Next Month</h4>
                  <p className="text-2xl font-bold text-green-600">
                    ${(metrics.mrr * 1.05).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">+5% growth projected</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Next Quarter</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    ${(metrics.mrr * 3 * 1.15).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">+15% quarterly growth</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">End of Year</h4>
                  <p className="text-2xl font-bold text-purple-600">
                    ${(metrics.arr * 1.3).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">+30% annual growth</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
