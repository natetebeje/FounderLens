import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, User, Target, Briefcase, Link2, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProfileOverview } from "@/components/ProfileOverview";

interface OnboardingData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  
  // Background & Skills
  currentRole: string;
  experience: string;
  skills: string[];
  industries: string[];
  
  // Goals & Motivations
  ventureInterests: string[];
  timeCommitment: string;
  riskTolerance: string;
  primaryGoal: string;
  biggestFrustration: string;
  
  // Data Integrations (opt-in)
  dataPermissions: {
    email: boolean;
    calendar: boolean;
    browser: boolean;
    spending: boolean;
  };
}

const initialData: OnboardingData = {
  firstName: "",
  lastName: "",
  email: "",
  currentRole: "",
  experience: "",
  skills: [],
  industries: [],
  ventureInterests: [],
  timeCommitment: "",
  riskTolerance: "",
  primaryGoal: "",
  biggestFrustration: "",
  dataPermissions: {
    email: false,
    calendar: false,
    browser: false,
    spending: false
  }
};

const steps = [
  { id: 1, title: "Personal Info", icon: User },
  { id: 2, title: "Background", icon: Briefcase },
  { id: 3, title: "Goals", icon: Target },
  { id: 4, title: "Data Sync", icon: Link2 }
];

const skillOptions = [
  "Software Development", "Product Management", "Marketing", "Sales", "Design",
  "Data Analysis", "Finance", "Operations", "Customer Success", "Engineering",
  "Content Creation", "Social Media", "Project Management", "Leadership"
];

const industryOptions = [
  "Technology", "Healthcare", "Finance", "E-commerce", "Education", "Media",
  "Real Estate", "Manufacturing", "Consulting", "Non-profit", "Gaming",
  "Food & Beverage", "Travel", "Fitness", "Fashion", "Agriculture"
];

