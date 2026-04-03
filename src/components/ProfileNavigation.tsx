
import { useState } from "react";
import { LogOut, Settings, User as UserIcon, BarChart3, Users, CreditCard, Building, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CircularProgressAvatar } from "./CircularProgressAvatar";

interface ProgressItem {
  id: string;
  label: string;
  completed: boolean;
}

interface ProfileNavigationProps {
  user: any;
  progressItems: ProgressItem[];
  className?: string;
}

export const ProfileNavigation = ({ user, progressItems, className }: ProfileNavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscribed, plan_tier } = useSubscription();
  const { isAdmin, signOut, forceSignOut } = useAuth();
  const { isLoading: workspaceLoading } = useWorkspace();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    console.log('ProfileNavigation: Starting logout process');
    setIsSigningOut(true);
    
    // If workspace is loading, warn user but allow logout
    if (workspaceLoading) {
      console.warn('ProfileNavigation: Logout attempted while workspace loading');
      toast({
        title: "Workspace still loading",
        description: "Proceeding with logout anyway...",
      });
    }
    
    try {
      await signOut();
      console.log('ProfileNavigation: Logout successful');
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
      navigate("/");
    } catch (error: any) {
      console.error('ProfileNavigation: Logout failed:', error);
      
      // If workspace is loading and logout fails, offer force logout
      if (workspaceLoading) {
        toast({
          title: "Logout blocked by workspace loading",
          description: "Try using Force Logout below.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error signing out",
          description: error.message || "Failed to sign out. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSigningOut(false);
      console.log('ProfileNavigation: Logout process completed');
    }
  };

  const getDisplayName = () => {
    const { first_name, last_name } = user.user_metadata || {};
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    return user.email;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={`relative h-12 w-12 p-0 ${className}`}>
          <CircularProgressAvatar 
            user={user} 
            progressItems={progressItems}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getDisplayName()}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Core actions */}
        <DropdownMenuItem onClick={() => navigate("/subscription")} className="cursor-pointer">
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Subscription</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
          <UserIcon className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        {/* Secondary features - moved to profile menu */}
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate("/analytics")} className="cursor-pointer">
          <BarChart3 className="mr-2 h-4 w-4" />
          <span>Analytics</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => navigate("/team")} className="cursor-pointer">
          <Users className="mr-2 h-4 w-4" />
          <span>Team</span>
        </DropdownMenuItem>
        
        {subscribed && plan_tier === 'enterprise' && (
          <DropdownMenuItem onClick={() => navigate("/enterprise")} className="cursor-pointer">
            <Building className="mr-2 h-4 w-4" />
            <span>Enterprise</span>
          </DropdownMenuItem>
        )}
        
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            <span>Admin Panel</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Sign Out */}
        <DropdownMenuItem 
          onClick={handleSignOut} 
          className="cursor-pointer text-destructive focus:text-destructive"
          disabled={isSigningOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>
            {isSigningOut ? "Signing out..." : "Sign out"}
            {workspaceLoading && !isSigningOut && " (workspace loading)"}
          </span>
        </DropdownMenuItem>
        
        {/* Emergency force logout for stuck sessions - Admin only */}
        {isAdmin && (
          <DropdownMenuItem 
            onClick={async () => {
              console.log('🚨 Emergency force logout triggered');
              setIsSigningOut(true);
              try {
                await forceSignOut();
                toast({
                  title: "Force logout complete",
                  description: "Session has been forcefully terminated.",
                });
                navigate("/");
              } catch (error: any) {
                console.error('❌ Force logout failed:', error);
                toast({
                  title: "Force logout failed",
                  description: "Emergency logout failed. Please contact support.",
                  variant: "destructive",
                });
              } finally {
                setIsSigningOut(false);
              }
            }}
            disabled={isSigningOut}
            className="cursor-pointer text-orange-600 hover:text-orange-700 focus:text-orange-700 text-xs"
          >
            <LogOut className="mr-2 h-3 w-3" />
            <span>Force Logout (Emergency)</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
