
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, Circle } from "lucide-react";

interface ProgressItem {
  id: string;
  label: string;
  completed: boolean;
}

interface ProgressIndicatorProps {
  items: ProgressItem[];
  className?: string;
}

export const ProgressIndicator = ({ items, className = "" }: ProgressIndicatorProps) => {
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`cursor-help ${className}`}>
            Profile: {percentage}% Complete
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <p className="font-medium">Profile Completion</p>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                {item.completed ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <Circle className="w-3 h-3 text-muted-foreground" />
                )}
                <span className={item.completed ? "text-green-500" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
