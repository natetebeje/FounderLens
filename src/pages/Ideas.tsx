import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ModernContainer } from "@/components/ui/modern-background";
import { IdeasHero } from "@/components/content/IdeasHero";
import { IdeasGrid } from "@/components/content/IdeasGrid";
import { IdeasFilters } from "@/components/content/IdeasFilters";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useToast } from "@/hooks/use-toast";

interface IdeaOpportunity {
  id: string;
  title: string;
  description: string;
  industry?: string;
  target_market?: string;
  business_model?: string;
  estimated_market_size?: string;
  competition_level?: string;
  difficulty_score?: number;
  ai_confidence_score?: number;
  validation_status?: string;
  created_at: string;
  tags: string[];
  automated_analysis?: any;
  reddit_validation?: any;
}

const Ideas = () => {
  const [searchParams] = useSearchParams();
  const [ideas, setIdeas] = useState<IdeaOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalIdeas, setTotalIdeas] = useState(0);
  const { toast } = useToast();

  const selectedIndustry = searchParams.get('industry');
  const selectedDifficulty = searchParams.get('difficulty');
  const sortBy = searchParams.get('sort') || 'newest';

  useEffect(() => {
    const fetchIdeas = async () => {
      try {
        setLoading(true);
        
        // Simplified query to avoid TypeScript inference issues
        const { data: opportunities, error } = await supabase
          .from('business_opportunities')
          .select('*')
          .eq('validation_status', 'completed')
          .limit(50);
        
        if (error) throw error;

        // Transform the data with simplified structure
        const transformedIdeas: IdeaOpportunity[] = (opportunities || []).map((opportunity: any) => ({
          id: opportunity.id,
          title: opportunity.title,
          description: opportunity.description,
          industry: opportunity.title?.split(' ')[0] || 'General',
          target_market: opportunity.target_market || 'To be defined',
          business_model: 'To be defined',
          estimated_market_size: 'To be researched',
          competition_level: opportunity.competition_level || 'medium',
          difficulty_score: opportunity.difficulty_level === 'high' ? 8 : opportunity.difficulty_level === 'medium' ? 5 : 3,
          ai_confidence_score: opportunity.ai_confidence_score || 75,
          validation_status: opportunity.validation_status,
          created_at: opportunity.created_at,
          tags: [opportunity.title?.split(' ')[0] || 'General', 'Validated'].filter(Boolean),
          automated_analysis: null,
          reddit_validation: null
        }));

        setIdeas(transformedIdeas);
        setTotalIdeas(transformedIdeas.length);
      } catch (error: any) {
        console.error('Error fetching ideas:', error);
        toast({
          title: "Error loading ideas",
          description: "Please try again later",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchIdeas();
  }, [selectedIndustry, selectedDifficulty, sortBy, toast]);

  // Simplified filtering logic - can be enhanced later
  const filterIdeas = (ideas: IdeaOpportunity[]) => {
    let filtered = [...ideas];
    
    if (selectedIndustry) {
      filtered = filtered.filter(idea => 
        idea.industry?.toLowerCase().includes(selectedIndustry.toLowerCase())
      );
    }
    
    if (selectedDifficulty) {
      const difficultyMap: { [key: string]: number[] } = {
        'easy': [1, 2, 3],
        'medium': [4, 5, 6], 
        'hard': [7, 8, 9, 10]
      };
      const validScores = difficultyMap[selectedDifficulty] || [];
      filtered = filtered.filter(idea => 
        idea.difficulty_score && validScores.includes(idea.difficulty_score)
      );
    }
    
    // Apply sorting
    if (sortBy === 'confidence') {
      filtered.sort((a, b) => (b.ai_confidence_score || 0) - (a.ai_confidence_score || 0));
    } else if (sortBy === 'difficulty') {
      filtered.sort((a, b) => (a.difficulty_score || 0) - (b.difficulty_score || 0));
    } else if (sortBy === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <ModernContainer>
        <LoadingSkeleton />
      </ModernContainer>
    );
  }

  return (
    <ModernContainer>
      <div className="space-y-12">
        <IdeasHero totalIdeas={totalIdeas} />
        
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/4">
            <IdeasFilters 
              selectedIndustry={selectedIndustry}
              selectedDifficulty={selectedDifficulty}
              sortBy={sortBy}
            />
          </div>
          
          <div className="lg:w-3/4">
            <IdeasGrid ideas={filterIdeas(ideas)} />
          </div>
        </div>
      </div>
    </ModernContainer>
  );
};

export default Ideas;