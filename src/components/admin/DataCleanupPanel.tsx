import React, { useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const DataCleanupPanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmCleanup, setConfirmCleanup] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleCleanup = async () => {
    try {
      setIsLoading(true);
      setResult(null);

      console.log('Calling clean-user-data function...');
      
      const { data, error } = await supabase.functions.invoke('clean-user-data', {
        body: {}
      });

      if (error) {
        console.error('Function call error:', error);
        throw error;
      }

      console.log('Cleanup result:', data);
      setResult(data);

      if (data.success) {
        toast({
          title: "Cleanup Successful",
          description: `${data.result?.users_deleted || 'All'} users and associated data deleted.`,
        });
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }

    } catch (error: any) {
      console.error('Cleanup failed:', error);
      toast({
        variant: "destructive",
        title: "Cleanup Failed",
        description: error.message || 'An error occurred during cleanup.',
      });
    } finally {
      setIsLoading(false);
      setConfirmCleanup(false);
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Data Cleanup Panel
        </CardTitle>
        <CardDescription>
          Clean all user data for testing purposes. This action is irreversible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This will permanently delete all users, profiles, organizations, 
            business opportunities, subscriptions, and all associated data. This action cannot be undone.
          </AlertDescription>
        </Alert>

        {result && (
          <Alert className={result.success ? "border-green-500" : "border-destructive"}>
            <AlertDescription>
              {result.success 
                ? `✅ ${result.message}. Deleted ${result.result?.users_deleted || 0} users.`
                : `❌ ${result.error}`
              }
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          {!confirmCleanup ? (
            <Button
              variant="destructive"
              onClick={() => setConfirmCleanup(true)}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clean All User Data
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Are you absolutely sure? Type "CONFIRM" and click the button below:
              </p>
              <Button
                variant="destructive"
                onClick={handleCleanup}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Cleaning Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Yes, Delete Everything
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmCleanup(false)}
                disabled={isLoading}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>What will be deleted:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>All user accounts and profiles</li>
            <li>All organizations and workspaces</li>
            <li>All business opportunities and validation data</li>
            <li>All subscriptions and usage tracking</li>
            <li>All audit logs and security events</li>
            <li>All cached data and preferences</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataCleanupPanel;