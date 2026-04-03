import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  SearchX, 
  FileText, 
  Users, 
  TrendingUp, 
  Database,
  Plus,
  RefreshCw,
  ExternalLink,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type?: 'search' | 'data' | 'opportunities' | 'users' | 'analytics' | 'generic';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  showSuggestions?: boolean;
  suggestions?: string[];
  isLoading?: boolean;
}

const EmptyStateConfig = {
  search: {
    icon: SearchX,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters to find what you\'re looking for.',
    actionLabel: 'Clear filters',
    suggestions: [
      'Check your spelling',
      'Use fewer keywords', 
      'Try more general terms',
      'Clear all filters'
    ]
  },
  data: {
    icon: Database,
    title: 'No data available',
    description: 'There\'s no data to display yet. Start by adding some content or wait for data to sync.',
    actionLabel: 'Refresh data',
    suggestions: [
      'Check your internet connection',
      'Verify data source settings',
      'Contact support if issue persists'
    ]
  },
  opportunities: {
    icon: TrendingUp,
    title: 'No opportunities found',
    description: 'We haven\'t discovered any market opportunities yet. Try running a new analysis or check back later.',
    actionLabel: 'Start discovery',
    secondaryActionLabel: 'Learn more',
    suggestions: [
      'Expand your search criteria',
      'Try different market segments',
      'Review trending topics',
      'Run competitive analysis'
    ]
  },
  users: {
    icon: Users,
    title: 'No users yet',
    description: 'Your workspace is empty. Invite team members to start collaborating.',
    actionLabel: 'Invite users',
    suggestions: [
      'Send invitation links',
      'Import from existing tools',
      'Set up user permissions',
      'Create user groups'
    ]
  },
  analytics: {
    icon: FileText,
    title: 'No analytics data',
    description: 'Analytics data will appear here once you have some activity. Start using the platform to see insights.',
    actionLabel: 'View setup guide',
    suggestions: [
      'Complete onboarding',
      'Generate some activity',
      'Check tracking setup',
      'Review data retention settings'
    ]
  },
  generic: {
    icon: FileText,
    title: 'Nothing here yet',
    description: 'This section is empty. Content will appear here as you use the application.',
    actionLabel: 'Get started'
  }
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'generic',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  showSuggestions = true,
  suggestions,
  isLoading = false
}) => {
  const config = EmptyStateConfig[type];
  const Icon = config.icon;
  
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalActionLabel = actionLabel || config.actionLabel;
  const finalSuggestions = suggestions || (config as any).suggestions || [];

  if (isLoading) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-16 px-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">
          {finalTitle}
        </h3>
        
        <p className="text-muted-foreground mb-8 max-w-md">
          {finalDescription}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          {finalActionLabel && (
            <Button 
              onClick={onAction}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {finalActionLabel}
            </Button>
          )}
          
          {secondaryActionLabel && (
            <Button 
              variant="outline" 
              onClick={onSecondaryAction}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {secondaryActionLabel}
            </Button>
          )}
        </div>

        {showSuggestions && finalSuggestions.length > 0 && (
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Suggestions
              </span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {finalSuggestions.map((suggestion, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs"
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};