import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, ChevronRight, Target, Sparkles, Eye, ArrowRight, Lock, Download, Users, BarChart3, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { trackGuestEvent } from "@/utils/guestAnalytics";
import { supabase } from "@/integrations/supabase/client";

interface GuestAnswers {
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

interface GuestDiscoveryProps {
  contextualIdea?: string;
}

export const GuestDiscovery = ({ contextualIdea }: GuestDiscoveryProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<GuestAnswers>({
    frustration: contextualIdea || "",
    skills: "",
    timeCommitment: ""
  });
  const [customInputs, setCustomInputs] = useState({
    skills: "",
    timeCommitment: ""
  });
  const [showCustomInput, setShowCustomInput] = useState({
    skills: false,
    timeCommitment: false
  });
  const [showOpportunities, setShowOpportunities] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOpportunities, setGeneratedOpportunities] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const questions = [
    {
      id: "frustration",
      title: contextualIdea ? "Let's explore this idea further" : "What's your biggest daily frustration?",
      subtitle: contextualIdea 
        ? "Tell us more about this area of interest"
        : "Problems you face often become the best business opportunities",
      placeholder: contextualIdea 
        ? "e.g., Current solutions are too expensive or hard to use..."
        : "e.g., scheduling meetings, finding reliable contractors...",
      icon: contextualIdea ? Sparkles : Target
    },
    {
      id: "skills",
      title: "What are you surprisingly good at?",
      subtitle: "Your unique skills are your competitive advantage",
      placeholder: "e.g., explaining complex things simply, organizing events...",
      icon: Brain
    },
    {
      id: "timeCommitment",
      title: "How much time can you commit weekly?",
      subtitle: "This helps us match opportunities to your availability",
      placeholder: "e.g., 5-10 hours, weekends only, full-time...",
      icon: Sparkles
    }
  ];

