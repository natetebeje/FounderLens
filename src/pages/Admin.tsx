
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import { Shield, Users, Settings, Activity, RefreshCw, AlertTriangle } from "lucide-react";
import { AdminErrorBoundary } from "@/components/admin/AdminErrorBoundary";
import { AdminLoadingSkeleton } from "@/components/admin/AdminLoadingSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { useAdminData } from "@/hooks/useAdminData";
import { validateData, userUpdateSchema } from "@/utils/adminValidation";
import { FinancialDashboard } from "@/components/admin/FinancialDashboard";
import { CustomerLifecycleManager } from "@/components/admin/CustomerLifecycleManager";
import { UserJourneyAnalytics } from "@/components/admin/UserJourneyAnalytics";
import { FeatureAdoptionMetrics } from "@/components/admin/FeatureAdoptionMetrics";
import { SystemOperationsControl } from "@/components/admin/SystemOperationsControl";
import { AdvancedAnalytics } from "@/components/admin/AdvancedAnalytics";
import { SecurityDashboard } from "@/components/admin/SecurityDashboard";
import { PerformanceMonitoring } from "@/components/admin/PerformanceMonitoring";
import { CommunicationCenter } from "@/components/admin/CommunicationCenter";
import DataCleanupPanel from "@/components/admin/DataCleanupPanel";
import { UserSessionManager } from "@/components/admin/UserSessionManager";
import MarketingAutomationDashboard from "@/components/MarketingAutomationDashboard";
import { QueueMonitor } from "@/components/QueueMonitor";
import ZapierContentAutomation from "@/components/ZapierContentAutomation";

import { RedditTestPanel } from "@/components/RedditTestPanel";

interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
  email_verified: boolean;
  created_at: string;
}

