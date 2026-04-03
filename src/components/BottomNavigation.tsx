import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Search, Target, User, CreditCard } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  user: any;
}

export const BottomNavigation = ({ user }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Don't show on desktop or if not authenticated
  if (!isMobile || !user) {
    return null;
  }

  const navigationItems = [
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
    },
    { 
      label: "Profile", 
      icon: User, 
      path: "/profile", 
      isActive: location.pathname === "/profile" || location.pathname === "/subscription"
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            onClick={() => navigate(item.path)}
            className={cn(
              "flex flex-col items-center gap-1 h-12 min-w-[60px] px-2",
              item.isActive && "text-primary bg-primary/10"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};