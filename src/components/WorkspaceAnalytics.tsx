import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Target, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  organization_name: string;
  total_opportunities: number;
  completed_opportunities: number;
  in_progress_opportunities: number;
  total_members: number;
  total_activities: number;
  last_activity_at: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export const WorkspaceAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [opportunityTrends, setOpportunityTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentOrganization } = useWorkspace();

  useEffect(() => {
    if (currentOrganization) {
      loadAnalytics();
    }
  }, [currentOrganization]);

  const loadAnalytics = async () => {
    if (!currentOrganization) return;

    setLoading(true);
    try {
      // Load opportunities with error handling
      const { data: opportunities, error: oppError } = await supabase
        .from('business_opportunities')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      if (oppError) {
        console.error('Error loading opportunities:', oppError);
      }

      // Load members with error handling  
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganization.id);

      if (membersError) {
        console.error('Error loading members:', membersError);
      }

      // Load activities with error handling
      const { data: activities } = await supabase
        .from('workspace_activities')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      // Calculate analytics
      const analyticsData: AnalyticsData = {
        organization_name: currentOrganization.name,
        total_opportunities: opportunities?.length || 0,
        completed_opportunities: opportunities?.filter(o => o.validation_status === 'completed').length || 0,
        in_progress_opportunities: opportunities?.filter(o => o.validation_status === 'in_progress').length || 0,
        total_members: members?.length || 0,
        total_activities: activities?.length || 0,
        last_activity_at: activities?.[0]?.created_at || new Date().toISOString()
      };

      setAnalytics(analyticsData);

      // Load opportunity trends by status
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('business_opportunities')
        .select('validation_status, created_at')
        .eq('organization_id', currentOrganization.id);

      if (opportunitiesError) throw opportunitiesError;

      // Process trend data
      const statusCounts = opportunitiesData?.reduce((acc, opp) => {
        const status = opp.validation_status || 'not_started';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const trendData = Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count,
        count
      }));

      setOpportunityTrends(trendData);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentOrganization) return null;

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

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No analytics data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const completionRate = analytics.total_opportunities > 0 
    ? (analytics.completed_opportunities / analytics.total_opportunities) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Total Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_opportunities}</div>
            <p className="text-xs text-muted-foreground">
              Active opportunities in workspace
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.completed_opportunities}</div>
            <Progress value={completionRate} className="h-2 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {completionRate.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_members}</div>
            <p className="text-xs text-muted-foreground">
              Active workspace members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_activities}</div>
            <p className="text-xs text-muted-foreground">
              Total workspace activities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opportunity Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Opportunity Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {opportunityTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={opportunityTrends}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {opportunityTrends.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4">
              {opportunityTrends.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm">{entry.name}: {entry.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Completion Rate</span>
                <span>{completionRate.toFixed(1)}%</span>
              </div>
              <Progress value={completionRate} className="h-3" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>In Progress</span>
                <span>{analytics.in_progress_opportunities} opportunities</span>
              </div>
              <Progress 
                value={(analytics.in_progress_opportunities / analytics.total_opportunities) * 100} 
                className="h-2" 
              />
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Workspace Activity</h4>
              <p className="text-sm text-muted-foreground">
                {analytics.total_activities} total activities recorded
              </p>
              {analytics.last_activity_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last activity: {new Date(analytics.last_activity_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};