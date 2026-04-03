import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StandardTooltipProps {
  content: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export const StandardTooltip = ({
  content,
  icon: Icon = HelpCircle,
  iconClassName,
  side = "top",
  className
}: StandardTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon 
            className={cn(
              "w-4 h-4 text-muted-foreground hover:text-foreground cursor-help transition-colors",
              iconClassName
            )} 
          />
        </TooltipTrigger>
        <TooltipContent side={side} className={cn("max-w-xs", className)}>
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};