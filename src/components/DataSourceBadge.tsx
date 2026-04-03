
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Sparkles, Database, Clock, AlertTriangle, Search, MessageSquare } from 'lucide-react';

interface DataSourceBadgeProps {
  source: 'ai' | 'reddit' | 'real' | 'pending' | 'market-gap' | 'reddit-data' | 'limited-data' | 'no-data';
  className?: string;
  showIcon?: boolean;
}

export const DataSourceBadge = ({ source, className = '', showIcon = true }: DataSourceBadgeProps) => {
  const configs = {
    ai: {
      variant: 'secondary' as const,
      icon: Sparkles,
      label: 'AI Generated',
      color: 'text-blue-600'
    },
    reddit: {
      variant: 'outline' as const,
      icon: Database,
      label: 'Reddit Data',
      color: 'text-green-600'
    },
    'reddit-data': {
      variant: 'default' as const,
      icon: Database,
      label: 'Reddit Data',
      color: 'text-green-600'
    },
    'limited-data': {
      variant: 'outline' as const,
      icon: MessageSquare,
      label: 'Limited Discussions',
      color: 'text-amber-600'
    },
    'no-data': {
      variant: 'outline' as const,
      icon: Search,
      label: 'No Reddit Data',
      color: 'text-gray-600'
    },
    real: {
      variant: 'default' as const,
      icon: AlertTriangle,
      label: 'Market Gap',
      color: 'text-orange-600'
    },
    'market-gap': {
      variant: 'outline' as const,
      icon: AlertTriangle,
      label: 'Market Gap',
      color: 'text-orange-600'
    },
    pending: {
      variant: 'outline' as const,
      icon: Clock,
      label: 'Analysis Pending',
      color: 'text-gray-600'
    }
  };

  const config = configs[source];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`text-xs ${className}`}>
      {showIcon && <Icon className={`w-3 h-3 mr-1 ${config.color}`} />}
      {config.label}
    </Badge>
  );
};
