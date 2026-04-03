
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Users, Target, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const OnboardingOptimizer = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['onboarding-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .in('metric_name', ['user_registration', 'onboarding_completion', 'first_opportunity_created', 'time_to_first_value'])
        .order('recorded_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    }
  });

  const getMetricValue = (metricName: string) => {
    const metric = metrics?.find(m => m.metric_name === metricName);
    return metric?.metric_value || 0;
  };

  const completionRate = metrics?.length > 0 ? getMetricValue('onboarding_completion') : 0;
  const avgTimeToValue = metrics?.length > 0 ? getMetricValue('time_to_first_value') : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Onboarding Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Onboarding Optimization
          </CardTitle>
          <CardDescription>
            Track and optimize your user onboarding experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No onboarding data available yet.</p>
            <p className="text-sm mt-2">Data will appear as users complete onboarding.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Onboarding Optimization
        </CardTitle>
        <CardDescription>
          Current onboarding performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{Math.round(completionRate)}%</span>
            </div>
            <p className="text-sm text-muted-foreground">Completion Rate</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{Math.round(avgTimeToValue / 60)}m</span>
            </div>
            <p className="text-sm text-muted-foreground">Avg. Time to Value</p>
          </div>
        </div>

        {completionRate < 70 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/40">
                Optimization Opportunity
              </Badge>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Onboarding completion rate is below optimal. Consider simplifying the initial steps.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OnboardingOptimizer;
