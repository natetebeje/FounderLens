
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, Target, Crown, Lightbulb, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import SmartDiscovery from "@/components/SmartDiscovery";
import { useAuth } from "@/hooks/useAuth";
import { trackGuestEvent } from "@/utils/guestAnalytics";
import { transferGuestOpportunities } from "@/utils/guestOpportunityTransfer";
import { AdminDebugPanel } from "@/components/AdminDebugPanel";
import { ModernBackground } from "@/components/ui/modern-background";

interface SmartDiscoveryAnswers {
  frustration: string;
  skills: string;
  timeCommitment: string;
}

// Helper functions for user-specific localStorage
const getUserSpecificKey = (userId: string, key: string) => {
  return `${key}_${userId}`;
};

const getUserSpecificStorage = (userId: string, key: string) => {
  try {
    const item = localStorage.getItem(getUserSpecificKey(userId, key));
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
};

const setUserSpecificStorage = (userId: string, key: string, value: any) => {
  try {
    localStorage.setItem(getUserSpecificKey(userId, key), JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const Discovery = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrganization, isLoading: workspaceLoading } = useWorkspace();
  const { user } = useAuth();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>('');
  const [contextualIdea, setContextualIdea] = useState<string>('');
  const [lastSmartDiscoveryAnswers, setLastSmartDiscoveryAnswers] = useState<SmartDiscoveryAnswers | null>(null);
  const { toast } = useToast();
  const { canUseFeature, usage, limits, getRemainingUsage } = useFeatureGating(currentOrganization?.id);

  // Initialize user-specific discovery answers
  useEffect(() => {
    if (user?.id) {
      const savedAnswers = getUserSpecificStorage(user.id, 'smartDiscoveryAnswers');
      setLastSmartDiscoveryAnswers(savedAnswers);
    } else {
      setLastSmartDiscoveryAnswers(null);
    }
  }, [user?.id]);

  const handleSmartDiscoveryComplete = async (newOpportunities: any[], answers: SmartDiscoveryAnswers) => {
    if (user?.id) {
      setLastSmartDiscoveryAnswers(answers);
      setUserSpecificStorage(user.id, 'smartDiscoveryAnswers', answers);
    }
    
    const totalCount = newOpportunities.length;
    
    toast({
      title: "🎉 Opportunities Discovered!",
      description: `Generated ${totalCount} personalized business opportunities with market validation!`,
    });

    // Small delay to show the toast, then redirect
    setTimeout(() => {
      navigate("/opportunities");
    }, 1500);
  };

  useEffect(() => {
    const checkUserAndIntent = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Handle contextual idea from URL params or discovery intent
      const ideaFromUrl = searchParams.get('idea');
      const savedIntent = localStorage.getItem('discovery_intent');
      
      if (ideaFromUrl) {
        setContextualIdea(ideaFromUrl);
      } else if (savedIntent) {
        try {
          const intent = JSON.parse(savedIntent);
          if (intent.idea) {
            setContextualIdea(intent.idea);
          }
        } catch (e) {
          console.error('Error parsing discovery intent:', e);
        }
        localStorage.removeItem('discovery_intent');
      }

      // Check if user came from guest mode and needs transfer
      const pendingTransfer = localStorage.getItem('pendingGuestTransfer');
      const guestOpportunities = localStorage.getItem('guestOpportunities');
      const guestAnswers = localStorage.getItem('guestAnswers');
      
      if (pendingTransfer && (guestOpportunities || guestAnswers)) {
        // Clear the pending flag immediately
        localStorage.removeItem('pendingGuestTransfer');
        
        // Attempt transfer with retry logic for organization loading
        const attemptTransfer = async (retryCount = 0) => {
          if (!currentOrganization?.id && retryCount < 10) {
            // Wait and retry if organization not loaded yet
            setTimeout(() => attemptTransfer(retryCount + 1), 500);
            return;
          }
          
          if (!currentOrganization?.id) {
            toast({
              title: "Transfer Error",
              description: "Unable to load workspace. Please try generating new opportunities.",
              variant: "destructive",
            });
            return;
          }

          try {
            if (guestOpportunities) {
              // Show toast that we're saving their opportunities
              toast({
                title: "🚀 Saving Your 3 Opportunities",
                description: "Transferring your opportunities to your account...",
              });

              // Transfer guest opportunities to user's account
              const result = await transferGuestOpportunities(user.id, currentOrganization.id);
              
              if (result.success) {
                toast({
                  title: "✅ Opportunities Saved!",
                  description: `${result.opportunitiesTransferred} opportunities saved to your account. You have 6 more opportunities remaining on the free plan.`,
                });

                // Redirect to opportunities page to show the saved opportunities
                setTimeout(() => {
                  navigate("/opportunities");
                }, 2000);
              } else {
                console.error('Failed to transfer opportunities:', result.error);
                toast({
                  title: "Transfer Failed",
                  description: "We couldn't save your opportunities. Please try generating new ones.",
                  variant: "destructive",
                });
              }
            } else if (guestAnswers) {
              // Just transfer answers for smart discovery
              toast({
                title: "Welcome back!",
                description: "Your previous answers are ready for discovery.",
              });
              localStorage.setItem('useGuestAnswers', 'true');
            }
          } catch (error) {
            console.error('Error transferring guest data:', error);
            toast({
              title: "Transfer Error",
              description: "Something went wrong saving your data.",
              variant: "destructive",
            });
          }
        };
        
        attemptTransfer();
      }
    };
    checkUserAndIntent();
  }, [navigate, searchParams, toast, currentOrganization?.id]);

  const checkFeatureLimit = (feature: string) => {
    if (!canUseFeature(feature as any)) {
      setUpgradeFeature(feature);
      setShowUpgradePrompt(true);
      return false;
    }
    return true;
  };

  const opportunitiesRemaining = getRemainingUsage('opportunities');

  // Show loading state while workspace is loading
  if (workspaceLoading) {
    return (
      <ModernBackground variant="mesh" className="flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </ModernBackground>
    );
  }

  return (
    <ModernBackground variant="mesh">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="space-y-12">
          <div className="text-center space-y-6">
            <Badge variant="outline" className="px-4 py-2">
              <Zap className="w-4 h-4 mr-2" />
              {lastSmartDiscoveryAnswers ? "Update Your Discovery" : "Smart Discovery"}
            </Badge>
            
            {/* Show contextual idea if present */}
            {contextualIdea && !lastSmartDiscoveryAnswers && (
              <div className="max-w-2xl mx-auto">
                <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium">We'll explore this idea:</p>
                        <p className="text-sm text-muted-foreground">"{contextualIdea}"</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <h2 className="text-4xl font-bold">
              {lastSmartDiscoveryAnswers ? "Update Your " : "Discover Your "}
              <span className="text-gradient-primary">Perfect</span> Business Opportunity
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              {lastSmartDiscoveryAnswers 
                ? "Modify your previous answers to generate fresh, personalized business opportunities."
                : contextualIdea
                  ? "Answer 3 quick questions to turn your idea into 3 structured business opportunities."
                  : "Answer 3 quick questions and get 3 personalized business opportunities with market validation in under 60 seconds."
              }
            </p>
            
            {/* Usage indicators */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              {opportunitiesRemaining !== null && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>{opportunitiesRemaining} opportunities remaining</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span>Quality-focused generation</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Community validated</span>
              </div>
            </div>
            
            {lastSmartDiscoveryAnswers && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/opportunities")}
                  className="gap-2"
                >
                  <Target className="w-4 h-4" />
                  View Existing Opportunities
                </Button>
                <span className="text-muted-foreground">or</span>
                <span className="text-sm text-muted-foreground">Update answers below ↓</span>
              </div>
            )}
          </div>

          {/* Feature Gate Check */}
          {!canUseFeature('opportunities') ? (
            <Card className="bg-gradient-card backdrop-blur-glass border-border/50 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Upgrade Required
                </CardTitle>
                <CardDescription>
                  You've reached your plan's limit for opportunity generation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => {
                    setUpgradeFeature('opportunities');
                    setShowUpgradePrompt(true);
                  }}
                  className="w-full gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade to Generate More
                </Button>
              </CardContent>
            </Card>
          ) : (
            <SmartDiscovery 
              onOpportunitiesGenerated={handleSmartDiscoveryComplete} 
              initialAnswers={lastSmartDiscoveryAnswers}
              contextualIdea={contextualIdea}
            />
          )}
        </div>
        
        {/* Admin Debug Panel */}
        <AdminDebugPanel />
      </div>

      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        featureName={upgradeFeature}
        currentUsage={usage[upgradeFeature as keyof typeof usage] || 0}
        limit={limits[upgradeFeature as keyof typeof limits] || 0}
      />
    </ModernBackground>
  );
};

export default Discovery;
