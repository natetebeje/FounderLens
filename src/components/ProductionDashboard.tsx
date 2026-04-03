import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSystemHealth, useSystemMetrics } from '@/hooks/useSystemHealth';
import { 
  Activity, 
  Database, 
  Shield, 
  Zap, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

export const ProductionDashboard = () => {
  const { healthStatus, isLoading: healthLoading, refreshHealthCheck } = useSystemHealth();
  const { metrics, isLoading: metricsLoading } = useSystemMetrics();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshHealthCheck();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshHealthCheck]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'down': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      case 'down': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (healthLoading || metricsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading system status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Dashboard</h1>
          <p className="text-muted-foreground">Real-time system monitoring and metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-500' : 'text-gray-500'}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshHealthCheck}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${getStatusColor(healthStatus.status)}`}>
                {getStatusIcon(healthStatus.status)}
                System Status: {healthStatus.status.toUpperCase()}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  <span>Database</span>
                </div>
                <Badge variant={healthStatus.details.database === 'healthy' ? 'default' : 'destructive'}>
                  {healthStatus.details.database}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span>Authentication</span>
                </div>
                <Badge variant={healthStatus.details.auth === 'healthy' ? 'default' : 'destructive'}>
                  {healthStatus.details.auth}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  <span>Edge Functions</span>
                </div>
                <Badge variant={healthStatus.details.edge_functions === 'healthy' ? 'default' : 'destructive'}>
                  {healthStatus.details.edge_functions}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>Response Time</span>
                </div>
                <Badge variant={healthStatus.response_time < 1000 ? 'default' : 'secondary'}>
                  {healthStatus.response_time}ms
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.uptime}%</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.error_rate < 1 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.error_rate}%
              </div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.avg_response_time < 500 ? 'text-green-600' : 'text-yellow-600'}`}>
                {metrics.avg_response_time}ms
              </div>
              <p className="text-xs text-muted-foreground">Last hour</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.active_users.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Currently online</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto flex-col p-4">
              <Database className="w-8 h-8 mb-2" />
              <span className="font-medium">Database Backup</span>
              <span className="text-sm text-muted-foreground">Manual backup</span>
            </Button>
            
            <Button variant="outline" className="h-auto flex-col p-4">
              <Shield className="w-8 h-8 mb-2" />
              <span className="font-medium">Security Scan</span>
              <span className="text-sm text-muted-foreground">Run vulnerability check</span>
            </Button>
            
            <Button variant="outline" className="h-auto flex-col p-4">
              <TrendingUp className="w-8 h-8 mb-2" />
              <span className="font-medium">Performance Report</span>
              <span className="text-sm text-muted-foreground">Generate weekly report</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle>System Status History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Last updated: {healthStatus ? new Date(healthStatus.timestamp).toLocaleString() : 'N/A'}
          </div>
          {/* This would be a chart/timeline in production */}
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-center text-muted-foreground">
              Status history chart would be displayed here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};