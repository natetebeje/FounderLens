
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { X, Lightbulb } from "lucide-react";

interface GuidedTooltipProps {
  id: string;
  children: React.ReactNode;
  title: string;
  description: string;
  showOnce?: boolean;
}

export const GuidedTooltip = ({ 
  id, 
  children, 
  title, 
  description, 
  showOnce = true 
}: GuidedTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  useEffect(() => {
    if (showOnce) {
      const shownTooltips = JSON.parse(localStorage.getItem('shownTooltips') || '[]');
      if (!shownTooltips.includes(id)) {
        setIsVisible(true);
        const newShownTooltips = [...shownTooltips, id];
        localStorage.setItem('shownTooltips', JSON.stringify(newShownTooltips));
      }
      setHasBeenShown(shownTooltips.includes(id));
    }
  }, [id, showOnce]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (showOnce && hasBeenShown && !isVisible) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip open={isVisible} onOpenChange={setIsVisible}>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            {isVisible && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-4" side="bottom">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">{title}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleDismiss}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
