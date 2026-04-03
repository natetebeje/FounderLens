import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity, Plus, UserCheck, Target } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface WorkspaceActivityItem {
  id: string;
  activity_type: string;
  activity_data: any;
  created_at: string;
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export const WorkspaceActivity = () => {
  const [activities, setActivities] = useState<WorkspaceActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentOrganization } = useWorkspace();

  useEffect(() => {
    if (!currentOrganization) return;

    const loadActivities = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('workspace_activities')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        // Get profiles for each activity
        const userIds = data?.map(a => a.user_id) || [];
        if (userIds.length === 0) {
          setActivities([]);
          return;
        }

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        // Combine activities with profiles
        const activitiesWithProfiles = data?.map(activity => ({
          ...activity,
          profiles: profilesData?.find(p => p.user_id === activity.user_id) || null
        })) || [];

        setActivities(activitiesWithProfiles);
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivities();
  }, [currentOrganization]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'opportunity_created':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'opportunity_assigned':
        return <Target className="w-4 h-4 text-blue-500" />;
      case 'member_joined':
        return <UserCheck className="w-4 h-4 text-purple-500" />;
      case 'task_assigned':
        return <Target className="w-4 h-4 text-orange-500" />;
      case 'task_comment':
        return <Activity className="w-4 h-4 text-blue-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityMessage = (activity: WorkspaceActivityItem) => {
    const userName = activity.profiles?.first_name 
      ? `${activity.profiles.first_name} ${activity.profiles.last_name || ''}`.trim()
      : 'Someone';

    switch (activity.activity_type) {
      case 'opportunity_created':
        return `${userName} created opportunity "${activity.activity_data.opportunity_title}"`;
      case 'opportunity_assigned':
        return `${userName} assigned opportunity "${activity.activity_data.opportunity_title}"`;
      case 'member_joined':
        return `${userName} joined the workspace as ${activity.activity_data.role}`;
      case 'task_assigned':
        return `${userName} assigned task "${activity.activity_data.task_title}"`;
      case 'task_comment':
        return `${userName} commented on "${activity.activity_data.task_title}"`;
      default:
        return `${userName} performed an action`;
    }
  };

  const getUserInitials = (activity: WorkspaceActivityItem) => {
    const firstName = activity.profiles?.first_name || '';
    const lastName = activity.profiles?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  if (!currentOrganization) return null;

  return (
    <Card className="w-80">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="w-5 h-5" />
          Workspace Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded animate-pulse" />
                  <div className="h-2 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity in this workspace.
          </p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {getUserInitials(activity)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {getActivityIcon(activity.activity_type)}
                  <p className="text-sm text-foreground">
                    {getActivityMessage(activity)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};