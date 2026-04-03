import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { DataSourceBadges } from './DataSourceBadges';

interface ValidationScoreCardProps {
  aiScore: number;
  redditScore: number;
  overallScore: number;
  hasAiValidation: boolean;
  hasRedditData: boolean;
  className?: string;
}

export const ValidationScoreCard = ({
  aiScore,
  redditScore,
  overallScore,
  hasAiValidation,
  hasRedditData,
  className = ''
}: ValidationScoreCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusBadge = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getStatusLabel = (score: number) => {
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Moderate';
    return 'Weak';
  };

  return (
    <Card className={`border-2 border-primary/20 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Validation Overview</CardTitle>
            <DataSourceBadges 
              hasAiValidation={hasAiValidation}
              hasRedditData={hasRedditData}
              className="mt-2"
            />
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </div>
            <Badge className={`${getStatusBadge(overallScore)} border text-sm`}>
              {getStatusLabel(overallScore)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AI Validation Score */}
          <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
            <Brain className="w-5 h-5 text-purple-600 mx-auto mb-2" />
            <div className={`text-xl font-bold ${getScoreColor(aiScore)}`}>
              {aiScore}%
            </div>
            <div className="text-xs text-purple-600 font-medium">AI Validation</div>
            {!hasAiValidation && (
              <div className="text-xs text-muted-foreground mt-1">Not Started</div>
            )}
          </div>

          {/* Reddit Community Score */}
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <MessageSquare className="w-5 h-5 text-orange-600 mx-auto mb-2" />
            <div className={`text-xl font-bold ${getScoreColor(redditScore)}`}>
              {redditScore}%
            </div>
            <div className="text-xs text-orange-600 font-medium">Reddit Community</div>
            {!hasRedditData && (
              <div className="text-xs text-muted-foreground mt-1">Not Analyzed</div>
            )}
          </div>

          {/* Overall Progress */}
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-2" />
            <div className={`text-xl font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </div>
            <div className="text-xs text-blue-600 font-medium">Overall Score</div>
            <div className="text-xs text-muted-foreground mt-1">
              {getStatusLabel(overallScore)} Validation
            </div>
          </div>
        </div>
        
        {/* Score Breakdown */}
        {(hasAiValidation || hasRedditData) && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-2">Score Methodology:</div>
            <div className="space-y-1 text-xs">
              {hasAiValidation && hasRedditData && (
                <>
                  <div className="flex justify-between">
                    <span>AI Validation (60%)</span>
                    <span className="font-medium">{Math.round(aiScore * 0.6)}pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reddit Community (30%)</span>
                    <span className="font-medium">{Math.round(redditScore * 0.3)}pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Tasks (10%)</span>
                    <span className="font-medium">{Math.round((overallScore - aiScore * 0.6 - redditScore * 0.3))}pts</span>
                  </div>
                </>
              )}
              {hasAiValidation && !hasRedditData && (
                <>
                  <div className="flex justify-between">
                    <span>AI Validation (80%)</span>
                    <span className="font-medium">{Math.round(aiScore * 0.8)}pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Tasks (20%)</span>
                    <span className="font-medium">{overallScore - Math.round(aiScore * 0.8)}pts</span>
                  </div>
                </>
              )}
              {!hasAiValidation && hasRedditData && (
                <>
                  <div className="flex justify-between">
                    <span>Reddit Community (80%)</span>
                    <span className="font-medium">{Math.round(redditScore * 0.8)}pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Tasks (20%)</span>
                    <span className="font-medium">{overallScore - Math.round(redditScore * 0.8)}pts</span>
                  </div>
                </>
              )}
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                <div>• AI: Based on market sizing, competition, technical feasibility</div>
                <div>• Reddit: Discussions found, relevance, engagement quality</div>
                <div>• Scores update as new data becomes available</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};