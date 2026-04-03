
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProgressIndicator } from "./ProgressIndicator";
import { SimpleBreadcrumb } from "./SimpleBreadcrumb";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Navigation = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [progressItems, setProgressItems] = useState([
    { id: 'basic-info', label: 'Basic Information', completed: false },
    { id: 'skills', label: 'Skills & Experience', completed: false },
    { id: 'goals', label: 'Goals & Preferences', completed: false },
    { id: 'opportunities', label: 'Generated Opportunities', completed: false }
  ]);

  useEffect(() => {
    const checkUserProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
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

        // Check opportunities
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
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-card backdrop-blur-glass border-b border-border/20">
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-card rounded-b-3xl transform translate-y-full"></div>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/c10149ce-689c-4417-8b3b-777476f9a804.png" 
              alt="FounderLens" 
              className="w-8 h-8"
            />
            <span className="text-xl font-bold text-foreground">FounderLens</span>
          </div>
          
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
          
          <div className="flex items-center gap-3">
            {user && (
              <ProgressIndicator items={progressItems} />
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              {user ? "Dashboard" : "Sign In"}
            </Button>
            <Button variant="hero" size="sm" onClick={() => navigate(user ? "/discovery" : "/guest-discovery")}>
              {user ? "Discovery" : "Try Free Sample"}
            </Button>
          </div>
        </div>
        
        {/* Breadcrumb row */}
        <div className="mt-2">
          <SimpleBreadcrumb />
        </div>
      </div>
    </nav>
  );
};
