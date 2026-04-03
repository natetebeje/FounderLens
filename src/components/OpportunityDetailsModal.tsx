
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Target, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  DollarSign,
  Play
} from 'lucide-react';
import { DataSourceBadge } from './DataSourceBadge';
import { CommunityIntelligence } from './CommunityIntelligence';
import { DataConfidenceBadge } from './DataConfidenceBadge';
import { BuildThisButton } from './BuildThisButton';

interface OpportunityDetailsModalProps {
  opportunity: any;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onToggleFavorite?: (opportunityId: string) => Promise<void>;
  onStartValidation?: (opportunityId: string) => void;
}

export const OpportunityDetailsModal = ({ 
  opportunity, 
  isOpen, 
  onClose, 
  onRefresh,
  onStartValidation 
}: OpportunityDetailsModalProps) => {
  if (!opportunity) return null;

  const redditAnalysis = opportunity.reddit_analysis || {};
  const hasRealData = redditAnalysis.has_real_data || false;
  const posts = redditAnalysis.posts || [];
  const discussionVolume = posts.length;
  const rawRedditData = redditAnalysis.raw_reddit_data || '';
  const dataSource = redditAnalysis.data_source || 'fallback';

  // Get validation status
  const validationStatus = opportunity.validation_status || 'not_started';
  
  const getValidationStatusDisplay = () => {
    switch (validationStatus) {
      case 'in_progress':
        return { 
          icon: Clock, 
          label: 'Validation In Progress', 
          color: 'text-blue-600',
          iconClass: ''
        };
      case 'completed':
        return { 
          icon: CheckCircle, 
          label: 'Validation Completed', 
          color: 'text-green-600',
          iconClass: ''
        };
      default:
        return { 
          icon: Target, 
          label: 'Ready for Validation', 
          color: 'text-gray-600',
          iconClass: ''
        };
    }
  };

  const validationDisplay = getValidationStatusDisplay();

  // Get Reddit status for display
  const getRedditDisplayData = () => {
    if (!redditAnalysis || Object.keys(redditAnalysis).length === 0) {
      return {
        status: 'No Analysis',
        badge: 'pending',
        message: 'Reddit analysis has not been performed for this opportunity yet.',
        showRefresh: true
      };
    }
    
    if (hasRealData && discussionVolume > 0) {
      return {
        status: 'Real Data Found',
        badge: 'reddit',
        message: rawRedditData,
        showRefresh: true
      };
    }
    
    // Market gap - no relevant discussions found
    return {
      status: 'Market Gap Identified',
      badge: 'market-gap',
      message: rawRedditData || 'No relevant business discussions found for this opportunity. This could indicate a market gap or validation opportunity requiring primary research.',
      showRefresh: true
    };
  };

  const redditDisplay = getRedditDisplayData();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl leading-tight mb-3">
                {opportunity.title}
              </DialogTitle>
              <div className="flex flex-wrap gap-2">
                {/* Validation Status Badge */}
                <Badge variant="outline" className={`${validationDisplay.color}`}>
                  <validationDisplay.icon className={`w-3 h-3 mr-1 ${validationDisplay.iconClass}`} />
                  {validationDisplay.label}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              {opportunity.ai_confidence_score && (
                <div className="text-lg font-semibold text-primary">
                  {opportunity.ai_confidence_score}% Match
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Opportunity Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground">
                  {opportunity.description}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Problem Statement</h4>
                <p className="text-muted-foreground">
                  {opportunity.problem_statement}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Target Market</h4>
                <p className="text-muted-foreground">
                  {opportunity.target_market}
                </p>
              </div>

              {opportunity.solution_approach && (
                <div>
                  <h4 className="font-medium mb-2">Solution Approach</h4>
                  <p className="text-muted-foreground">
                    {opportunity.solution_approach}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Market Analysis
                </div>
                <DataConfidenceBadge confidence="ai-estimated" showText={false} />
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                High-level estimates to guide thinking. Validate to confirm with real signals.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <DollarSign className="w-8 h-8 mx-auto text-green-500" />
                  <h4 className="font-medium">Market Size</h4>
                  <p className="text-sm text-muted-foreground">
                    {opportunity.market_size_estimate || 'To be determined'}
                  </p>
                </div>
                
                <div className="text-center space-y-2">
                  <Users className="w-8 h-8 mx-auto text-blue-500" />
                  <h4 className="font-medium">Competition Level</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {opportunity.competition_level || 'Medium'}
                  </p>
                </div>
                
                <div className="text-center space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-orange-500" />
                  <h4 className="font-medium">Time to Market</h4>
                  <p className="text-sm text-muted-foreground">
                    {opportunity.time_to_market || '6-12 months'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Market Community Summary */}
          {(opportunity.reddit_analysis?.enhanced_insights || opportunity.reddit_analysis?.ai_summary) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    AI Market Community Summary
                  </div>
                  <DataConfidenceBadge confidence="ai-estimated" showText={false} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prioritize AI summary when available */}
                {opportunity.reddit_analysis.ai_summary ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {opportunity.reddit_analysis.ai_summary}
                      </p>
                    </div>
                    
                    {opportunity.reddit_analysis.summary_bullets && opportunity.reddit_analysis.summary_bullets.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Key Insights</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {opportunity.reddit_analysis.summary_bullets.map((bullet, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Community Signals</h4>
                      <p className="text-sm text-muted-foreground">
                        Community analysis reveals {opportunity.reddit_analysis.validation_score || 0}% validation signals with {opportunity.reddit_analysis.community_engagement || 0}% engagement across {opportunity.reddit_analysis.subreddits_analyzed?.length || 0} communities. 
                        {opportunity.reddit_analysis.pain_points?.length > 0 && ` Key pain points identified include discussions around ${opportunity.target_market.toLowerCase()} challenges.`}
                      </p>
                    </div>

                    {opportunity.reddit_analysis.top_quotes && opportunity.reddit_analysis.top_quotes.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Community Insights</h4>
                        <div className="space-y-2">
                          {opportunity.reddit_analysis.top_quotes.slice(0, 2).map((quote, index) => (
                            <div key={index} className="border-l-2 border-muted pl-3">
                              <p className="text-sm italic text-muted-foreground">
                                {quote}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {opportunity.reddit_analysis.pain_point_analysis?.categories && opportunity.reddit_analysis.pain_point_analysis.categories.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Analysis Categories</h4>
                        <div className="flex flex-wrap gap-2">
                          {opportunity.reddit_analysis.pain_point_analysis.categories.map((category, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {category.replace('-', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {onStartValidation && (
                  <div className="pt-3 border-t">
                    <Button 
                      onClick={() => {
                        onStartValidation(opportunity.id);
                        onClose();
                      }}
                      className="w-full gap-2"
                      variant="outline"
                    >
                      <Play className="w-4 h-4" />
                      Dive Deeper with Full Validation
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {opportunity.opportunity_tags && opportunity.opportunity_tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Tags ({opportunity.opportunity_tags.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {opportunity.opportunity_tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons Footer */}
        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <div className="flex flex-1 gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            
            <BuildThisButton 
              opportunityId={opportunity.id}
              className="flex-1"
              showBadge={false}
            />
            
            {onStartValidation && (
              <Button 
                onClick={() => {
                  onStartValidation(opportunity.id);
                  onClose();
                }}
                className="flex-1 gap-2"
                variant={validationStatus === 'not_started' ? 'default' : 'outline'}
              >
                {validationStatus === 'completed' ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    View Results
                  </>
                ) : validationStatus === 'in_progress' ? (
                  <>
                    <Clock className="w-4 h-4" />
                    Continue
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Validate
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
