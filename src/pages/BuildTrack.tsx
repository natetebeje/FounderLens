import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ModernContainer } from "@/components/ui/modern-background";
import { BuildTrackHeader } from "@/components/build/BuildTrackHeader";
import { BuildLessonsList } from "@/components/build/BuildLessonsList";
import { BuildTrackSkeleton } from "@/components/ui/loading-skeleton";
import { TrackEnrollPanel } from "@/components/build/TrackEnrollPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BuildTrack {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty_level: string;
  estimated_duration_hours: number;
  featured_image_url?: string;
  enrollment_enabled?: boolean;
  enrollment_count?: number;
  enrollment_limit?: number;
  requires_subscription?: boolean;
}

interface BuildLesson {
  id: string;
  title: string;
  slug: string;
  description: string;
  video_duration_minutes?: number;
  sort_order: number;
  is_published: boolean;
  user_progress?: {
    completed_at?: string;
    progress_percentage: number;
  };
}

const BuildTrack = () => {
  const { trackSlug } = useParams<{ trackSlug: string }>();
  const navigate = useNavigate();
  const [track, setTrack] = useState<BuildTrack | null>(null);
  const [lessons, setLessons] = useState<BuildLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { subscribed } = useSubscription();

  const checkEnrollment = async (trackId: string) => {
    if (!user) {
      setIsEnrolled(false);
      return;
    }

    try {
      setCheckingEnrollment(true);
      const { data, error } = await supabase
        .from('track_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setIsEnrolled(!!data);
    } catch (error) {
      console.error('Error checking enrollment:', error);
      setIsEnrolled(false);
    } finally {
      setCheckingEnrollment(false);
    }
  };

  useEffect(() => {
    const fetchTrackAndLessons = async () => {
      if (!trackSlug) return;

      try {
        setLoading(true);
        
        // Fetch track
        const { data: trackData, error: trackError } = await supabase
          .from('build_tracks')
          .select('*')
          .eq('slug', trackSlug)
          .eq('is_published', true)
          .single();
        
        if (trackError) throw trackError;
        setTrack(trackData);

        // Check enrollment if user is logged in
        if (user) {
          await checkEnrollment(trackData.id);
        }

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('build_lessons')
          .select('*')
          .eq('track_id', trackData.id)
          .eq('is_published', true)
          .order('sort_order', { ascending: true });
        
        if (lessonsError) throw lessonsError;

        // If user is authenticated, fetch their progress
        let lessonsWithProgress = lessonsData;
        if (user && lessonsData?.length > 0) {
          const lessonIds = lessonsData.map(lesson => lesson.id);
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds);

          lessonsWithProgress = lessonsData.map(lesson => {
            const progress = progressData?.find(p => p.lesson_id === lesson.id);
            return {
              ...lesson,
              user_progress: progress ? {
                completed_at: progress.completed_at,
                progress_percentage: progress.progress_percentage
              } : undefined
            };
          });
        }

        setLessons(lessonsWithProgress || []);
      } catch (error: any) {
        console.error('Error fetching track:', error);
        toast({
          title: "Track not found",
          description: "The build track you're looking for doesn't exist or has been removed.",
          variant: "destructive"
        });
        navigate('/build');
      } finally {
        setLoading(false);
      }
    };

    fetchTrackAndLessons();
  }, [trackSlug, navigate, toast, user]);

  const handleEnrollmentSuccess = () => {
    setIsEnrolled(true);
  };

  if (loading || checkingEnrollment) {
    return (
      <ModernContainer>
        <BuildTrackSkeleton />
      </ModernContainer>
    );
  }

  if (!track) {
    return (
      <ModernContainer>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">Track Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The build track you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/build')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Build Lab
          </Button>
        </div>
      </ModernContainer>
    );
  }

  return (
    <ModernContainer>
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/build')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Build Lab
          </Button>
        </div>

        {/* Show enrollment panel if not enrolled */}
        {!isEnrolled ? (
          <TrackEnrollPanel 
            track={track} 
            onEnroll={handleEnrollmentSuccess}
          />
        ) : (
          <>
            {/* Track Header */}
            <BuildTrackHeader 
              track={track} 
              totalLessons={lessons.length}
              resumeLessonSlug={lessons.find(l => !l.user_progress?.completed_at)?.slug || lessons[0]?.slug}
            />

            {/* Lessons List */}
            <div className="mt-12">
              {/* Premium gating for authenticated users */}
              {user && !subscribed && track.requires_subscription ? (
                <div className="space-y-8">
                  <Card className="border-primary/20 bg-gradient-subtle">
                    <CardHeader className="text-center">
                      <div className="flex justify-center mb-4">
                        <Crown className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-xl">
                        Premium Content
                      </CardTitle>
                      <CardDescription>
                        Upgrade to access all lessons in this track
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <Button 
                        onClick={() => navigate("/pricing")}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade Now
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {/* Show limited lessons for preview */}
                  <BuildLessonsList 
                    lessons={lessons.slice(0, 2)} 
                    trackSlug={track.slug}
                    isAuthenticated={!!user}
                  />
                </div>
              ) : (
                <BuildLessonsList 
                  lessons={lessons} 
                  trackSlug={track.slug}
                  isAuthenticated={!!user}
                />
              )}
            </div>
          </>
        )}
      </div>
    </ModernContainer>
  );
};

export default BuildTrack;