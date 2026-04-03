import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BuildThisButton } from "@/components/BuildThisButton";
import { TrendingUp, Users, BarChart3, Star, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface IdeaOpportunity {
  id: string;
  title: string;
  description: string;
  industry?: string;
  target_market?: string;
  business_model?: string;
  estimated_market_size?: string;
  competition_level?: string;
  difficulty_level?: string;
  founder_fit_score?: number;
  ai_confidence_score?: number;
  validation_status?: string;
  created_at: string;
  tags: string[];
  automated_analysis?: any;
  reddit_validation?: any;
}

interface IdeasGridProps {
  ideas: IdeaOpportunity[];
}

export const IdeasGrid = ({ ideas }: IdeasGridProps) => {
  const navigate = useNavigate();

  if (ideas.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-foreground mb-2">No ideas found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or check back later for new validated opportunities.
        </p>
      </div>
    );
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getConfidenceLevel = (score?: number) => {
    if (!score) return { level: 'Unknown', color: 'text-muted-foreground' };
    if (score >= 80) return { level: 'High', color: 'text-green-500' };
    if (score >= 60) return { level: 'Medium', color: 'text-yellow-500' };
    return { level: 'Low', color: 'text-red-500' };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {ideas.map((idea) => {
        const confidence = getConfidenceLevel(idea.ai_confidence_score);
        const hasValidation = idea.reddit_validation && idea.reddit_validation.length > 0;
        
        return (
          <Card key={idea.id} className="glass-card overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground line-clamp-2 leading-tight">
                      {idea.title}
                    </h3>
                  </div>
                  <Badge variant="outline" className={confidence.color}>
                    {confidence.level} Confidence
                  </Badge>
                </div>
                
                <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
                  {idea.description}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {idea.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <BarChart3 className="w-3 h-3" />
                    <span>Difficulty</span>
                  </div>
                  <p className={`font-medium capitalize ${getDifficultyColor(idea.difficulty_level)}`}>
                    {idea.difficulty_level || 'Unknown'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>Market Size</span>
                  </div>
                  <p className="font-medium text-foreground">
                    {idea.estimated_market_size || 'To be determined'}
                  </p>
                </div>
              </div>

              {/* Progress Indicators */}
              <div className="space-y-3">
                {idea.ai_confidence_score && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">AI Confidence</span>
                      <span className="text-foreground font-medium">{idea.ai_confidence_score}%</span>
                    </div>
                    <Progress value={idea.ai_confidence_score} className="h-2" />
                  </div>
                )}
                
                {idea.founder_fit_score && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Founder Fit</span>
                      <span className="text-foreground font-medium">{idea.founder_fit_score}%</span>
                    </div>
                    <Progress value={idea.founder_fit_score} className="h-2" />
                  </div>
                )}
              </div>

              {/* Validation Badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {idea.automated_analysis && (
                    <Badge variant="outline" className="text-xs">
                      <BarChart3 className="w-3 h-3 mr-1" />
                      AI Analysis
                    </Badge>
                  )}
                  {hasValidation && (
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      Community
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/validation/${idea.id}`)}
                >
                  View Analysis
                </Button>
                <BuildThisButton 
                  opportunityId={idea.id}
                  size="default"
                  className="flex-1"
                  showBadge={false}
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};