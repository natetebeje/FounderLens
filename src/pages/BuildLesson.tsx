import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ModernContainer } from "@/components/ui/modern-background";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle, Play, Crown, Lock, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BuildLessonSkeleton } from "@/components/ui/loading-skeleton";
import { LessonContentTabs } from "@/components/enhanced/LessonContentTabs";
import { useSubscription } from "@/hooks/useSubscription";

interface BuildLesson {
  id: string;
  title: string;
  slug: string;
  description: string;
  video_url?: string;
  lesson_content?: string;
  video_duration_minutes?: number;
  sort_order: number;
  track_id: string;
}

interface BuildTrack {
  id: string;
  title: string;
  slug: string;
  enrollment_enabled?: boolean;
  requires_subscription?: boolean;
}

const BuildLesson = () => {
  const { trackSlug, lessonSlug } = useParams<{ trackSlug: string; lessonSlug: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<BuildLesson | null>(null);
  const [track, setTrack] = useState<BuildTrack | null>(null);
  const [lessons, setLessons] = useState<BuildLesson[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const { subscribed } = useSubscription();

  useEffect(() => {
    const fetchLessonData = async () => {
      if (!trackSlug || !lessonSlug) return;

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

        // Check if user is enrolled (if enrollment is enabled for this track)
        if (user && trackData.enrollment_enabled) {
          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from('track_enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('track_id', trackData.id)
            .single();

          if (enrollmentError && enrollmentError.code !== 'PGRST116') {
            console.error('Error checking enrollment:', enrollmentError);
          }

          if (!enrollmentData) {
            toast({
              title: "Enrollment required",
              description: "You need to enroll in this program to access lessons.",
              variant: "destructive"
            });
            navigate(`/build/${trackSlug}`);
            return;
          }
        }

        // Fetch all lessons for navigation
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('build_lessons')
          .select('*')
          .eq('track_id', trackData.id)
          .eq('is_published', true)
          .order('sort_order', { ascending: true });
        
        if (lessonsError) throw lessonsError;
        setLessons(lessonsData || []);

        // Find current lesson
        const currentLesson = lessonsData?.find(l => l.slug === lessonSlug);
        if (!currentLesson) {
          throw new Error('Lesson not found');
        }

        // Check subscription requirements for premium tracks
        if (trackData.requires_subscription && user && !subscribed) {
          // Allow access only to the first lesson for preview
          const isFirstLesson = lessonsData[0]?.id === currentLesson.id;
          if (!isFirstLesson) {
            toast({
              title: "Premium content",
              description: "This lesson requires a subscription to access.",
              variant: "destructive"
            });
            navigate(`/build/${trackSlug}`);
            return;
          }
        }

        setLesson(currentLesson);

        // Check if lesson is completed (if user is authenticated)
        if (user) {
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('lesson_id', currentLesson.id)
            .single();

          setIsCompleted(!!progressData?.completed_at);
        }

      } catch (error: any) {
        console.error('Error fetching lesson:', error);
        toast({
          title: "Lesson not found",
          description: "The lesson you're looking for doesn't exist or has been removed.",
          variant: "destructive"
        });
        navigate(`/build/${trackSlug}`);
      } finally {
        setLoading(false);
      }
    };

    fetchLessonData();
  }, [trackSlug, lessonSlug, navigate, toast, user, subscribed]);

  const markComplete = async () => {
    if (!user || !lesson) {
      navigate('/auth');
      return;
    }

    try {
      await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lesson.id,
          track_id: lesson.track_id,
          completed_at: new Date().toISOString(),
          progress_percentage: 100
        });

      setIsCompleted(true);
      toast({
        title: "Lesson completed!",
        description: "Your progress has been saved."
      });
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: "Error saving progress",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const navigateToLesson = (targetSlug: string) => {
    navigate(`/build/${trackSlug}/${targetSlug}`);
  };

  const getCurrentLessonIndex = () => {
    return lessons.findIndex(l => l.slug === lessonSlug);
  };

  const getPreviousLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    return currentIndex > 0 ? lessons[currentIndex - 1] : null;
  };

  const getNextLesson = () => {
    const currentIndex = getCurrentLessonIndex();
    return currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
  };

  if (loading) {
    return (
      <ModernContainer>
        <BuildLessonSkeleton />
      </ModernContainer>
    );
  }

  if (!lesson || !track) {
    return (
      <ModernContainer>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">Lesson Not Found</h1>
          <Button onClick={() => navigate(`/build/${trackSlug}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Track
          </Button>
        </div>
      </ModernContainer>
    );
  }

  // Premium gating for authenticated users (except first lesson preview)
  const isFirstLesson = lesson.sort_order === 1;
  const needsPremium = user && !subscribed && !isFirstLesson;

  if (needsPremium) {
    return (
      <ModernContainer>
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/build/${track.slug}`)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to {track.title}
            </Button>
          </div>

          {/* Premium Gate */}
          <Card className="border-primary/20 bg-gradient-subtle">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Lock className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl mb-2">
                Premium Lesson
              </CardTitle>
              <CardDescription className="text-lg">
                This lesson requires a premium subscription to access.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">{lesson.title}</h3>
                <p className="text-muted-foreground">{lesson.description}</p>
                {lesson.video_duration_minutes && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{lesson.video_duration_minutes} minutes</span>
                  </div>
                )}
              </div>
              
              <Button 
                size="lg" 
                onClick={() => navigate("/pricing")}
                className="bg-primary hover:bg-primary/90"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Get access to all lessons and premium content
              </p>
            </CardContent>
          </Card>
        </div>
      </ModernContainer>
    );
  }

  const previousLesson = getPreviousLesson();
  const nextLesson = getNextLesson();

  return (
    <ModernContainer>
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/build/${trackSlug}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {track.title}
          </Button>
        </div>

        {/* Lesson Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">
              Lesson {(getCurrentLessonIndex() + 1).toString().padStart(2, '0')}
            </span>
            {lesson.video_duration_minutes && (
              <span className="text-sm text-muted-foreground">
                • {lesson.video_duration_minutes} min
              </span>
            )}
            {isCompleted && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {lesson.title}
          </h1>
          {lesson.description && (
            <p className="text-xl text-muted-foreground">
              {lesson.description}
            </p>
          )}
        </div>

        {/* Lesson Content Tabs */}
        <div className="mb-8">
          <LessonContentTabs
            videoUrl={lesson.video_url}
            content={lesson.lesson_content}
            resources={[
              {
                title: "Lesson Workbook",
                url: "#",
                type: "pdf"
              },
              {
                title: "Template Files",
                url: "#",
                type: "template"
              }
            ]}
            discussion={{
              enabled: true,
              count: 12
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => previousLesson && navigateToLesson(previousLesson.slug)}
            disabled={!previousLesson}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <Button
            onClick={markComplete}
            variant={isCompleted ? "secondary" : "default"}
            disabled={isCompleted}
          >
            {isCompleted ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Completed
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Complete
              </>
            )}
          </Button>

          <Button
            onClick={() => nextLesson && navigateToLesson(nextLesson.slug)}
            disabled={!nextLesson}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Sign-in prompt for guests */}
        {!user && (
          <Card className="glass-card p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Sign in to track your progress and access all features
            </p>
            <Button onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </Card>
        )}
      </div>
    </ModernContainer>
  );
};

export default BuildLesson;