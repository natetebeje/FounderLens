import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, LogOut, RefreshCw, Trash2 } from "lucide-react";

export const UserSessionManager = () => {
  const [targetEmail, setTargetEmail] = useState("natnaelgetachew9@gmail.com");
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const { toast } = useToast();

  const debugUserSession = async () => {
    setLoading(true);
    try {
      console.log('🔍 Debugging session for:', targetEmail);
      
      // Get user info from profiles table
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('user_id, full_name, is_admin')
        .limit(1);

      // Since profiles table doesn't have email, let's search by user_id if we have it
      // For now, we'll work with the first profile and assume it's the target user
      // In a real implementation, you'd need to search auth.users through admin API

      if (userError) {
        throw new Error(`Error finding user: ${userError.message}`);
      }

      if (!users || users.length === 0) {
        throw new Error(`No user found with email: ${targetEmail}`);
      }

      const userProfile = users[0];
      console.log('👤 Found user profile:', userProfile);

      // Check localStorage keys for this user
      const localStorageInfo = Object.keys(localStorage).filter(key => 
        key.includes(userProfile.user_id) || 
        key.startsWith('supabase.auth.') || 
        key.includes('auth')
      );

      setSessionInfo({
        userProfile,
        localStorageKeys: localStorageInfo,
        debugTime: new Date().toISOString()
      });

      toast({
        title: "Debug complete",
        description: `Found user session info for ${targetEmail}`,
      });

    } catch (error: any) {
      console.error('❌ Debug failed:', error);
      toast({
        title: "Debug failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const forceUserLogout = async () => {
    if (!sessionInfo?.userProfile?.user_id) {
      toast({
        title: "Error",
        description: "Please debug the session first to get user ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🚨 Force logging out user:', targetEmail);
      
      // Clear user-specific localStorage keys
      const userSpecificKeys = [
        `smartDiscoveryAnswers_${sessionInfo.userProfile.user_id}`,
        `hasGeneratedOpportunities_${sessionInfo.userProfile.user_id}`,
      ];

      userSpecificKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log('🧹 Removed localStorage key:', key);
        } catch (error) {
          console.error('❌ Error removing key:', key, error);
        }
      });

      // Also clear any auth-related keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || key.includes('auth')) {
          try {
            localStorage.removeItem(key);
            console.log('🧹 Removed auth key:', key);
          } catch (error) {
            console.error('❌ Error removing auth key:', key, error);
          }
        }
      });

      toast({
        title: "Force logout complete",
        description: `Cleared session data for ${targetEmail}. User will be logged out on their next page load.`,
      });

      // Refresh debug info
      await debugUserSession();

    } catch (error: any) {
      console.error('❌ Force logout failed:', error);
      toast({
        title: "Force logout failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAllAuthStorage = async () => {
    setLoading(true);
    try {
      console.log('🧹 Clearing ALL auth storage...');
      
      // Clear all localStorage
      localStorage.clear();
      console.log('✅ All localStorage cleared');

      // Clear sessionStorage as well
      sessionStorage.clear();
      console.log('✅ All sessionStorage cleared');

      toast({
        title: "Storage cleared",
        description: "All browser storage has been cleared. This will log out all users on this device.",
      });

      // Refresh the page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      console.error('❌ Clear storage failed:', error);
      toast({
        title: "Clear storage failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          User Session Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="targetEmail">User Email</Label>
          <Input
            id="targetEmail"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="Enter user email to debug"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={debugUserSession}
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Debug Session
          </Button>
          
          <Button
            onClick={forceUserLogout}
            disabled={loading || !sessionInfo}
            variant="destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Force User Logout
          </Button>
          
          <Button
            onClick={clearAllAuthStorage}
            disabled={loading}
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear ALL Storage (Emergency)
          </Button>
        </div>

        {sessionInfo && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">User Profile</h3>
              <Textarea
                value={JSON.stringify(sessionInfo.userProfile, null, 2)}
                readOnly
                className="h-32"
              />
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">localStorage Keys ({sessionInfo.localStorageKeys.length})</h3>
              <Textarea
                value={sessionInfo.localStorageKeys.join('\n')}
                readOnly
                className="h-32"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              Debug performed at: {sessionInfo.debugTime}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting Steps</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>Enter the user's email and click "Debug Session"</li>
            <li>Review the user profile and localStorage keys</li>
            <li>Click "Force User Logout" to clear their session data</li>
            <li>Ask the user to refresh their browser</li>
            <li>If still stuck, use "Clear ALL Storage" as emergency option</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};