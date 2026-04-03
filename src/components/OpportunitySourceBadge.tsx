import { Badge } from '@/components/ui/badge';
import { Search, Rocket } from 'lucide-react';

interface OpportunitySourceBadgeProps {
  source: 'discovery' | 'mvp_generated';
  className?: string;
}

export const OpportunitySourceBadge = ({ source, className }: OpportunitySourceBadgeProps) => {
  const getSourceConfig = () => {
    switch (source) {
      case 'mvp_generated':
        return {
          icon: Rocket,
          label: 'MVP Generated',
          variant: 'default' as const,
          className: 'bg-primary/10 text-primary border-primary/20'
        };
      case 'discovery':
      default:
        return {
          icon: Search,
          label: 'Discovery',
          variant: 'outline' as const,
          className: 'bg-green-50 text-green-700 border-green-200'
        };
    }
  };

  const config = getSourceConfig();
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`text-xs gap-1 ${config.className} ${className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
};