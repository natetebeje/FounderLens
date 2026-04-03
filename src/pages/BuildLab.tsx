import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ModernContainer } from "@/components/ui/modern-background";
import { BuildHeroSimple } from "@/components/build/BuildHeroSimple";
import { BuildFilters } from "@/components/build/BuildFilters";
import { BuildTracksGrid } from "@/components/build/BuildTracksGrid";
import { BuildLabSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import { getBuildTrackForOpportunity } from "@/utils/build-mappings";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";

interface BuildTrack {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty_level: string;
  estimated_duration_hours: number;
  featured_image_url?: string;
  sort_order: number;
  lesson_count: number;
  user_progress?: {
    completed_lessons: number;
    total_lessons: number;
    last_accessed: string;
  };
}

const BuildLab = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState<BuildTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const { toast } = useToast();
  const { subscribed } = useSubscription();
  const { user } = useAuth();

  // Handle auto-redirect from opportunities
  useEffect(() => {
    const fromSource = searchParams.get('from');
    const opportunityId = searchParams.get('id');
    
    if (fromSource === 'opportunity' && opportunityId) {
      const buildTrack = getBuildTrackForOpportunity(opportunityId);
      if (buildTrack) {
        navigate(`/build/${buildTrack.buildTrackSlug}?from=opportunity&id=${opportunityId}`);
        return;
      }
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('build_tracks')
          .select(`
            *,
            build_lessons(count)
          `)
          .eq('is_published', true)
          .order('sort_order', { ascending: true });
        
        if (error) throw error;

        const transformedTracks = data?.map(track => ({
          ...track,
          lesson_count: track.build_lessons?.[0]?.count || 0
        })) || [];

        setTracks(transformedTracks);
      } catch (error: any) {
        console.error('Error fetching tracks:', error);
        toast({
          title: "Error loading tracks",
          description: "Please try again later",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, [toast]);

  // Filter tracks based on search and difficulty
  const filteredTracks = useMemo(() => {
    return tracks.filter(track => {
      const matchesSearch = track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           track.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = difficultyFilter === "all" || 
                               track.difficulty_level.toLowerCase() === difficultyFilter.toLowerCase();
      return matchesSearch && matchesDifficulty;
    });
  }, [tracks, searchTerm, difficultyFilter]);

  if (loading) {
    return (
      <ModernContainer>
        <BuildLabSkeleton />
      </ModernContainer>
    );
  }

  // Premium gating for authenticated users
  if (user && !subscribed) {
    return (
      <ModernContainer>
        <div className="space-y-12">
          <BuildHeroSimple />
          
          {/* Premium gate */}
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/20 bg-gradient-subtle">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Crown className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl mb-2">
                  Unlock Premium Build Courses
                </CardTitle>
                <CardDescription className="text-lg">
                  Get access to step-by-step video courses that guide you through building successful businesses.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div className="space-y-2">
                    <h4 className="font-semibold">Expert-Led Videos</h4>
                    <p className="text-sm text-muted-foreground">Learn from successful founders and experts</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Step-by-Step</h4>
                    <p className="text-sm text-muted-foreground">Clear, actionable lessons you can follow</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Real Examples</h4>
                    <p className="text-sm text-muted-foreground">Templates and case studies included</p>
                  </div>
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
                  Preview a few lessons below or upgrade for full access
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Show limited tracks for preview */}
          <BuildTracksGrid tracks={tracks.slice(0, 2)} showSeeAllButton />
        </div>
      </ModernContainer>
    );
  }

  return (
    <ModernContainer>
      <div className="space-y-12">
        <BuildHeroSimple />
        <BuildFilters 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          difficultyFilter={difficultyFilter}
          onDifficultyChange={setDifficultyFilter}
        />
        <BuildTracksGrid tracks={filteredTracks} showSeeAllButton />
      </div>
    </ModernContainer>
  );
};

export default BuildLab;