  // Generate unique guest session ID
  const generateGuestSessionId = () => {
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Generate 3 AI-powered opportunities based on answers
  const generateGuestOpportunities = useCallback(async () => {
    setIsGenerating(true);
    const guestSessionId = generateGuestSessionId();
    
    trackGuestEvent('guest_opportunities_generation_started', {
      answers: answers,
      completed_questions: questions.length,
      sessionId: guestSessionId
    });
    
    try {
      console.log('🎯 Calling real AI generation for guest user with session:', guestSessionId);
      
      // Call the actual generate-opportunities API in guest mode with enhanced data
      const { data, error } = await supabase.functions.invoke('generate-opportunities', {
        body: {
          isGuestMode: true,
          guestSessionId: guestSessionId,
          answers: answers,
          count: 3
        }
      });

      if (error) {
        console.error('Generation error:', error);
        throw new Error(error.message || 'Failed to generate opportunities');
      }

      if (!data?.success || !data?.opportunities) {
        throw new Error('Invalid response from opportunity generation');
      }

      const opportunities = data.opportunities.map((opp: any, index: number) => ({
        ...opp,
        id: index + 1 // Add simple ID for display
      }));

      console.log(`✅ Generated ${opportunities.length} real AI opportunities`);

      setGeneratedOpportunities(opportunities);
      setShowOpportunities(true);

      // Store opportunities in localStorage for potential signup
      localStorage.setItem('guestOpportunities', JSON.stringify(opportunities));
      localStorage.setItem('guestAnswers', JSON.stringify(answers));

      trackGuestEvent('guest_opportunities_generated', {
        opportunities_count: opportunities.length,
        answers: answers,
        ai_generated: true
      });

      toast({
        title: "🎉 3 AI-Generated Opportunities!",
        description: "Here are your personalized business opportunities based on real market research",
      });

    } catch (error) {
      console.error('Failed to generate opportunities:', error);
      
      toast({
        title: "Generation Failed",
        description: "Unable to generate opportunities. Please try again.",
        variant: "destructive",
      });
      
      setShowOpportunities(false);
    } finally {
      setIsGenerating(false);
    }
  }, [answers, toast]);

  const handleAnswerChange = useCallback((value: string) => {
    const currentQuestionId = questions[currentStep].id as keyof GuestAnswers;
    setAnswers(prev => ({ ...prev, [currentQuestionId]: value }));
  }, [currentStep]);

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
    trackGuestEvent('guest_question_answered', {
      step: currentStep + 1,
      question: questions[currentStep].id,
      answer_length: answers[questions[currentStep].id as keyof GuestAnswers].length
    });

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      generateGuestOpportunities();
    }
  }, [currentStep, generateGuestOpportunities, answers]);

  const handleSaveOpportunities = () => {
    trackGuestEvent('guest_conversion_attempt', {
      from_step: 'opportunities_view',
      opportunities_count: generatedOpportunities.length,
      answers_provided: Object.keys(answers).filter(key => answers[key as keyof GuestAnswers].trim().length > 0).length
    });
    
    navigate('/auth?upgrade=guest&opportunities=3');
  };

  const AdvancedFeatureButton = ({ icon: Icon, label, description }: { icon: any, label: string, description: string }) => (
    <Button
      variant="outline"
      onClick={handleSaveOpportunities}
      className="p-4 h-auto flex-col gap-2 relative group hover:border-primary/50"
    >
      <Lock className="absolute top-2 right-2 w-3 h-3 text-muted-foreground" />
      <Icon className="w-5 h-5 text-primary" />
      <div className="text-center">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </Button>
  );

  // Show generation progress
  if (isGenerating) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Generating Your 3 Opportunities</CardTitle>
            <CardDescription>
              Creating personalized business opportunities based on your answers...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-center">
              <Brain className="w-16 h-16 text-primary animate-pulse" />
            </div>
            
            <div className="space-y-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all duration-1000 w-3/4"></div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Analyzing your answers and generating opportunities...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show generated opportunities
  if (showOpportunities && generatedOpportunities.length > 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Your 3 Personalized Opportunities!</h2>
          <p className="text-muted-foreground">
            Here are business opportunities tailored to your answers. Sign up to save them and unlock advanced features.
          </p>
        </div>

        {/* Opportunities Grid */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1 space-y-6">
          {generatedOpportunities.map((opportunity, index) => (
            <Card key={opportunity.id} className="bg-gradient-card backdrop-blur-glass border-border/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">#{index + 1}</Badge>
                      <Badge variant="outline">AI Score: {opportunity.ai_confidence_score}</Badge>
                      <Badge variant="outline">Fit: {opportunity.founder_fit_score}%</Badge>
                    </div>
                    <CardTitle className="text-xl">{opportunity.title}</CardTitle>
                    <CardDescription className="text-base">
                      {opportunity.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-primary text-sm">Problem Statement</h4>
                    <p className="text-sm text-muted-foreground">{opportunity.problem_statement}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-primary text-sm">Target Market</h4>
                    <p className="text-sm text-muted-foreground">{opportunity.target_market}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-primary text-sm">Solution Approach</h4>
                    <p className="text-sm text-muted-foreground">{opportunity.solution_approach}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-primary text-sm">Market Size</h4>
                    <p className="text-sm text-muted-foreground">{opportunity.market_size_estimate}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 text-sm">
                  <Badge variant="outline">Difficulty: {opportunity.difficulty_level}</Badge>
                  <Badge variant="outline">Competition: {opportunity.competition_level}</Badge>
                  <Badge variant="outline">{opportunity.time_to_market}</Badge>
                </div>

                {/* Advanced Features Preview */}
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-3">Advanced features (requires signup):</p>
                  <div className="grid grid-cols-3 gap-2">
                    <AdvancedFeatureButton 
                      icon={Download} 
                      label="Export PDF" 
                      description="Business plan" 
                    />
                    <AdvancedFeatureButton 
                      icon={BarChart3} 
                      label="Start Validation" 
                      description="Market research" 
                    />
                    <AdvancedFeatureButton 
                      icon={Users} 
                      label="Share with Team" 
                      description="Collaborate" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Save to Account CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold">Save Your 3 Opportunities + Get 6 More!</h3>
              <p className="text-muted-foreground">
                Create your free account to save these 3 opportunities and instantly unlock 6 more 
                (9 total on free plan). Get validation tools, team collaboration, and export features.
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  size="lg"
                  onClick={handleSaveOpportunities}
                  className="flex-1 max-w-sm"
                >
                  Save Opportunities + Get 6 More
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Free plan includes 9 opportunities • Advanced features • Team collaboration
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const IconComponent = currentQuestion.icon;
  const canContinue = answers[currentQuestion.id as keyof GuestAnswers].trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Get 3 Free Opportunities</h1>
          <p className="text-muted-foreground">
            Answer 3 quick questions to get AI-powered business opportunities with complete market research
          </p>
        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
          <Eye className="w-4 h-4 mr-1" />
          Complete Opportunities - No Signup Required
        </Badge>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-8">
        {questions.map((_, index) => (
          <div key={index} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                index <= currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index + 1}
            </div>
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
              value={answers[currentQuestion.id as keyof GuestAnswers]}
              onChange={(e) => handleAnswerChange(e.target.value)}
              className="text-lg p-4 h-auto"
            />
          ) : (
            <div className="space-y-4">
              <Select
                value={showCustomInput[currentQuestion.id as 'skills' | 'timeCommitment'] ? "Custom (specify below)" : answers[currentQuestion.id as keyof GuestAnswers]}
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

          <Button 
            onClick={nextStep}
            disabled={!canContinue}
            className="w-full h-12 text-lg"
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