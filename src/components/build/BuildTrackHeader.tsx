import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BuildTrack {
  title: string;
  slug: string;
  description: string;
  difficulty_level: string;
  estimated_duration_hours: number;
  featured_image_url?: string;
}

interface BuildTrackHeaderProps {
  track: BuildTrack;
  totalLessons: number;
  resumeLessonSlug?: string;
}

export const BuildTrackHeader = ({ track, totalLessons, resumeLessonSlug }: BuildTrackHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {track.difficulty_level}
        </Badge>
        <Badge variant="secondary">
          {totalLessons} Lessons
        </Badge>
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-foreground">
        {track.title}
      </h1>

      <p className="text-xl text-muted-foreground">
        {track.description}
      </p>

      <div className="flex items-center gap-6 text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{track.estimated_duration_hours} hours</span>
        </div>
        <div className="flex items-center gap-1">
          <BookOpen className="w-4 h-4" />
          <span>{totalLessons} lessons</span>
        </div>
      </div>
    </div>
  );
};