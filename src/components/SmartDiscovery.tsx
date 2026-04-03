
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, ChevronRight, ChevronLeft, Target, Users, Sparkles, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { logger } from "@/utils/logger";

interface QuickAnswers {
  frustration: string;
  skills: string;
  timeCommitment: string;
}

// Predefined options for dropdowns
const skillsOptions = [
  "Writing & Communication",
  "Technology & Programming", 
  "Design & Creative",
  "Sales & Marketing",
  "Finance & Analysis",
  "Project Management",
  "Teaching & Training",
  "Problem Solving",
  "Customer Service",
  "Research & Analysis",
  "Social Media & Content",
  "Operations & Organization",
  "Custom (specify below)"
];

const timeCommitmentOptions = [
  "1-5 hours per week (Side hustle)",
  "5-15 hours per week (Part-time)",
  "15-25 hours per week (Serious side business)",
  "25-40 hours per week (Nearly full-time)",
  "40+ hours per week (Full-time commitment)",
  "Weekends only",
  "Evenings only (after work)",
  "Flexible schedule",
  "Custom (specify below)"
];

interface SmartDiscoveryProps {
  onOpportunitiesGenerated: (opportunities: any[], answers: QuickAnswers) => void;
  initialAnswers?: QuickAnswers | null;
  contextualIdea?: string;
}

