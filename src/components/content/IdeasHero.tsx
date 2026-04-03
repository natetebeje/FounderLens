import { Button } from "@/components/ui/button";
import { Lightbulb, TrendingUp, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface IdeasHeroProps {
  totalIdeas: number;
}

export const IdeasHero = ({ totalIdeas }: IdeasHeroProps) => {
  const navigate = useNavigate();

  return (
    <div className="text-center space-y-8">
      {/* Hero Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Lightbulb className="w-8 h-8 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold gradient-text">
            Idea Library
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Explore validated business opportunities discovered and analyzed by our community. 
          Each idea comes with market research, validation data, and implementation insights.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
        <div className="space-y-2">
          <div className="text-2xl font-bold text-primary">{totalIdeas}+</div>
          <div className="text-sm text-muted-foreground">Validated Ideas</div>
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-primary">12</div>
          <div className="text-sm text-muted-foreground">Industries</div>
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-primary">85%</div>
          <div className="text-sm text-muted-foreground">Success Rate</div>
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-primary">48h</div>
          <div className="text-sm text-muted-foreground">Avg Validation</div>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="space-y-3 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Market Validated</h3>
          <p className="text-sm text-muted-foreground">
            Every idea is backed by real market research and community validation data
          </p>
        </div>
        
        <div className="space-y-3 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Community Insights</h3>
          <p className="text-sm text-muted-foreground">
            Learn from real discussions and feedback from potential customers
          </p>
        </div>
        
        <div className="space-y-3 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Ready to Launch</h3>
          <p className="text-sm text-muted-foreground">
            Get implementation guides and resources to turn ideas into reality
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Want to validate your own idea?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => navigate('/discovery')}>
            Start Discovery Process
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/guest-discovery')}>
            Try Free Sample
          </Button>
        </div>
      </div>
    </div>
  );
};