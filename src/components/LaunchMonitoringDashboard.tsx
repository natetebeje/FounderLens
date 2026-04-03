
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle, ExternalLink, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LaunchMonitoringDashboard = () => {
  const { user } = useAuth();
  
  const { data: monitoringJobs, isLoading } = useQuery({
    queryKey: ['monitoring-jobs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('monitoring_jobs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  const { data: recentMetrics } = useQuery({
    queryKey: ['launch-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .in('metric_name', ['uptime', 'response_time', 'error_rate'])
        .order('recorded_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>;
      case 'paused':
        return <Badge variant="outline">Paused</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Launch Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!monitoringJobs || monitoringJobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Launch Monitoring
          </CardTitle>
          <CardDescription>
            Monitor your launches and track performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No monitoring jobs set up</h3>
            <p className="text-muted-foreground mb-4">
              Create monitoring jobs to track your launches and get alerts when issues occur.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Monitoring Job
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeJobs = monitoringJobs.filter(job => job.status === 'active').length;
  const errorJobs = monitoringJobs.filter(job => job.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Launch Monitoring
        </CardTitle>
        <CardDescription>
          {activeJobs} active jobs, {errorJobs} with issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xl font-bold">{activeJobs}</span>
            </div>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xl font-bold">{monitoringJobs.filter(j => j.status === 'paused').length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Paused</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xl font-bold">{errorJobs}</span>
            </div>
            <p className="text-xs text-muted-foreground">Errors</p>
          </div>
        </div>

        {/* Recent jobs */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Recent Jobs</h4>
          {monitoringJobs.slice(0, 3).map((job) => (
            <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium text-sm">{job.job_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.target_urls?.[0] || 'No URL configured'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(job.status)}
                <Button size="sm" variant="ghost">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {monitoringJobs.length > 3 && (
          <Button variant="outline" className="w-full">
            View All Jobs ({monitoringJobs.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default LaunchMonitoringDashboard;
