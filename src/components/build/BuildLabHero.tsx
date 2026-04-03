import { Button } from "@/components/ui/button";
import { Play, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BuildLabHeroProps {
  totalTracks: number;
}

export const BuildLabHero = ({ totalTracks }: BuildLabHeroProps) => {
  const navigate = useNavigate();

  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold gradient-text">
          Build Lab
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Learn to build and launch successful businesses with our step-by-step video courses. 
          Each track includes real examples, templates, and actionable insights.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-lg mx-auto">
        <div className="space-y-2">
          <div className="text-2xl font-bold text-primary">{totalTracks}</div>
          <div className="text-sm text-muted-foreground">Build Tracks</div>
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-primary">40+</div>
          <div className="text-sm text-muted-foreground">Video Lessons</div>
        </div>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-primary">15h</div>
          <div className="text-sm text-muted-foreground">Total Content</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button size="lg" onClick={() => navigate('/programs')}>
          <Play className="w-4 h-4 mr-2" />
          View Programs
        </Button>
        <Button size="lg" variant="outline" onClick={() => navigate('/discovery')}>
          Start Building
        </Button>
      </div>
    </div>
  );
};