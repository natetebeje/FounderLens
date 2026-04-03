import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Play, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface QueueStats {
  pending: number;
  processing: number;
  posted: number;
  failed: number;
  total: number;
}

export const QueueMonitor = () => {
  const [stats, setStats] = useState<QueueStats>({ pending: 0, processing: 0, posted: 0, failed: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_content_queue')
        .select('status');

      if (error) throw error;

      const stats = {
        pending: data?.filter(item => item.status === 'pending').length || 0,
        processing: data?.filter(item => item.status === 'processing').length || 0,
        posted: data?.filter(item => item.status === 'posted').length || 0,
        failed: data?.filter(item => item.status === 'failed').length || 0,
        total: data?.length || 0
      };

      setStats(stats);
    } catch (error: any) {
      console.error('Error loading queue stats:', error);
      toast({
        title: "Error",
        description: "Failed to load queue statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('queue-processor');

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Queue Processed",
        description: `Processed ${data.processed} items. Check the results below.`
      });

      // Reload stats after processing
      await loadStats();
    } catch (error: any) {
      console.error('Error processing queue:', error);
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Set up real-time subscription for queue updates
    const subscription = supabase
      .channel('queue-monitor')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'marketing_content_queue' },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getStatIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'posted': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'processing': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'posted': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'failed': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Queue Monitor...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Queue Monitor
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={processQueue}
              disabled={isProcessing || stats.pending === 0}
              size="sm"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Process Queue
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(stats).map(([status, count]) => (
            <div key={status} className="text-center">
              <Badge
                variant="outline"
                className={`w-full justify-center gap-2 py-2 ${getStatColor(status)}`}
              >
                {getStatIcon(status)}
                <span className="capitalize">{status}</span>
              </Badge>
              <div className="text-2xl font-bold mt-2">{count}</div>
            </div>
          ))}
        </div>

        {stats.pending > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">
                {stats.pending} items pending processing
              </span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Click "Process Queue" to publish pending content to social platforms.
            </p>
          </div>
        )}

        {stats.failed > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="h-4 w-4" />
              <span className="font-medium">
                {stats.failed} items failed
              </span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              Some items failed to publish. Check the Content Scheduler for details and retry options.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};