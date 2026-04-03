
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Edit, User, Target, Briefcase, Settings, Mail, Calendar, Globe, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ModernBackground } from "@/components/ui/modern-background";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  skills: Array<{ skill_name: string; skill_level: string }>;
  goals: {
    venture_interests: string[];
    experience_level: string;
    time_commitment: string;
    biggest_frustrations: string[];
  } | null;
  dataPreferences: {
    email_integration: boolean;
    calendar_integration: boolean;
    messaging_integration: boolean;
    spending_integration: boolean;
  } | null;
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadProfileData = async (userId: string) => {
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
        .select('skill_name, skill_level')
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

      return {
        firstName: profileData?.first_name || "",
        lastName: profileData?.last_name || "",
        email: user?.email || "",
        skills: skillsData || [],
        goals: goalsData,
        dataPreferences: preferencesData
      };
    } catch (error) {
      console.error('Error loading profile data:', error);
      toast({
        title: "Error loading profile",
        description: "Failed to load your profile data. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      const profileData = await loadProfileData(session.user.id);
      setProfile(profileData);
      setIsLoading(false);
    };

    checkAuthAndLoadProfile();
  }, [navigate, toast]);

  // Function to refresh profile data (called when returning from editing)
  const refreshProfile = async () => {
    if (user) {
      const profileData = await loadProfileData(user.id);
      setProfile(profileData);
    }
  };

  // Listen for route changes to refresh data when coming back from onboarding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        refreshProfile();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const getExperienceLevelDisplay = (level: string) => {
    switch (level) {
      case 'first-time': return 'First-time Entrepreneur (0-2 years)';
      case 'experienced': return 'Experienced (3-5 years)';
      case 'serial': return 'Serial Entrepreneur (10+ years)';
      default: return level;
    }
  };

  const getTimeCommitmentDisplay = (commitment: string) => {
    switch (commitment) {
      case 'part-time': return 'Part-time (evenings/weekends)';
      case 'full-time': return 'Full-time commitment';
      case 'flexible': return 'Flexible, depends on opportunity';
      default: return commitment;
    }
  };

  if (isLoading) {
    return (
      <ModernBackground variant="mesh" className="flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </ModernBackground>
    );
  }

  if (!profile) {
    return (
      <ModernBackground variant="mesh" className="flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Failed to load profile data.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </ModernBackground>
    );
  }

  return (
    <ModernBackground variant="mesh">
      {/* Header */}
      <div className="border-b border-border/50 bg-gradient-card backdrop-blur-glass">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {profile.firstName || profile.lastName 
                  ? `${profile.firstName} ${profile.lastName}`.trim()
                  : "Your Profile"
                }
              </h1>
              <p className="text-muted-foreground mt-1">{profile.email}</p>
            </div>
            <Button onClick={() => navigate("/onboarding")} className="gap-2">
              <Edit className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">First Name</p>
                  <p className="text-base">{profile.firstName || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                  <p className="text-base">{profile.lastName || "Not provided"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base">{profile.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Skills & Expertise
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.skills && profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill.skill_name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No skills added yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Goals & Interests */}
          {profile.goals && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Goals & Interests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile.goals.venture_interests && profile.goals.venture_interests.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Venture Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.goals.venture_interests.map((interest, index) => (
                        <Badge key={index} variant="outline">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.goals.experience_level && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Experience Level</p>
                    <p className="text-base">{getExperienceLevelDisplay(profile.goals.experience_level)}</p>
                  </div>
                )}

                {profile.goals.time_commitment && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time Commitment</p>
                    <p className="text-base">{getTimeCommitmentDisplay(profile.goals.time_commitment)}</p>
                  </div>
                )}

                {profile.goals.biggest_frustrations && profile.goals.biggest_frustrations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Biggest Frustrations</p>
                    <div className="space-y-1">
                      {profile.goals.biggest_frustrations.map((frustration, index) => (
                        <p key={index} className="text-base">{frustration}</p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Data Integration Preferences */}
          {profile.dataPreferences && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Data Integration Preferences
                </CardTitle>
                <CardDescription>
                  Your data connection preferences for personalized opportunity discovery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Email Analysis</p>
                      <p className="text-xs text-muted-foreground">Communication patterns</p>
                    </div>
                    <Badge variant={profile.dataPreferences.email_integration ? "default" : "secondary"}>
                      {profile.dataPreferences.email_integration ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Calendar Integration</p>
                      <p className="text-xs text-muted-foreground">Schedule patterns</p>
                    </div>
                    <Badge variant={profile.dataPreferences.calendar_integration ? "default" : "secondary"}>
                      {profile.dataPreferences.calendar_integration ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Browse History</p>
                      <p className="text-xs text-muted-foreground">Research interests</p>
                    </div>
                    <Badge variant={profile.dataPreferences.messaging_integration ? "default" : "secondary"}>
                      {profile.dataPreferences.messaging_integration ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Spending Patterns</p>
                      <p className="text-xs text-muted-foreground">Purchase behavior</p>
                    </div>
                    <Badge variant={profile.dataPreferences.spending_integration ? "default" : "secondary"}>
                      {profile.dataPreferences.spending_integration ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profile Completion Status */}
          <Card className="bg-accent/20 border-accent/50">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Want to update your information or add more details?
              </p>
              <Button 
                onClick={() => navigate("/onboarding")} 
                variant="outline" 
                className="mt-3 gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </ModernBackground>
  );
};

export default Profile;
