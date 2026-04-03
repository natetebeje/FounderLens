import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TouchOptimizedButtonProps extends ButtonProps {
  touchFeedback?: boolean;
}

export const TouchOptimizedButton = React.forwardRef<
  HTMLButtonElement,
  TouchOptimizedButtonProps
>(({ className, touchFeedback = true, children, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn(
        // Minimum touch target size (44px)
        "min-h-[44px] min-w-[44px]",
        // Enhanced touch feedback
        touchFeedback && "active:scale-95 transition-transform duration-75",
        // Better spacing for touch
        "px-4 py-3",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
});

TouchOptimizedButton.displayName = "TouchOptimizedButton";