import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ClickableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export const ClickableCard = React.forwardRef<
  HTMLDivElement,
  ClickableCardProps
>(({ className, onClick, disabled = false, children, ...props }, ref) => {
  return (
    <Card
      ref={ref}
      className={cn(
        'transition-all duration-200',
        !disabled && onClick && [
          'cursor-pointer hover:shadow-soft',
          'hover:scale-[1.02] active:scale-[0.98]'
        ],
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      onClick={disabled ? undefined : onClick}
      {...props}
    >
      {children}
    </Card>
  );
});

ClickableCard.displayName = 'ClickableCard';