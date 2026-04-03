import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, TrendingUp, Users, Globe, Award, Rocket } from "lucide-react";
import { ModernBackground } from "@/components/ui/modern-background";

const About = () => {
  return (
    <ModernBackground variant="mesh">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <span className="text-3xl font-bold text-foreground">FounderLens</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Empowering the next generation of <span className="text-gradient-primary">entrepreneurs</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We believe every great business starts with recognizing the right opportunity. 
            FounderLens uses AI to help entrepreneurs discover, validate, and launch 
            successful businesses faster than ever before.
          </p>
        </div>

        {/* Mission Section */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Rocket className="w-6 h-6 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                To democratize entrepreneurship by making business opportunity discovery 
                accessible to everyone. We're building the tools that help turn ideas 
                into successful ventures, powered by AI and driven by real market insights.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Globe className="w-6 h-6 text-primary" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                A world where anyone with passion and determination can build a 
                successful business. We envision a future where AI-powered insights 
                eliminate the guesswork from entrepreneurship.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-2">10,000+</h3>
            <p className="text-muted-foreground">Entrepreneurs Served</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-2">95%</h3>
            <p className="text-muted-foreground">Success Rate</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Award className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-2">50M+</h3>
            <p className="text-muted-foreground">Opportunities Analyzed</p>
          </div>
        </div>

        {/* Team Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-6">Built by entrepreneurs, for entrepreneurs</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Our team combines deep entrepreneurial experience with cutting-edge AI technology 
            to create tools that actually help founders succeed.
          </p>
          <Button variant="hero" size="lg">
            Join Our Team
          </Button>
        </div>

        {/* Contact Section */}
        <div className="text-center bg-white/10 backdrop-blur-glass p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to start your journey?</h2>
          <p className="text-muted-foreground mb-6">
            Discover your next business opportunity with FounderLens today.
          </p>
          <Button variant="hero" size="lg">
            Get Started Free
          </Button>
        </div>
      </div>
    </ModernBackground>
  );
};

export default About;