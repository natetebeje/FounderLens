import { CheckCircle, Zap, TrendingUp, Users, Play, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ValidationHeroProps {
  opportunity: any;
  validationStatus: any;
  onStartValidation: () => void;
  isRunning: boolean;
  hasResults: boolean;
}

export const ValidationHero = ({
  opportunity,
  validationStatus,
  onStartValidation,
  isRunning,
  hasResults,
}: ValidationHeroProps) => {
  const isCompleted = hasResults || validationStatus?.status === 'completed' ||
    validationStatus?.status === 'ready_to_build' || validationStatus?.status === 'needs_focused_tasks' ||
    (validationStatus?.hasAiValidation && validationStatus?.hasRedditValidation);

  const features = [
    {
      icon: Zap,
      text: "AI market analysis",
      done: !!validationStatus?.hasAiValidation
    },
    {
      icon: Users,
      text: "Community signals",
      done: !!validationStatus?.hasRedditValidation
    },
    {
      icon: TrendingUp,
      text: "Opportunity scoring",
      done: isCompleted
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-background border border-primary/20 p-6 md:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Badge variant={isCompleted ? "default" : "secondary"} className="text-sm font-medium">
              {isCompleted ? "Validation Complete" : "Market Validation"}
            </Badge>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {opportunity?.title}
            </h2>
            {isCompleted && (
              <p className="text-sm text-muted-foreground">
                Validation finished — review the results below.
              </p>
            )}
          </div>
          {isCompleted && (
            <div className="text-right flex-shrink-0">
              <div className={`text-3xl font-bold ${
                validationStatus.score >= 70 ? 'text-green-500' :
                validationStatus.score >= 50 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {validationStatus.score}%
              </div>
              <div className="text-xs text-muted-foreground">Score</div>
            </div>
          )}
        </div>

        {/* Validation Steps Status */}
        <div className="grid grid-cols-3 gap-3">
          {features.map((feature, index) => (
            <div key={index} className={`flex items-center gap-2 p-2.5 rounded-lg border ${
              feature.done
                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                : 'bg-background/50 border-border/50'
            }`}>
              {feature.done ? (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <feature.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={`text-xs md:text-sm font-medium ${
                feature.done ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
              }`}>{feature.text}</span>
            </div>
          ))}
        </div>

        {isCompleted ? (
          <Button
            onClick={onStartValidation}
            disabled={isRunning}
            size="sm"
            variant="ghost"
            className="font-medium text-muted-foreground"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            {isRunning ? "Running Analysis..." : "Re-run Validation"}
          </Button>
        ) : (
          <Button
            onClick={onStartValidation}
            disabled={isRunning}
            size="lg"
            variant="default"
            className="font-medium"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? "Running Analysis..." : "Run Validation"}
          </Button>
        )}
      </div>
    </div>
  );
};
