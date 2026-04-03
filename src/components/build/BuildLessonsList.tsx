import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, CheckCircle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BuildLesson {
  id: string;
  title: string;
  slug: string;
  description: string;
  video_duration_minutes?: number;
  sort_order: number;
  user_progress?: {
    completed_at?: string;
    progress_percentage: number;
  };
}

interface BuildLessonsListProps {
  lessons: BuildLesson[];
  trackSlug: string;
  isAuthenticated: boolean;
}

export const BuildLessonsList = ({ lessons, trackSlug, isAuthenticated }: BuildLessonsListProps) => {
  const navigate = useNavigate();

  if (lessons.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No lessons available yet.</p>
      </div>
    );
  }

  const handleLessonClick = (lesson: BuildLesson, index: number) => {
    const isCompleted = lesson.user_progress?.completed_at;
    const canAccess = index === 0 || lessons[index - 1]?.user_progress?.completed_at;
    
    if (!isAuthenticated) {
      navigate('/auth');
    } else if (canAccess) {
      navigate(`/build/${trackSlug}/${lesson.slug}`);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground">Lessons</h2>
      <div className="space-y-3">
        {lessons.map((lesson, index) => {
          const isCompleted = lesson.user_progress?.completed_at;
          const canAccess = index === 0 || lessons[index - 1]?.user_progress?.completed_at;
          const isLocked = !isAuthenticated || !canAccess;
          
          return (
            <Card 
              key={lesson.id} 
              className={`glass-card p-6 transition-all duration-200 ${
                isLocked ? 'opacity-60' : 'hover:shadow-soft cursor-pointer'
              }`}
              onClick={() => handleLessonClick(lesson, index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <h3 className="text-lg font-semibold text-foreground">
                      {lesson.title}
                    </h3>
                    {isCompleted && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {isLocked && (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {lesson.description}
                  </p>
                  {lesson.video_duration_minutes && (
                    <p className="text-sm text-muted-foreground">
                      {lesson.video_duration_minutes} minutes
                    </p>
                  )}
                </div>
                
                <div className="ml-4">
                  <PlayCircle className={`w-6 h-6 ${
                    isLocked ? 'text-muted-foreground' : 'text-primary'
                  }`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};