import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  Send, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Repeat,
  Eye
} from 'lucide-react';

interface QueueItem {
  id: string;
  content_id: string;
  platform: string;
  scheduled_time: string;
  status: 'pending' | 'processing' | 'posted' | 'failed';
  post_id?: string;
  error_message?: string;
  retry_count: number;
  created_at: string;
  marketing_content: {
    content: string;
    content_type: string;
    title?: string;
  };
}

interface SchedulerFormData {
  contentId: string;
  platform: string;
  scheduledDate: string;
  scheduledTime: string;
}

const ContentScheduler: React.FC = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [formData, setFormData] = useState<SchedulerFormData>({
    contentId: '',
    platform: 'twitter',
    scheduledDate: '',
    scheduledTime: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadQueue();
    // Set up real-time subscription for queue updates
    const subscription = supabase
      .channel('marketing_content_queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketing_content_queue' },
        () => {
          loadQueue();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_content_queue')
        .select(`
          *,
          marketing_content (
            content,
            content_type,
            title
          )
        `)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      
      // Process the data to ensure proper typing and handle missing marketing_content
      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as 'pending' | 'processing' | 'posted' | 'failed',
        marketing_content: item.marketing_content || {
          content: 'Content not found',
          content_type: 'unknown',
          title: 'Unknown'
        }
      })).filter(item => 
        // Only include items where marketing_content is properly structured
        item.marketing_content && 
        typeof item.marketing_content === 'object' && 
        'content' in item.marketing_content
      ) as QueueItem[];
      
      setQueue(typedData);
    } catch (error: any) {
      console.error('Error loading queue:', error);
      toast({
        title: "Error",
        description: "Failed to load content queue",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const scheduleContent = async () => {
    if (!formData.contentId || !formData.scheduledDate || !formData.scheduledTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setScheduling(true);
    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      const { data, error } = await supabase.functions.invoke('content-scheduler', {
        body: {
          contentId: formData.contentId,
          platform: formData.platform,
          scheduledTime: scheduledDateTime.toISOString()
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Content Scheduled!",
          description: `Content scheduled for ${formData.platform} at ${scheduledDateTime.toLocaleString()}`
        });
        
        // Reset form
        setFormData({
          contentId: '',
          platform: 'twitter',
          scheduledDate: '',
          scheduledTime: ''
        });
        
        // Reload queue
        loadQueue();
      } else {
        throw new Error(data.error || 'Scheduling failed');
      }
    } catch (error: any) {
      console.error('Error scheduling content:', error);
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule content",
        variant: "destructive"
      });
    } finally {
      setScheduling(false);
    }
  };

  const retryFailedPost = async (queueId: string, platform: string) => {
    try {
      const { error } = await supabase
        .from('marketing_content_queue')
        .update({
          status: 'pending',
          retry_count: 0,
          error_message: null,
          scheduled_time: new Date().toISOString()
        })
        .eq('id', queueId);

      if (error) throw error;

      toast({
        title: "Post Queued for Retry",
        description: `Content will be retried on ${platform}`
      });

      loadQueue();
    } catch (error: any) {
      console.error('Error retrying post:', error);
      toast({
        title: "Retry Failed",
        description: error.message || "Failed to retry post",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'pending':
        return { variant: 'outline' as const, icon: Clock, color: 'text-yellow-600' };
      case 'processing':
        return { variant: 'secondary' as const, icon: Loader2, color: 'text-blue-600' };
      case 'posted':
        return { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' };
      case 'failed':
        return { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' };
      default:
        return { variant: 'outline' as const, icon: AlertCircle, color: 'text-gray-600' };
    }
  };

  const getPlatformEmoji = (platform: string) => {
    switch (platform) {
      case 'twitter': return '🐦';
      case 'linkedin': return '💼';
      case 'reddit': return '🤖';
      default: return '📱';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading content scheduler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Content Scheduler</h2>
          <p className="text-muted-foreground">
            Schedule and manage content across social media platforms
          </p>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-primary/20">
          {queue.filter(q => q.status === 'pending').length} Pending
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scheduling Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule New Content
            </CardTitle>
            <CardDescription>
              Schedule content to be posted automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contentId">Content ID</Label>
              <Input
                id="contentId"
                value={formData.contentId}
                onChange={(e) => setFormData(prev => ({ ...prev, contentId: e.target.value }))}
                placeholder="Enter content ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={formData.platform} onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twitter">🐦 Twitter</SelectItem>
                  <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                  <SelectItem value="reddit">🤖 Reddit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Date</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Time</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                />
              </div>
            </div>

            <Button 
              onClick={scheduleContent}
              disabled={scheduling}
              className="w-full"
            >
              {scheduling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Schedule Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Queue Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Queue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Pending Posts</span>
                <Badge variant="outline">{queue.filter(q => q.status === 'pending').length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing</span>
                <Badge variant="secondary">{queue.filter(q => q.status === 'processing').length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Posted Today</span>
                <Badge variant="default">{queue.filter(q => q.status === 'posted' && new Date(q.created_at).toDateString() === new Date().toDateString()).length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Failed</span>
                <Badge variant="destructive">{queue.filter(q => q.status === 'failed').length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Content Queue</CardTitle>
          <CardDescription>
            Monitor and manage your scheduled content posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No content scheduled yet.</p>
              <p className="text-sm">Schedule your first post above to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((item) => {
                const statusProps = getStatusBadgeProps(item.status);
                const StatusIcon = statusProps.icon;
                
                return (
                  <div key={item.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getPlatformEmoji(item.platform)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={statusProps.variant} className="flex items-center gap-1">
                              <StatusIcon className={`w-3 h-3 ${statusProps.color}`} />
                              {item.status}
                            </Badge>
                            <span className="text-sm font-medium capitalize">{item.platform}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Scheduled: {new Date(item.scheduled_time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {item.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryFailedPost(item.id, item.platform)}
                          className="flex items-center gap-1"
                        >
                          <Repeat className="w-3 h-3" />
                          Retry
                        </Button>
                      )}
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded text-sm">
                      <p className="line-clamp-2">{item.marketing_content.content}</p>
                    </div>
                    
                    {item.error_message && (
                      <div className="bg-destructive/10 text-destructive p-3 rounded text-sm">
                        <p className="font-medium">Error:</p>
                        <p>{item.error_message}</p>
                        {item.retry_count > 0 && (
                          <p className="text-xs mt-1">Retry attempts: {item.retry_count}</p>
                        )}
                      </div>
                    )}
                    
                    {item.post_id && item.status === 'posted' && (
                      <div className="bg-green-50 text-green-700 p-3 rounded text-sm">
                        <p className="font-medium">✅ Successfully posted!</p>
                        <p className="text-xs">Post ID: {item.post_id}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentScheduler;
