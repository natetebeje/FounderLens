import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Users, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface BuildTrack {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  estimated_duration_hours: number;
  enrollment_count?: number;
  enrollment_limit?: number;
}

interface TrackEnrollPanelProps {
  track: BuildTrack;
  onEnroll: () => void;
}

export const TrackEnrollPanel = ({ track, onEnroll }: TrackEnrollPanelProps) => {
  const [enrolling, setEnrolling] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleEnroll = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to enroll in this program.",
        variant: "destructive"
      });
      return;
    }

    try {
      setEnrolling(true);
      
      const { error } = await supabase
        .from('track_enrollments')
        .insert({
          user_id: user.id,
          track_id: track.id
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already enrolled",
            description: "You're already enrolled in this program!",
            variant: "default"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Enrollment successful!",
          description: `You've successfully enrolled in ${track.title}`,
        });
        onEnroll();
      }
    } catch (error: any) {
      console.error('Error enrolling:', error);
      toast({
        title: "Enrollment failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Program Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="capitalize">
              {track.difficulty_level}
            </Badge>
            <Badge variant="secondary">
              Program
            </Badge>
          </div>
          <CardTitle className="text-2xl">{track.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-lg">
            {track.description}
          </p>
          
          <div className="flex flex-wrap gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{track.estimated_duration_hours} hours</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Hands-on lessons</span>
            </div>
            {track.enrollment_count !== undefined && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{track.enrollment_count} enrolled</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* What You'll Learn */}
      <Card>
        <CardHeader>
          <CardTitle>What You'll Learn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Build a complete SaaS application from scratch</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Implement user authentication and authorization</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Design responsive and modern user interfaces</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Deploy your application to production</span>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <span>Use AI tools to accelerate development</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enroll CTA */}
      <Card className="border-primary/20 bg-gradient-subtle">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">Ready to start building?</h3>
            <p className="text-muted-foreground">
              Join the program and start learning immediately
            </p>
            <Button 
              onClick={handleEnroll}
              disabled={enrolling}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              {enrolling ? "Enrolling..." : "Enroll Now - Free"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};