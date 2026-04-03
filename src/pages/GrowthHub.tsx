import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, 
  BookOpen,
  Lightbulb,
  ArrowRight,
  Target
} from 'lucide-react';

const GrowthHub = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-16 space-y-16">
      {/* Header */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Build & Launch Hub
        </h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Turn frustrations into profitable products. Learn from proven case studies. Build with step-by-step guidance.
        </p>
      </div>

      {/* Main CTAs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Primary CTA: Build from Frustration */}
        <Card className="group border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/discovery')}>
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 p-4 rounded-full bg-primary/20 text-primary w-fit group-hover:bg-primary/30 transition-colors">
              <Lightbulb className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-semibold">Build from Frustration</CardTitle>
            <CardDescription className="text-lg">
              Turn your daily frustrations into validated business opportunities with AI guidance
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button size="lg" className="w-full group-hover:scale-105 transition-transform">
              Generate Your Idea
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
        
        {/* Primary CTA: Build from Case Studies */}
        <Card className="group border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10 hover:border-green-500/40 transition-all duration-300 cursor-pointer" onClick={() => navigate('/case-studies')}>
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 p-4 rounded-full bg-green-500/20 text-green-600 w-fit group-hover:bg-green-500/30 transition-colors">
              <BookOpen className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-semibold">Build from Success Stories</CardTitle>
            <CardDescription className="text-lg">
              Learn to build proven products based on real case studies with revenue data
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button size="lg" variant="outline" className="w-full group-hover:scale-105 transition-transform">
              Browse Case Studies
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Secondary CTA */}
      <div className="max-w-2xl mx-auto">
        <Card className="group border border-border/50 hover:border-border transition-all duration-300 cursor-pointer" onClick={() => navigate('/opportunities')}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-muted text-muted-foreground w-fit">
              <Target className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-semibold">Already Have an Idea?</CardTitle>
            <CardDescription>
              Validate your existing business concept with market research and community intelligence
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="ghost" className="group-hover:bg-muted/50">
              Validate Your Idea
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start for new users */}
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-to-r from-muted/50 to-muted/30 border-muted">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">New to FounderLens?</CardTitle>
            <CardDescription>
              Try our discovery process without signing up to see how it works
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => navigate('/guest-discovery')}>
              Try Free Sample
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GrowthHub;