interface SystemMetrics {
  total_users: number;
  total_organizations: number;
  total_opportunities: number;
  total_validations: number;
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());

  // Use the new admin data hook for metrics
  const {
    data: metrics,
    loading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useAdminData<SystemMetrics>(
    async () => {
      const [usersCount, orgsCount, oppsCount, validationsCount] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("business_opportunities").select("*", { count: "exact", head: true }),
        supabase.from("validation_tasks").select("*", { count: "exact", head: true }),
      ]);

      return {
        total_users: usersCount.count || 0,
        total_organizations: orgsCount.count || 0,
        total_opportunities: oppsCount.count || 0,
        total_validations: validationsCount.count || 0,
      };
    },
    {
      cacheKey: 'admin-metrics',
      refetchInterval: 60000, // 1 minute
      timeout: 5000, // 5 second timeout
      onError: (error) => {
        console.error('Failed to load admin metrics:', error);
      }
    }
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      checkAdminAccess();
    }
  }, [user, authLoading, navigate]);

  const checkAdminAccess = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      if (!data.is_admin) {
        toast({
          title: "Access Denied",
          description: "You don't have admin permissions.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      
      setIsAdmin(true);
      await loadUsers();
    } catch (error: any) {
      console.error("Error checking admin access:", error);
      toast({
        title: "Error",
        description: "Failed to verify admin access",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          user_id,
          first_name,
          last_name,
          is_admin,
          email_verified,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Get email addresses from auth metadata with better error handling
      const usersWithEmails = await Promise.all(
        data.map(async (profile) => {
          try {
            const { data: authData } = await supabase.auth.admin.getUserById(profile.user_id);
            return {
              id: profile.user_id,
              email: authData.user?.email || "Unknown",
              first_name: profile.first_name,
              last_name: profile.last_name,
              is_admin: profile.is_admin,
              email_verified: profile.email_verified,
              created_at: profile.created_at,
            };
          } catch (authError) {
            console.error(`Failed to get auth data for user ${profile.user_id}:`, authError);
            return {
              id: profile.user_id,
              email: "Error loading email",
              first_name: profile.first_name,
              last_name: profile.last_name,
              is_admin: profile.is_admin,
              email_verified: profile.email_verified,
              created_at: profile.created_at,
            };
          }
        })
      );
      
      setUsers(usersWithEmails);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const toggleAdminStatus = async (userId: string, isCurrentlyAdmin: boolean) => {
    // Prevent self-demotion
    if (userId === user?.id && isCurrentlyAdmin) {
      toast({
        title: "Cannot Remove Own Admin Status",
        description: "You cannot remove your own admin privileges.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingUsers(prev => new Set(prev).add(userId));
    
    try {
      // Validate the update data
      const updateData = { is_admin: !isCurrentlyAdmin };
      const validation = validateData(userUpdateSchema.partial(), updateData);
      
      if (!validation.success) {
        throw new Error((validation as { errors: string[] }).errors.join(', '));
      }

      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: !isCurrentlyAdmin })
        .eq("user_id", userId);

      if (error) throw error;
      
      // Log admin action
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user!.id,
        action_type: isCurrentlyAdmin ? "remove_admin" : "grant_admin",
        target_user_id: userId,
        action_details: { previous_status: isCurrentlyAdmin },
      });
      
      await loadUsers();
      toast({
        title: "Success",
        description: `Admin status ${isCurrentlyAdmin ? "removed" : "granted"} successfully.`,
      });
    } catch (error: any) {
      console.error("Error updating admin status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update admin status",
        variant: "destructive",
      });
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      loadUsers(),
      refetchMetrics()
    ]);
    toast({
      title: "Data Refreshed",
      description: "All admin data has been refreshed successfully."
    });
  };

  if (authLoading || loading) {
    return <AdminLoadingSkeleton type="dashboard" />;
  }

  if (!isAdmin) {
    return (
      <AdminEmptyState
        icon={Shield}
        title="Access Denied"
        description="You don't have admin permissions to access this panel."
        action={{
          label: "Go Back",
          onClick: () => navigate("/")
        }}
      />
    );
  }

  return (
    <AdminErrorBoundary>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Control Center
            </h1>
            <p className="text-muted-foreground">Complete operational control and business intelligence</p>
          </div>
          <Button onClick={handleRefreshAll} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh All
          </Button>
        </div>

        {/* Metrics Overview */}
        {metricsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded animate-pulse mb-2" />
                  <div className="h-3 bg-muted rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : metricsError ? (
          <Card className="mb-6 border-destructive">
            <CardContent className="flex items-center gap-2 p-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">Failed to load metrics: {metricsError.message}</span>
              <Button size="sm" variant="outline" onClick={refetchMetrics}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.total_users || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.total_organizations || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.total_opportunities || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Validations</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.total_validations || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="financial" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
          </TabsList>

          <TabsContent value="financial">
            <AdminErrorBoundary>
              <FinancialDashboard />
            </AdminErrorBoundary>
          </TabsContent>

          <TabsContent value="analytics">
            <Tabs defaultValue="business" className="space-y-4">
              <TabsList>
                <TabsTrigger value="business">Business Intelligence</TabsTrigger>
                <TabsTrigger value="users">User Analytics</TabsTrigger>
                <TabsTrigger value="features">Feature Adoption</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
              <TabsContent value="business">
                <AdminErrorBoundary>
                  <AdvancedAnalytics />
                </AdminErrorBoundary>
              </TabsContent>
              <TabsContent value="users">
                <AdminErrorBoundary>
                  <UserJourneyAnalytics />
                </AdminErrorBoundary>
              </TabsContent>
              <TabsContent value="features">
                <AdminErrorBoundary>
                  <FeatureAdoptionMetrics />
                </AdminErrorBoundary>
              </TabsContent>
              <TabsContent value="performance">
                <AdminErrorBoundary>
                  <PerformanceMonitoring />
                </AdminErrorBoundary>
              </TabsContent>
              <TabsContent value="security">
                <AdminErrorBoundary>
                  <SecurityDashboard />
                </AdminErrorBoundary>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="system">
            <Tabs defaultValue="operations" className="space-y-4">
              <TabsList>
                <TabsTrigger value="operations">Operations</TabsTrigger>
                
                <TabsTrigger value="reddit">Reddit Test</TabsTrigger>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="sessions">Session Manager</TabsTrigger>
                <TabsTrigger value="customers">Customer Health</TabsTrigger>
                <TabsTrigger value="cleanup">Data Cleanup</TabsTrigger>
              </TabsList>
              <TabsContent value="operations">
                <AdminErrorBoundary>
                  <SystemOperationsControl />
                </AdminErrorBoundary>
              </TabsContent>
              

              <TabsContent value="reddit">
                <AdminErrorBoundary>
                  <RedditTestPanel />
                </AdminErrorBoundary>
              </TabsContent>
              
              <TabsContent value="users">
                <AdminErrorBoundary>
                  <Card>
                    <CardHeader>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>Manage user accounts and admin permissions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {users.length === 0 ? (
                        <AdminEmptyState
                          icon={Users}
                          title="No Users Found"
                          description="No user accounts are currently available to manage."
                          action={{
                            label: "Refresh",
                            onClick: loadUsers
                          }}
                        />
                      ) : (
                        <div className="space-y-4">
                          {users.map((adminUser) => (
                            <div key={adminUser.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {adminUser.first_name && adminUser.last_name
                                      ? `${adminUser.first_name} ${adminUser.last_name}`
                                      : adminUser.email}
                                  </p>
                                  {adminUser.is_admin && <Badge variant="secondary">Admin</Badge>}
                                  {adminUser.email_verified && <Badge variant="outline" className="text-green-600">Verified</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">{adminUser.email}</p>
                                <p className="text-xs text-muted-foreground">
                                  Joined {new Date(adminUser.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={adminUser.is_admin}
                                  onCheckedChange={() => toggleAdminStatus(adminUser.id, adminUser.is_admin)}
                                  disabled={adminUser.id === user?.id || updatingUsers.has(adminUser.id)}
                                />
                                <span className="text-sm">Admin</span>
                                {updatingUsers.has(adminUser.id) && (
                                  <div className="ml-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </AdminErrorBoundary>
              </TabsContent>
              
              <TabsContent value="sessions">
                <AdminErrorBoundary>
                  <UserSessionManager />
                </AdminErrorBoundary>
              </TabsContent>
              <TabsContent value="customers">
                <AdminErrorBoundary>
                  <CustomerLifecycleManager />
                </AdminErrorBoundary>
              </TabsContent>
              <TabsContent value="cleanup">
                <AdminErrorBoundary>
                  <DataCleanupPanel />
                </AdminErrorBoundary>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="marketing">
            <Tabs defaultValue="automation" className="space-y-4">
              <TabsList>
                <TabsTrigger value="automation">Automation</TabsTrigger>
                <TabsTrigger value="zapier">Zapier Publishing</TabsTrigger>
                <TabsTrigger value="queue">Queue Monitor</TabsTrigger>
              </TabsList>
              <TabsContent value="automation">
                <AdminErrorBoundary>
                  <MarketingAutomationDashboard />
                </AdminErrorBoundary>
              </TabsContent>
              <TabsContent value="zapier">
                <AdminErrorBoundary>
                  <ZapierContentAutomation />
                </AdminErrorBoundary>
              </TabsContent>
              <TabsContent value="queue">
                <AdminErrorBoundary>
                  <QueueMonitor />
                </AdminErrorBoundary>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="communication">
            <AdminErrorBoundary>
              <CommunicationCenter />
            </AdminErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </AdminErrorBoundary>
  );
};

export default Admin;