const SmartDiscovery = ({ onOpportunitiesGenerated, initialAnswers, contextualIdea }: SmartDiscoveryProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuickAnswers>(() => {
    const baseAnswers = {
      frustration: initialAnswers?.frustration || "",
      skills: initialAnswers?.skills || "",
      timeCommitment: initialAnswers?.timeCommitment || ""
    };
    
    if (contextualIdea && !initialAnswers?.frustration) {
      baseAnswers.frustration = contextualIdea;
    }
    
    return baseAnswers;
  });
  const [customInputs, setCustomInputs] = useState({
    skills: "",
    timeCommitment: ""
  });
  const [showCustomInput, setShowCustomInput] = useState({
    skills: false,
    timeCommitment: false
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [showGenerationPreview, setShowGenerationPreview] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentOrganization } = useWorkspace();

  useEffect(() => {
    if (initialAnswers) {
      setAnswers({
        frustration: initialAnswers.frustration || "",
        skills: initialAnswers.skills || "",
        timeCommitment: initialAnswers.timeCommitment || ""
      });
    }
  }, [initialAnswers]);

  const questions = useMemo(() => [
    {
      id: "frustration",
      title: contextualIdea ? "Let's explore this idea further" : "What's your biggest daily frustration?",
      subtitle: contextualIdea 
        ? "Tell us more about this area of interest and what problems you see"
        : "Problems you face often become the best business opportunities",
      placeholder: contextualIdea 
        ? "e.g., Current solutions are too expensive, hard to use, or missing key features..."
        : "e.g., scheduling meetings, finding reliable contractors, managing emails...",
      icon: contextualIdea ? Sparkles : Target
    },
    {
      id: "skills",
      title: "What are you surprisingly good at?",
      subtitle: "Your unique skills are your competitive advantage",
      placeholder: "e.g., explaining complex things simply, organizing events, coding...",
      icon: Brain
    },
    {
      id: "timeCommitment",
      title: "How much time can you commit weekly?",
      subtitle: "This helps us match opportunities to your availability",
      placeholder: "e.g., 5-10 hours, weekends only, full-time...",
      icon: Clock
    }
  ], [contextualIdea]);

  const handleAnswerChange = useCallback((value: string) => {
    const currentQuestionId = questions[currentStep].id as keyof QuickAnswers;
    setAnswers(prev => ({ ...prev, [currentQuestionId]: value }));
  }, [questions, currentStep]);

  const handleDropdownChange = useCallback((value: string, field: 'skills' | 'timeCommitment') => {
    if (value === "Custom (specify below)") {
      setShowCustomInput(prev => ({ ...prev, [field]: true }));
      setAnswers(prev => ({ ...prev, [field]: customInputs[field] || "" }));
    } else {
      setShowCustomInput(prev => ({ ...prev, [field]: false }));
      setAnswers(prev => ({ ...prev, [field]: value }));
    }
  }, [customInputs]);

  const handleCustomInputChange = useCallback((value: string, field: 'skills' | 'timeCommitment') => {
    setCustomInputs(prev => ({ ...prev, [field]: value }));
    setAnswers(prev => ({ ...prev, [field]: value }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowGenerationPreview(true);
      setTimeout(() => generateOpportunities(), 1000);
    }
  }, [currentStep, questions.length]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const generateOpportunities = useCallback(async () => {
    if (!user) {
      logger.error('No user found for opportunity generation');
      return;
    }
    
    setIsGenerating(true);
    setGenerationProgress(0);
    setShowGenerationPreview(false);
    
    const progressSteps = [
      { step: 'Analyzing your answers...', progress: 20 },
      { step: 'Researching market opportunities...', progress: 40 },
      { step: 'Validating with community data...', progress: 60 },
      { step: 'Generating personalized opportunities...', progress: 80 },
      { step: 'Finalizing recommendations...', progress: 100 }
    ];

    let currentProgressIndex = 0;
    const progressInterval = setInterval(() => {
      if (currentProgressIndex < progressSteps.length) {
        const current = progressSteps[currentProgressIndex];
        setGenerationStep(current.step);
        setGenerationProgress(current.progress);
        currentProgressIndex++;
      }
    }, 1500);

    try {
      const { data, error } = await supabase.functions.invoke('generate-opportunities', {
        body: {
          answers: {
            frustration: answers.frustration,
            skills: answers.skills,
            timeCommitment: answers.timeCommitment,
          },
          contextualIdea: contextualIdea || undefined,
          count: 3,
          user_id: user?.id,
          organization_id: currentOrganization?.id,
          isGuestMode: false,
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      clearInterval(progressInterval);

      if (error) {
        logger.error('Generation error:', error);
        
        // Check for specific error types instead of assuming monthly limit
        if (error.message?.includes('Monthly opportunity limit reached') || 
            error.message?.includes('Feature limit reached')) {
          throw new Error('Monthly opportunity limit reached');
        } else if (error.message?.includes('Edge Function returned a non-2xx status code')) {
          throw new Error('Service temporarily unavailable. Please try again.');
        }
        
        throw error;
      }

      if (data.opportunities) {
        setGenerationProgress(100);
        setGenerationStep('Complete!');
        onOpportunitiesGenerated(data.opportunities, answers);
        
        // Show generation summary with deduplication info
        const { insertedCount = 0, updatedAsDuplicateCount = 0, skippedDuplicates = [] } = data;
        let description = `Created ${data.opportunities.length} opportunities`;
        
        if (insertedCount > 0) description += ` • ${insertedCount} new`;
        if (updatedAsDuplicateCount > 0) description += ` • ${updatedAsDuplicateCount} enhanced`;
        if (skippedDuplicates.length > 0) description += ` • ${skippedDuplicates.length} duplicates skipped`;
        
        toast({
          title: "🎉 Opportunities Generated!",
          description,
        });
        
        if (user?.id) {
          try {
            localStorage.setItem(`hasGeneratedOpportunities_${user.id}`, 'true');
          } catch (error) {
            logger.error('Error saving generation flag:', error);
          }
        }
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      logger.error('Error generating opportunities:', error);
      
      if (error.message?.includes('Monthly opportunity limit reached') || 
          error.message?.includes('Feature limit reached')) {
        toast({
          title: "Monthly Limit Reached",
          description: "You've reached your monthly opportunity limit. Upgrade your plan to generate more.",
          variant: "destructive",
        });
      } else if (error.message?.includes('Service temporarily unavailable')) {
        toast({
          title: "Service Temporarily Unavailable",
          description: "Our generation service is temporarily unavailable. Please try again in a moment.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Generation Failed",
          description: error.message || "Unable to generate opportunities. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [user, answers, contextualIdea, currentOrganization?.id, onOpportunitiesGenerated, toast]);

  // Show generation preview
  if (showGenerationPreview) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Ready to Generate Your Opportunities</CardTitle>
            <CardDescription>
              We'll create 3 personalized business opportunities based on your answers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Problem Focus:</span>
                <span className="text-sm text-muted-foreground">{answers.frustration.substring(0, 50)}...</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Your Skills:</span>
                <span className="text-sm text-muted-foreground">{answers.skills.substring(0, 50)}...</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Time Available:</span>
                <span className="text-sm text-muted-foreground">{answers.timeCommitment}</span>
              </div>
            </div>
            
            <div className="text-center pt-4">
              <div className="animate-pulse">
                <Brain className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Starting generation in 1 second...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show generation progress
  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Generating Your Opportunities</CardTitle>
            <CardDescription>
              Creating 3 personalized business opportunities with market validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center">
              <Brain className="w-16 h-16 text-primary animate-pulse" />
            </div>
            
            <div className="space-y-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {generationStep}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                {generationProgress}% complete
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const IconComponent = currentQuestion.icon;
  const canContinue = answers[currentQuestion.id as keyof QuickAnswers].trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        {questions.map((_, index) => (
          <div key={index} className="flex items-center">
            <button
              onClick={() => setCurrentStep(index)}
              disabled={index > currentStep}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors cursor-pointer ${
                index <= currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {index + 1}
            </button>
            {index < questions.length - 1 && (
              <div className={`w-16 h-1 mx-2 transition-colors ${
                index < currentStep ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Question Card */}
      <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <IconComponent className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">{currentQuestion.title}</CardTitle>
          <CardDescription className="text-base">
            {currentQuestion.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Conditional Input Based on Question Type */}
          {currentQuestion.id === 'frustration' ? (
            <Input
              placeholder={currentQuestion.placeholder}
              value={answers[currentQuestion.id as keyof QuickAnswers]}
              onChange={(e) => handleAnswerChange(e.target.value)}
              className="text-lg p-4 h-auto"
            />
          ) : (
            <div className="space-y-4">
              <Select
                value={showCustomInput[currentQuestion.id as 'skills' | 'timeCommitment'] ? "Custom (specify below)" : answers[currentQuestion.id as keyof QuickAnswers]}
                onValueChange={(value) => handleDropdownChange(value, currentQuestion.id as 'skills' | 'timeCommitment')}
              >
                <SelectTrigger className="text-lg p-4 h-auto">
                  <SelectValue placeholder={`Select your ${currentQuestion.id === 'skills' ? 'main skill area' : 'time commitment'}...`} />
                </SelectTrigger>
                <SelectContent>
                  {(currentQuestion.id === 'skills' ? skillsOptions : timeCommitmentOptions).map((option) => (
                    <SelectItem key={option} value={option} className="text-base py-3">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Custom Input Field */}
              {showCustomInput[currentQuestion.id as 'skills' | 'timeCommitment'] && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Please specify:
                  </label>
                  <Input
                    placeholder={currentQuestion.placeholder}
                    value={customInputs[currentQuestion.id as 'skills' | 'timeCommitment']}
                    onChange={(e) => handleCustomInputChange(e.target.value, currentQuestion.id as 'skills' | 'timeCommitment')}
                    className="text-lg p-4 h-auto"
                  />
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            {currentStep > 0 && (
              <Button 
                variant="outline"
                onClick={previousStep}
                className="flex-1 h-12"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Previous
              </Button>
            )}
            
            <Button 
              onClick={nextStep}
              disabled={!canContinue || isGenerating}
              className={`h-12 text-lg ${currentStep === 0 ? 'flex-1' : 'flex-1'}`}
            >
              {currentStep === questions.length - 1 ? (
                <>
                  <Target className="w-5 h-5 mr-2" />
                  Generate 3 Opportunities
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="text-center">
            <Badge variant="outline">
              Step {currentStep + 1} of {questions.length}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartDiscovery;
