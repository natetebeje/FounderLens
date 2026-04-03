import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, PlayCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BuildTrack {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty_level: string;
  estimated_duration_hours: number;
  featured_image_url?: string;
  lesson_count: number;
}

interface BuildTracksGridProps {
  tracks: BuildTrack[];
  showSeeAllButton?: boolean;
}

export const BuildTracksGrid = ({ tracks, showSeeAllButton = false }: BuildTracksGridProps) => {
  const navigate = useNavigate();

  if (tracks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No build tracks available yet.</p>
        <p className="text-sm text-muted-foreground">Check back soon for new learning content!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks.map((track) => (
          <Card 
            key={track.id} 
            className="glass-card hover:shadow-soft transition-all duration-300 group cursor-pointer"
            onClick={() => navigate(`/build/${track.slug}`)}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {track.title}
                </h3>
                <PlayCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
              
              <p className="text-muted-foreground text-sm line-clamp-3">
                {track.description}
              </p>

              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="capitalize text-xs">
                  {track.difficulty_level}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <PlayCircle className="w-3 h-3" />
                  <span>{track.lesson_count}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{track.estimated_duration_hours}h</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
    </div>
  );
};