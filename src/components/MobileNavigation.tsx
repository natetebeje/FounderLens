import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, 
  Eye, 
  Target, 
  Search, 
  User, 
  Settings, 
  LogOut,
  ChevronRight,
  Home,
  BarChart3
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { SubscriptionStatus } from "./SubscriptionStatus";

interface MobileNavigationProps {
  user: any;
  progressItems: any[];
}

export const MobileNavigation = ({ user, progressItems }: MobileNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = user ? [
    { 
      label: "Discovery", 
      icon: Search, 
      path: "/discovery", 
      isActive: location.pathname === "/discovery" 
    },
    { 
      label: "Opportunities", 
      icon: Target, 
      path: "/opportunities", 
      isActive: location.pathname === "/opportunities"
    },
    { 
      label: "Build", 
      icon: Home, 
      path: "/build", 
      isActive: location.pathname.startsWith("/build") 
    }
  ] : [
    { 
      label: "Discovery", 
      icon: Search, 
      path: "/guest-discovery", 
      isActive: location.pathname.startsWith("/guest-discovery") 
    },
    { 
      label: "Opportunities", 
      icon: Target, 
      path: "/auth?redirect=/opportunities", 
      isActive: false 
    },
    { 
      label: "Build", 
      icon: Home, 
      path: "/build", 
      isActive: location.pathname.startsWith("/build") 
    }
  ];

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    if (path.startsWith("/#")) {
      // Handle anchor links
      const anchor = path.split("#")[1];
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(anchor);
        element?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      navigate(path);
    }
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await supabase.auth.signOut();
    navigate("/");
  };

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  const completedProgress = progressItems.filter(item => item.completed).length;
  const progressPercentage = Math.round((completedProgress / progressItems.length) * 100);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 md:hidden relative"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border/20">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/lovable-uploads/c10149ce-689c-4417-8b3b-777476f9a804.png" 
                alt="FounderLens" 
                className="w-10 h-10"
              />
              <div>
                <h2 className="text-lg font-bold text-foreground">FounderLens</h2>
                {user && (
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            {/* Progress indicator for authenticated users */}
            {user && progressItems.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Setup Progress</span>
                  <Badge variant="secondary" className="text-xs">
                    {progressPercentage}%
                  </Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedProgress} of {progressItems.length} steps completed
                </p>
              </div>
            )}

            {/* Subscription status for authenticated users */}
            {user && (
              <div className="mt-3">
                <SubscriptionStatus compact />
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <div className="flex-1 py-4">
            <nav className="space-y-1 px-3">
              {navigationItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors ${
                    item.isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </button>
              ))}
            </nav>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-border/20 p-4 space-y-3">
            {user ? (
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={() => handleNavigation("/auth")}
                  variant="outline"
                  className="w-full"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => handleNavigation("/auth")}
                  className="w-full"
                >
                  Start Discovery
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};