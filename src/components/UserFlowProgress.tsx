import { CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FlowStep {
  id: string;
  title: string;
  route: string;
  isCompleted: boolean;
  isActive: boolean;
}

export const UserFlowProgress = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasOpportunities, setHasOpportunities] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [hasBuildProgress, setHasBuildProgress] = useState(false);
  
  // Don't show on certain pages
  const hiddenRoutes = ['/auth', '/onboarding', '/pricing', '/about', '/contact', '/terms', '/privacy'];
  const isHidden = hiddenRoutes.some(route => location.pathname.startsWith(route));
  
  

  useEffect(() => {
    if (!user) return;
    
    const checkProgress = async () => {
      try {
        // Check if user has opportunities
        const { data: opportunities } = await supabase
          .from('business_opportunities')
          .select('id, validation_status')
          .limit(1);
        
        setHasOpportunities((opportunities?.length || 0) > 0);
        
        // Check if user has validated anything
        const hasValidatedOpp = opportunities?.some(opp => 
          opp.validation_status === 'completed' || opp.validation_status === 'in_progress'
        );
        setHasValidated(hasValidatedOpp || false);
        
        // Check if user has build progress (check for lesson progress or build track access)
        const { data: buildProgress } = await supabase
          .from('lesson_progress')
          .select('id')
          .limit(1);
        
        setHasBuildProgress((buildProgress?.length || 0) > 0);
      } catch (error) {
        console.error('Error checking user progress:', error);
      }
    };
    
    checkProgress();
  }, [user, location.pathname]);

  const steps: FlowStep[] = [
    {
      id: 'discover',
      title: 'Discover',
      route: '/opportunities',
      isCompleted: hasOpportunities,
      isActive: location.pathname.includes('/opportunities') || location.pathname.includes('/discovery')
    },
    {
      id: 'validate',
      title: 'Validate',
      route: '/opportunities',
      isCompleted: hasValidated,
      isActive: location.pathname.includes('/validation')
    },
    {
      id: 'build',
      title: 'Build',
      route: '/build',
      isCompleted: hasBuildProgress,
      isActive: location.pathname.includes('/build')
    },
    {
      id: 'launch',
      title: 'Launch',
      route: '/opportunities',
      isCompleted: false, // We'll track this later with launch activities
      isActive: location.pathname.includes('/launch') || location.pathname.includes('/go-to-market')
    }
  ];

  const completedSteps = steps.filter(step => step.isCompleted).length;
  const currentStep = steps.find(step => step.isActive);
  const progressPercentage = (completedSteps / steps.length) * 100;

  const handleStepClick = (step: FlowStep) => {
    if (step.id === 'discover' || step.id === 'validate') {
      navigate('/opportunities');
    } else if (step.id === 'build') {
      navigate('/build');
    } else if (step.id === 'launch') {
      navigate('/opportunities'); // Will eventually go to launch page
    }
  };

  if (isHidden || !user) return null;

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="hidden md:block text-sm font-medium text-muted-foreground">
              Your Progress
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStepClick(step)}
                    className={`flex items-center gap-2 h-8 px-2 md:px-3 ${
                      step.isActive 
                        ? 'bg-primary/10 text-primary' 
                        : step.isCompleted 
                        ? 'text-green-600 hover:text-green-700' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {step.isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Circle className={`w-4 h-4 ${step.isActive ? 'fill-current' : ''}`} />
                    )}
                    <span className="hidden sm:inline text-sm font-medium">
                      {step.title}
                    </span>
                  </Button>
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <Progress value={progressPercentage} className="w-20" />
              <span className="text-sm text-muted-foreground min-w-[3rem]">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            
            {currentStep && !currentStep.isCompleted && (
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Current: {currentStep.title}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};