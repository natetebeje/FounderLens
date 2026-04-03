import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

interface ModernBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'mesh' | 'glass';
  className?: string;
}

export const ModernBackground: React.FC<ModernBackgroundProps> = ({
  children,
  variant = 'default',
  className,
}) => {
  const { actualTheme } = useTheme();

  const getBackgroundClasses = () => {
    switch (variant) {
      case 'subtle':
        return 'bg-gradient-subtle';
      case 'mesh':
        return 'bg-page-pattern';
      case 'glass':
        return 'bg-gradient-glass backdrop-blur-glass';
      default:
        return actualTheme === 'dark' ? 'bg-modern-dark' : 'bg-modern-light';
    }
  };

  return (
    <div className={cn(
      'min-h-screen transition-smooth',
      getBackgroundClasses(),
      className
    )}>
      {children}
    </div>
  );
};

export const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle';
}> = ({ children, className, variant = 'default' }) => {
  return (
    <div className={cn(
      'rounded-lg transition-smooth',
      variant === 'subtle' ? 'glass-subtle' : 'glass-card',
      className
    )}>
      {children}
    </div>
  );
};

export const ModernContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn(
      'container mx-auto px-4 py-6 relative z-10',
      className
    )}>
      {children}
    </div>
  );
};
