
import { Button } from "@/components/ui/button";
import { Eye, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { SimpleBreadcrumb } from "./SimpleBreadcrumb";
import { ProfileNavigation } from "./ProfileNavigation";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SubscriptionStatus } from "./SubscriptionStatus";
import { MobileNavigation } from "./MobileNavigation";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

export const ModernNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentOrganization } = useWorkspace();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [progressItems, setProgressItems] = useState([
    { id: 'basic-info', label: 'Basic Information', completed: false },
    { id: 'skills', label: 'Skills & Experience', completed: false },
    { id: 'goals', label: 'Goals & Preferences', completed: false },
    { id: 'opportunities', label: 'Generated Opportunities', completed: false }
  ]);

  useEffect(() => {
    const checkUserProgress = async () => {
      if (user) {
        // Check user skills
        const { data: skills } = await supabase
          .from('user_skills')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);

        // Check user goals
        const { data: goals } = await supabase
          .from('user_goals')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);

        // Check opportunities in current organization
        const { data: opportunities } = await supabase
          .from('business_opportunities')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);

        setProgressItems([
          { id: 'basic-info', label: 'Basic Information', completed: !!user.email },
          { id: 'skills', label: 'Skills & Experience', completed: !!(skills && skills.length > 0) },
          { id: 'goals', label: 'Goals & Preferences', completed: !!(goals && goals.length > 0) },
          { id: 'opportunities', label: 'Generated Opportunities', completed: !!(opportunities && opportunities.length > 0) }
        ]);
      }
    };

    checkUserProgress();
  }, [user]);

  const isHomePage = location.pathname === '/';
  const showBreadcrumbs = !isHomePage && user;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-card backdrop-blur-glass border-b border-border/20">
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-card rounded-b-3xl transform translate-y-full"></div>
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Mobile Navigation */}
          <MobileNavigation user={user} progressItems={progressItems} />
          
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate("/")}
          >
            <img 
              src="/lovable-uploads/c10149ce-689c-4417-8b3b-777476f9a804.png" 
              alt="FounderLens" 
              className="w-8 h-8"
            />
            <span className={`font-bold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>
              FounderLens
            </span>
          </div>
          
          {/* Main Navigation - Simplified to Discovery → Opportunities → Build */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {/* Authenticated user navigation */}
                <Button 
                  variant={location.pathname === '/discovery' ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => navigate("/discovery")}
                  className="font-medium"
                >
                  Discovery
                </Button>
                <Button 
                  variant={location.pathname === '/opportunities' ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => navigate("/opportunities")}
                  className="font-medium"
                >
                  Opportunities
                </Button>
                <Button 
                  variant={location.pathname.startsWith('/build') ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => navigate("/build")}
                  className="font-medium"
                >
                  Build
                </Button>
                <Button 
                  variant={location.pathname === '/companies' ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => navigate("/companies")}
                  className="font-medium"
                >
                  🏢 AI Companies
                </Button>
              </>
            ) : null}
          </div>
          
          {/* Navigation Links - Only show on home page when not authenticated */}
          {isHomePage && !user && (
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-smooth">
                Features
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-smooth">
                Pricing
              </a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-smooth">
                About
              </a>
            </div>
          )}
          
          {/* Right Side */}
          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              <>
                {/* Profile Navigation with integrated progress */}
                <div className="hidden md:block">
                  <ProfileNavigation user={user} progressItems={progressItems} />
                </div>
                {/* Mobile profile button */}
                <div className="md:hidden">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => navigate("/profile")}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Guest Navigation */}
                <div className="hidden md:flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                    Sign In
                  </Button>
                  <Button variant="hero" size="sm" onClick={() => navigate("/guest-discovery")}>
                    Try Free Sample
                  </Button>
                </div>
                {/* Mobile guest button */}
                <div className="md:hidden">
                  <Button size="sm" onClick={() => navigate("/auth")}>
                    Sign In
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Breadcrumb row - Only show when authenticated and not on home page */}
        {showBreadcrumbs && (
          <div className="mt-2">
            <SimpleBreadcrumb />
          </div>
        )}
      </div>
    </nav>
  );
};
