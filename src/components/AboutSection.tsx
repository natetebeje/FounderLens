import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, Globe, Users, TrendingUp, Award } from "lucide-react";

export const AboutSection = () => {
  return (
    <section id="about" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Mission & Vision */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Built by founders who've been there, <span className="text-gradient-primary">done that</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We've launched multiple B2B SaaS products and learned the hard way: validation first, then build. 
            FounderLens is the founder go-to-market OS we wish we'd had—evidence-driven tools that compress 
            your timeline from idea to first revenue.
          </p>
        </div>

        {/* Mission & Vision Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="w-6 h-6 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                To help founders reach first revenue faster by eliminating the guesswork. 
                We're building evidence-first tools that turn market validation into 
                coordinated execution—weeks, not months.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-6 h-6 text-primary" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Every founder launches with market evidence, not assumptions. 
                A world where validation-led building is the standard, and first 
                revenue happens in weeks because you built what customers want.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center group">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Users className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-2">500+</h3>
            <p className="text-muted-foreground">Early Users</p>
          </div>

          <div className="text-center group">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-2">90%</h3>
            <p className="text-muted-foreground">User Satisfaction</p>
          </div>

          <div className="text-center group">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                <Award className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-2">15,000+</h3>
            <p className="text-muted-foreground">Opportunities Generated</p>
          </div>
        </div>
      </div>
    </section>
  );
};