import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Target, DollarSign, ChevronRight } from 'lucide-react';

interface FocusedValidationTasksProps {
  validationScore: number;
  onTaskSelect?: (taskType: string) => void;
}

const FOCUSED_TASKS = [
  {
    id: 'customer_interviews',
    title: 'Customer Interviews',
    description: 'Conduct 5-10 interviews with potential customers',
    icon: Users,
    estimatedTime: '2-3 hours',
    impact: 'High',
    threshold: 40 // Show if score is below 40
  },
  {
    id: 'competitive_differentiation',
    title: 'Competitive Differentiation',
    description: 'Research and define your unique value proposition',
    icon: Target,
    estimatedTime: '1-2 hours',
    impact: 'Medium',
    threshold: 60 // Show if score is below 60
  },
  {
    id: 'pricing_smoke_test',
    title: 'Pricing Smoke Test',
    description: 'Test pricing with landing page or surveys',
    icon: DollarSign,
    estimatedTime: '2-4 hours',
    impact: 'High',
    threshold: 50 // Show if score is below 50
  }
];

export function FocusedValidationTasks({ validationScore, onTaskSelect }: FocusedValidationTasksProps) {
  const recommendedTasks = FOCUSED_TASKS.filter(task => validationScore < task.threshold)
    .slice(0, 3); // Max 3 tasks

  if (recommendedTasks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended Next Steps</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete these focused tasks to strengthen your validation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendedTasks.map((task) => {
          const IconComponent = task.icon;
          return (
            <div
              key={task.id}
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => onTaskSelect?.(task.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">{task.title}</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {task.description}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>⏱️ {task.estimatedTime}</span>
                      <Badge variant="outline" className="text-xs">
                        {task.impact} Impact
                      </Badge>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}