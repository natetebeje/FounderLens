import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Gift, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

interface GuestUpgradePromptProps {
  opportunityCount?: number;
}

export const GuestUpgradePrompt = ({ opportunityCount = 3 }: GuestUpgradePromptProps) => {
  const navigate = useNavigate();
  const [hasGuestData, setHasGuestData] = useState(false);

  useEffect(() => {
    // Check if user has guest opportunities
    const guestOpportunities = localStorage.getItem('guestOpportunities');
    setHasGuestData(!!guestOpportunities);
  }, []);

  const handleSignUp = () => {
    navigate('/auth?upgrade=guest&opportunities=' + opportunityCount);
  };

  const handleTryGuest = () => {
    navigate('/guest-discovery');
  };

  if (hasGuestData) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 border-primary/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gift className="w-6 h-6 text-primary" />
            <Badge variant="default" className="bg-green-500 text-white">
              Ready to Save!
            </Badge>
          </div>
          <CardTitle className="text-xl">Save Your {opportunityCount} Opportunities</CardTitle>
          <CardDescription>
            You have {opportunityCount} personalized opportunities ready to save. 
            Create your account to save them and unlock 6 more (9 total on free plan)!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Save {opportunityCount} opportunities</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Get 6 more opportunities</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Market validation tools</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Team collaboration</span>
            </div>
          </div>
          
          <Button onClick={handleSignUp} className="w-full" size="lg" variant="hero">
            Save Opportunities + Get 6 More
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Free plan • No credit card required • 9 total opportunities
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 border-primary/20">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <Badge variant="default" className="bg-blue-500 text-white">
            Try for Free
          </Badge>
        </div>
        <CardTitle className="text-xl">Get 3 Free Business Opportunities</CardTitle>
        <CardDescription>
          No signup required! Answer 3 quick questions to get personalized business opportunities 
          with complete details, market research, and validation guidance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>3 complete opportunities</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>AI-powered insights</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Market size estimates</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Competition analysis</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <Button onClick={handleTryGuest} variant="outline" className="w-full" size="lg">
            Try Free Without Signup
            <Sparkles className="w-4 h-4 ml-2" />
          </Button>
          
          <Button onClick={handleSignUp} className="w-full" size="lg" variant="hero">
            Create Account for 9 Opportunities
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <p className="text-xs text-center text-muted-foreground">
          Try first, signup only when you're ready • No spam, ever
        </p>
      </CardContent>
    </Card>
  );
};