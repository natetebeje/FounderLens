
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Info, Sparkles } from 'lucide-react';

interface DataConfidenceBadgeProps {
  confidence: 'high' | 'medium' | 'low' | 'ai-estimated';
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}

export const DataConfidenceBadge = ({ 
  confidence, 
  className = '', 
  showIcon = true, 
  showText = true 
}: DataConfidenceBadgeProps) => {
  const configs = {
    high: {
      variant: 'default' as const,
      icon: Shield,
      label: 'High Confidence',
      color: 'text-green-600',
      description: 'Based on real market data and analysis'
    },
    medium: {
      variant: 'secondary' as const,
      icon: Info,
      label: 'Medium Confidence',
      color: 'text-blue-600',
      description: 'Mixed real data and AI analysis'
    },
    low: {
      variant: 'outline' as const,
      icon: AlertTriangle,
      label: 'Low Confidence',
      color: 'text-amber-600',
      description: 'Limited data available'
    },
    'ai-estimated': {
      variant: 'secondary' as const,
      icon: Sparkles,
      label: 'AI Estimated',
      color: 'text-purple-600',
      description: 'Generated using AI analysis - verify independently'
    }
  };

  const config = configs[confidence];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Badge variant={config.variant} className="text-xs">
        {showIcon && <Icon className={`w-3 h-3 mr-1 ${config.color}`} />}
        {showText && config.label}
      </Badge>
    </div>
  );
};