const ventureOptions = [
  "SaaS Products", "E-commerce", "Mobile Apps", "AI/ML Solutions", "Fintech",
  "Health Tech", "EdTech", "Creator Economy", "B2B Services", "Consumer Products",
  "Social Impact", "Hardware", "Blockchain/Web3", "Marketplace"
];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const navigate = useNavigate();
  const { toast } = useToast();

  // Load existing user data from database
  const loadExistingUserData = async (userId: string) => {
    console.log('Loading existing user data for userId:', userId);
    try {
      // Load profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .maybeSingle();

      // Load user skills
      const { data: skillsData } = await supabase
        .from('user_skills')
        .select('skill_name')
        .eq('user_id', userId);

      // Load user goals
      const { data: goalsData } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Load data integration preferences
      const { data: preferencesData } = await supabase
        .from('data_integration_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('Database results:', { profileData, skillsData, goalsData, preferencesData });

      // Map the data to form format
      const loadedData: Partial<OnboardingData> = {};

      // Profile data
      if (profileData) {
        loadedData.firstName = profileData.first_name || "";
        loadedData.lastName = profileData.last_name || "";
      }

      // Skills data - remove duplicates
      if (skillsData && skillsData.length > 0) {
        loadedData.skills = [...new Set(skillsData.map(skill => skill.skill_name))];
      }

      // Goals data
      if (goalsData) {
        loadedData.ventureInterests = goalsData.venture_interests || [];
        loadedData.timeCommitment = goalsData.time_commitment || "";
        loadedData.biggestFrustration = goalsData.biggest_frustrations?.[0] || "";
        loadedData.currentRole = goalsData.current_role || "";
        loadedData.industries = goalsData.industries || [];
        loadedData.riskTolerance = goalsData.risk_tolerance || "";
        loadedData.primaryGoal = goalsData.primary_goal || "";
        
        // Map experience level back to form format
        if (goalsData.experience_level === 'first-time') {
          loadedData.experience = '0-2';
        } else if (goalsData.experience_level === 'experienced') {
          loadedData.experience = '3-5';
        } else if (goalsData.experience_level === 'serial') {
          loadedData.experience = '10+';
        }
      }

      // Data integration preferences
      if (preferencesData) {
        loadedData.dataPermissions = {
          email: preferencesData.email_integration || false,
          calendar: preferencesData.calendar_integration || false,
          browser: preferencesData.messaging_integration || false,
          spending: preferencesData.spending_integration || false
        };
      }

      console.log('Loaded data for form:', loadedData);
      return loadedData;
    } catch (error) {
      console.error('Error loading existing user data:', error);
      return {};
    }
  };

  // Check authentication and load user data
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      // Load existing user data
      const existingData = await loadExistingUserData(session.user.id);
      
      // Pre-fill form with auth data and existing data
      setData(prev => ({
        ...prev,
        email: session.user.email || "",
        firstName: existingData.firstName || session.user.user_metadata?.first_name || "",
        lastName: existingData.lastName || session.user.user_metadata?.last_name || "",
        skills: existingData.skills || [],
        ventureInterests: existingData.ventureInterests || [],
        timeCommitment: existingData.timeCommitment || "",
        experience: existingData.experience || "",
        biggestFrustration: existingData.biggestFrustration || "",
        currentRole: existingData.currentRole || "",
        industries: existingData.industries || [],
        riskTolerance: existingData.riskTolerance || "",
        primaryGoal: existingData.primaryGoal || "",
        dataPermissions: existingData.dataPermissions || {
          email: false,
          calendar: false,
          browser: false,
          spending: false
        }
      }));
      
      setIsLoadingData(false);
    };
    
    checkAuth();
  }, [navigate]);

  const progress = (currentStep / steps.length) * 100;

  const updateData = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setLastUpdated(new Date());
  };

  const toggleArrayItem = (field: keyof OnboardingData, item: string) => {
    setData(prev => ({
      ...prev,
      [field]: Array.isArray(prev[field])
        ? (prev[field] as string[]).includes(item)
          ? (prev[field] as string[]).filter(i => i !== item)
          : [...(prev[field] as string[]), item]
        : prev[field]
    }));
    setLastUpdated(new Date());
  };

  const getProgressItems = () => {
    return [
      { id: "personal", label: "Personal Info", completed: !!(data.firstName && data.lastName && data.email) },
      { id: "background", label: "Background", completed: !!(data.currentRole && data.experience && data.skills.length > 0) },
      { id: "goals", label: "Goals", completed: !!(data.ventureInterests.length > 0 && data.timeCommitment && data.riskTolerance) },
      { id: "integrations", label: "Data Sync", completed: Object.values(data.dataPermissions).some(Boolean) }
    ];
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Update user profile information
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          first_name: data.firstName,
          last_name: data.lastName,
        }, {
          onConflict: 'user_id'
        });
        
      if (profileError) throw profileError;

      // Clear existing skills and insert new ones
      if (data.skills.length > 0) {
        // Delete existing skills
        await supabase
          .from('user_skills')
          .delete()
          .eq('user_id', user.id);

        // Insert new skills
        const skillsData = data.skills.map(skill => ({
          user_id: user.id,
          skill_name: skill,
          skill_level: 'intermediate'
        }));
        
        const { error: skillsError } = await supabase
          .from('user_skills')
          .insert(skillsData);
          
        if (skillsError) throw skillsError;
      }

      // Save user goals
      const { error: goalsError } = await supabase
        .from('user_goals')
        .upsert({
          user_id: user.id,
          venture_interests: data.ventureInterests,
          experience_level: data.experience === '0-2' ? 'first-time' : 
                           data.experience === '3-5' ? 'experienced' : 'serial',
          time_commitment: data.timeCommitment,
          biggest_frustrations: [data.biggestFrustration].filter(Boolean),
          current_role: data.currentRole,
          industries: data.industries,
          risk_tolerance: data.riskTolerance,
          primary_goal: data.primaryGoal
        }, {
          onConflict: 'user_id'
        });
        
      if (goalsError) throw goalsError;

      // Save data integration preferences
      const { error: prefsError } = await supabase
        .from('data_integration_preferences')
        .upsert({
          user_id: user.id,
          email_integration: data.dataPermissions.email,
          calendar_integration: data.dataPermissions.calendar,
          messaging_integration: data.dataPermissions.browser,
          spending_integration: data.dataPermissions.spending
        }, {
          onConflict: 'user_id'
        });
        
      if (prefsError) throw prefsError;

      toast({
        title: "Profile updated successfully!",
        description: "Your changes have been saved.",
        duration: 3000,
      });

      navigate("/profile");
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Welcome to FounderLens</h2>
              <p className="text-muted-foreground">Let's get to know you better to personalize your experience</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={data.firstName}
                    onChange={(e) => updateData("firstName", e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={data.lastName}
                    onChange={(e) => updateData("lastName", e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => updateData("email", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Your Background</h2>
              <p className="text-muted-foreground">Help us understand your professional experience</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentRole">Current Role/Position</Label>
                <Input
                  id="currentRole"
                  value={data.currentRole}
                  onChange={(e) => updateData("currentRole", e.target.value)}
                  placeholder="e.g., Software Engineer, Marketing Manager"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="experience">Years of Professional Experience</Label>
                <RadioGroup value={data.experience} onValueChange={(value) => updateData("experience", value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="0-2" id="exp1" />
                    <Label htmlFor="exp1">0-2 years</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3-5" id="exp2" />
                    <Label htmlFor="exp2">3-5 years</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="6-10" id="exp3" />
                    <Label htmlFor="exp3">6-10 years</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="10+" id="exp4" />
                    <Label htmlFor="exp4">10+ years</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label>Key Skills (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {skillOptions.map((skill) => (
                    <Badge
                      key={skill}
                      variant={data.skills.includes(skill) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleArrayItem("skills", skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Industry Experience</Label>
                <div className="flex flex-wrap gap-2">
                  {industryOptions.map((industry) => (
                    <Badge
                      key={industry}
                      variant={data.industries.includes(industry) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleArrayItem("industries", industry)}
                    >
                      {industry}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Your Goals & Motivations</h2>
              <p className="text-muted-foreground">Tell us what you're looking for in your entrepreneurial journey</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>What types of ventures interest you?</Label>
                <div className="flex flex-wrap gap-2">
                  {ventureOptions.map((venture) => (
                    <Badge
                      key={venture}
                      variant={data.ventureInterests.includes(venture) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleArrayItem("ventureInterests", venture)}
                    >
                      {venture}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Time commitment you can dedicate</Label>
                <RadioGroup value={data.timeCommitment} onValueChange={(value) => updateData("timeCommitment", value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="part-time" id="time1" />
                    <Label htmlFor="time1">Part-time (evenings/weekends)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full-time" id="time2" />
                    <Label htmlFor="time2">Full-time commitment</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flexible" id="time3" />
                    <Label htmlFor="time3">Flexible, depends on opportunity</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label>Risk tolerance</Label>
                <RadioGroup value={data.riskTolerance} onValueChange={(value) => updateData("riskTolerance", value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="risk1" />
                    <Label htmlFor="risk1">Low - Prefer validated, low-risk opportunities</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="risk2" />
                    <Label htmlFor="risk2">Medium - Open to moderate risk for higher returns</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="risk3" />
                    <Label htmlFor="risk3">High - Willing to take big risks for big rewards</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="primaryGoal">What's your primary goal?</Label>
                <Textarea
                  id="primaryGoal"
                  value={data.primaryGoal}
                  onChange={(e) => updateData("primaryGoal", e.target.value)}
                  placeholder="e.g., Build financial freedom, solve problems I'm passionate about, create impact..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="biggestFrustration">What's your biggest frustration with finding business ideas?</Label>
                <Textarea
                  id="biggestFrustration"
                  value={data.biggestFrustration}
                  onChange={(e) => updateData("biggestFrustration", e.target.value)}
                  placeholder="e.g., Ideas feel generic, don't know if there's real demand, unsure about market fit..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Data Integration</h2>
              <p className="text-muted-foreground">
                Connect your data sources for personalized opportunity discovery
              </p>
              <p className="text-sm text-muted-foreground">
                All data is encrypted and you have full control. You can disconnect anytime.
              </p>
            </div>
            
            <div className="space-y-4">
              {[
                {
                  key: "email" as keyof typeof data.dataPermissions,
                  title: "Email Analysis",
                  description: "Analyze communication patterns to identify pain points and opportunities",
                  benefit: "Discover problems you solve for others regularly"
                },
                {
                  key: "calendar" as keyof typeof data.dataPermissions,
                  title: "Calendar Integration",
                  description: "Understand your schedule and time allocation patterns",
                  benefit: "Find opportunities that fit your lifestyle"
                },
                {
                  key: "browser" as keyof typeof data.dataPermissions,
                  title: "Browse History",
                  description: "Analyze research patterns and interests",
                  benefit: "Surface ideas based on your natural curiosity"
                },
                {
                  key: "spending" as keyof typeof data.dataPermissions,
                  title: "Spending Patterns",
                  description: "Understand your purchasing behavior and pain points",
                  benefit: "Identify problems you personally pay to solve"
                }
              ].map((integration) => (
                <Card key={integration.key} className="bg-gradient-card backdrop-blur-glass border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={integration.key}
                        checked={data.dataPermissions[integration.key]}
                        onCheckedChange={(checked) => 
                          setData(prev => ({
                            ...prev,
                            dataPermissions: {
                              ...prev.dataPermissions,
                              [integration.key]: checked
                            }
                          }))
                        }
                      />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={integration.key} className="text-base font-medium cursor-pointer">
                          {integration.title}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                        <p className="text-xs text-primary">
                          💡 {integration.benefit}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Card className="bg-accent/20 border-accent/50">
                <CardContent className="p-4 text-center">
                  <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    The more data you connect, the more personalized and accurate your opportunity recommendations will be.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.firstName && data.lastName && data.email;
      case 2:
        return data.currentRole && data.experience && data.skills.length > 0;
      case 3:
        return data.ventureInterests.length > 0 && data.timeCommitment && data.riskTolerance;
      case 4:
        return true; // Data integrations are optional
      default:
        return false;
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-gradient-card backdrop-blur-glass pt-6">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentStep > 1 && (
                <Button variant="ghost" onClick={prevStep} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              <h1 className="text-xl font-semibold">Setup Your Profile</h1>
            </div>
            <div className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
          {/* Left Column - Profile Overview (Desktop only) */}
          <div className="hidden lg:block lg:col-span-4">
            {user && (
              <ProfileOverview
                user={user}
                firstName={data.firstName}
                lastName={data.lastName}
                email={data.email}
                progressItems={getProgressItems()}
                lastUpdated={lastUpdated}
              />
            )}
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-8">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                {steps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-2 ${
                        step.id === currentStep
                          ? "text-primary"
                          : step.id < currentStep
                          ? "text-green-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          step.id === currentStep
                            ? "bg-primary text-primary-foreground"
                            : step.id < currentStep
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.id < currentStep ? "✓" : <Icon className="w-4 h-4" />}
                      </div>
                      <span className="hidden md:block text-sm font-medium">
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Content */}
            <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
              <CardContent className="p-8">
                {renderStepContent()}
                
                <div className="flex justify-end mt-8">
                  <Button
                    onClick={nextStep}
                    disabled={!canProceed() || isLoading}
                    className="gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {currentStep === steps.length ? "Save Changes" : "Continue"}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
