import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle, Play, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function RedditTestPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const runRedditTest = async () => {
    setIsLoading(true);
    try {
      console.log('🔧 Running Reddit API connectivity test...');
      
      const { data, error } = await supabase.functions.invoke('reddit-test');
      
      if (error) {
        console.error('Reddit test error:', error);
        toast.error(`Reddit test failed: ${error.message}`);
        return;
      }

      console.log('✅ Reddit test completed:', data);
      setTestResults(data);

      if (data.success) {
        const passedTests = Object.values(data.tests).filter(Boolean).length;
        const totalTests = Object.keys(data.tests).length;
        
        if (passedTests === totalTests) {
          toast.success('All Reddit tests passed! Integration should work correctly.');
        } else {
          toast.warning(`${passedTests}/${totalTests} tests passed. Check results for details.`);
        }
      } else {
        toast.error('Reddit tests failed. Check the results for troubleshooting steps.');
      }

    } catch (error) {
      console.error('Unexpected error running Reddit test:', error);
      toast.error('Failed to run Reddit test');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean, label: string) => {
    return (
      <Badge variant={status ? "default" : "destructive"} className="gap-1">
        {getStatusIcon(status)}
        {label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Reddit API Integration Test
        </CardTitle>
        <CardDescription>
          Test your Reddit API connection and authentication to ensure market validation works properly.
          Make sure you have set up your Reddit API credentials in Supabase secrets first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runRedditTest}
          disabled={isLoading}
          className="w-full"
        >
          <Play className="h-4 w-4 mr-2" />
          {isLoading ? 'Running Tests...' : 'Run Reddit Test'}
        </Button>

        {testResults && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              {testResults.tests && Object.entries(testResults.tests).map(([test, passed]) => (
                <div key={test} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm font-medium">{test.replace(/([A-Z])/g, ' $1').trim()}</span>
                  {getStatusBadge(passed as boolean, passed ? 'Pass' : 'Fail')}
                </div>
              ))}
            </div>

            {testResults.recommendations && testResults.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {testResults.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-sm text-muted-foreground pl-4 border-l-2 border-blue-200">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {testResults.subredditAccess && (
              <div className="p-3 bg-muted rounded">
                <h4 className="font-medium mb-2">Subreddit Access</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Accessible Subreddits:</strong> {testResults.subredditAccess.accessible?.length || 0}</div>
                  <div><strong>Test Search Results:</strong> {testResults.subredditAccess.searchResults || 0} posts</div>
                </div>
              </div>
            )}

            {testResults.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Error Details</h4>
                    <p className="text-sm text-red-700 mt-1">{testResults.error}</p>
                    {testResults.errorDetail && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-600 cursor-pointer">Technical Details</summary>
                        <pre className="text-xs bg-red-100 p-2 rounded mt-1 overflow-auto">
                          {testResults.errorDetail}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}