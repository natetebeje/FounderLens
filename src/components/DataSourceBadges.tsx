import { Badge } from '@/components/ui/badge';
import { Brain, MessageSquare, Search, Database, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface DataSourceBadgesProps {
  hasAiValidation: boolean;
  hasRedditData: boolean;
  hasMarketData?: boolean;
  className?: string;
}

export const DataSourceBadges = ({ 
  hasAiValidation, 
  hasRedditData, 
  hasMarketData = false,
  className = '' 
}: DataSourceBadgesProps) => {
  const sources = [];

  if (hasAiValidation) {
    sources.push({
      icon: Brain,
      label: 'AI Analysis',
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      status: 'complete'
    });
  }

  if (hasRedditData) {
    sources.push({
      icon: MessageSquare,
      label: 'Reddit Data',
      color: 'bg-orange-100 text-orange-700 border-orange-300',
      status: 'complete'
    });
  }

  if (hasMarketData) {
    sources.push({
      icon: Search,
      label: 'Market Intel',
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      status: 'complete'
    });
  }

  if (sources.length === 0) {
    return (
      <Badge variant="outline" className={`text-xs ${className}`}>
        <Clock className="w-3 h-3 mr-1" />
        No Data Sources
      </Badge>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {sources.map((source, index) => {
        const Icon = source.icon;
        return (
          <Badge 
            key={index}
            variant="outline" 
            className={`text-xs ${source.color} border`}
          >
            <Icon className="w-3 h-3 mr-1" />
            {source.label}
          </Badge>
        );
      })}
    </div>
  );
};