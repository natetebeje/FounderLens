import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Users,
  MessageCircle,
  ChevronRight,
  Target,
  AlertTriangle,
  Clock,
  Play,
  CheckCircle,
  Rocket,
  MoreVertical,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { OpportunitySourceBadge } from './OpportunitySourceBadge';
import { MVPGenerator } from './MVPGenerator';
import { DeleteOpportunityDialog } from './DeleteOpportunityDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OpportunityCardProps {
  opportunity: any;
  onViewDetails: (opportunityId: string) => void;
  isHighlighted?: boolean;
  onToggleFavorite?: (opportunityId: string) => Promise<void>;
  onStartValidation?: (opportunityId: string) => void;
  onAssigneeChange?: (opportunityId: string, assigneeId?: string) => Promise<void>;
  onDeleteOpportunity?: (opportunityId: string) => Promise<void>;
}

export const OpportunityCard = ({ 
  opportunity, 
  onViewDetails, 
  isHighlighted = false,
  onStartValidation,
  onDeleteOpportunity
}: OpportunityCardProps) => {
  const [isMVPGeneratorOpen, setIsMVPGeneratorOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!onDeleteOpportunity) return;
    
    setIsDeleting(true);
    try {
      await onDeleteOpportunity(opportunity.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Get Reddit analysis data
  const redditAnalysis = opportunity.reddit_analysis || {};
  const hasRedditData = redditAnalysis.has_data === true;
  const discussionCount = redditAnalysis.discussion_count || 0;

  // Get validation status
  const validationStatus = opportunity.validation_status || 'not_started';
  
  // MVP readiness check - only requires AI validation completion
  const checkMVPReadiness = () => {
    // Check if validation has actually been started and completed
    const hasValidationStarted = validationStatus !== 'not_started';
    const aiScore = opportunity.ai_confidence_score || 0;
    const hasCompletedAIValidation = hasValidationStarted && aiScore > 0;
    
    return hasCompletedAIValidation;
  };

  const isMVPReady = checkMVPReadiness();
  
  const getValidationStatusDisplay = () => {
    switch (validationStatus) {
      case 'in_progress':
        return { 
          icon: Clock, 
          label: 'In Progress', 
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 border-blue-200',
          iconClass: ''
        };
      case 'completed':
        return { 
          icon: CheckCircle, 
          label: 'Validated', 
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          iconClass: ''
        };
      default:
        return { 
          icon: Target, 
          label: 'Ready to Validate', 
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200',
          iconClass: ''
        };
    }
  };

  const validationDisplay = getValidationStatusDisplay();

  // Show MVP button only for fully validated opportunities
  const showMVPButton = isMVPReady;
  const hasMVP = opportunity.mvp_generated;

  return (
    <>
      <Card className={`hover:shadow-md ${
        isHighlighted ? 'ring-4 md:ring-2 ring-primary shadow-lg border-primary/30 bg-primary/5' : 'transition-all duration-200'
      }`}>
        <CardHeader className="pb-3 px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base md:text-lg leading-tight mb-2 line-clamp-2">
                {opportunity.title}
              </CardTitle>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <OpportunitySourceBadge 
                  source={opportunity.source || 'discovery'} 
                  className="text-xs"
                />
                {hasMVP && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                    <Rocket className="w-3 h-3 mr-1" />
                    MVP Ready
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right md:text-right text-left flex-shrink-0 md:self-start flex items-start gap-2">
              {opportunity.ai_confidence_score && (
                <div className="text-sm md:text-sm font-medium text-primary">
                  {opportunity.ai_confidence_score}% Match
                </div>
              )}
              {onDeleteOpportunity && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewDetails(opportunity.id)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3 md:space-y-4 px-4 md:px-6">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {opportunity.description || opportunity.problem_statement}
          </p>

          {/* Market Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="space-y-1 sm:space-y-1 flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0">
              <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1 sm:flex-auto text-left sm:text-center">
                <div className="text-xs text-muted-foreground">Market Size</div>
                <div className="text-sm font-medium">
                  {opportunity.market_size_estimate ? 
                    opportunity.market_size_estimate.replace(/\b\w+\s+market/i, '').trim() :
                    'Moderate'
                  }
                </div>
              </div>
            </div>
            
            <div className="space-y-1 sm:space-y-1 flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0">
              <Users className="w-4 h-4 text-green-500 flex-shrink-0" />
              <div className="flex-1 sm:flex-auto text-left sm:text-center">
                <div className="text-xs text-muted-foreground">Competition</div>
                <div className="text-sm font-medium capitalize">
                  {opportunity.competition_level || 'Medium'}
                </div>
              </div>
            </div>
            
            <div className="space-y-1 sm:space-y-1 flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0">
              <MessageCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="flex-1 sm:flex-auto text-left sm:text-center">
                <div className="text-xs text-muted-foreground">Validation</div>
                <div className={`text-sm font-medium ${
                  validationStatus === 'completed' ? 'text-green-600' :
                  validationStatus === 'in_progress' ? 'text-blue-600' : ''
                }`}>
                  {validationStatus === 'completed' ? 'Validated' :
                   validationStatus === 'in_progress' ? 'In Progress' : 'Not Started'}
                </div>
              </div>
            </div>
          </div>


          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="flex-1 group"
              size="sm"
              onClick={() => onViewDetails(opportunity.id)}
            >
              <span className="sm:hidden">Details</span>
              <span className="hidden sm:inline">View Details</span>
              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            {onStartValidation && validationStatus !== 'completed' && (
              <Button 
                variant={validationStatus === 'not_started' ? 'hero' : 'outline'}
                className="flex-1 group"
                size="sm"
                onClick={() => onStartValidation(opportunity.id)}
              >
                <Play className="w-4 h-4 mr-2" />
                <span className="sm:hidden">
                  {validationStatus === 'not_started' ? 'Validate' : 'Continue Validation'}
                </span>
                <span className="hidden sm:inline">
                  {validationStatus === 'not_started' ? 'Start Validation' : 'Continue Validation'}
                </span>
              </Button>
            )}
            
            {validationStatus === 'completed' && (
              <Button 
                variant="outline"
                className="flex-1 group"
                size="sm"
                onClick={() => onStartValidation?.(opportunity.id)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                <span className="sm:hidden">Results</span>
                <span className="hidden sm:inline">View Results</span>
              </Button>
            )}
          </div>

          {/* Build This Button - For all opportunities */}
          <div className="pt-2 border-t">
            <Button 
              variant="hero"
              className="w-full group"
              onClick={() => window.location.href = `/build?from=opportunity&id=${opportunity.id}`}
            >
              <Rocket className="w-4 h-4 mr-2" />
              Build This
            </Button>
          </div>

          {/* Show validation requirement message for incomplete validation */}
          {validationStatus === 'completed' && !isMVPReady && (
            <div className="pt-2 border-t">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Complete AI validation to unlock MVP generation</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <MVPGenerator
        opportunity={opportunity}
        isOpen={isMVPGeneratorOpen}
        onClose={() => setIsMVPGeneratorOpen(false)}
      />

      <DeleteOpportunityDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        opportunityTitle={opportunity.title}
        isDeleting={isDeleting}
      />
    </>
  );
};
