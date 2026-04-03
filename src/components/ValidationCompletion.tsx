
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Rocket, TrendingUp, Users, Clock, Target } from 'lucide-react';
import { BuildThisButton } from './BuildThisButton';

interface ValidationCompletionProps {
  opportunity: any;
  overallProgress: number;
  aiScore: number;
  completedTasks: number;
  totalTasks: number;
  mvpReadiness: {
    isReady: boolean;
    aiValidationComplete: boolean;
    overallProgressGood: boolean;
    hasRealRedditData: boolean;
    overallProgress: number;
    aiScore: number;
  };
}

export const ValidationCompletion = ({ 
  opportunity, 
  overallProgress, 
  aiScore, 
  completedTasks, 
  totalTasks,
  mvpReadiness
}: ValidationCompletionProps) => {

  // Check if AI validation has actually been completed
  const hasValidationStarted = opportunity.validation_status !== 'not_started';
  const hasCompletedAIValidation = hasValidationStarted && aiScore > 0;
  
  // Simplified requirement: Only AI validation needed
  const isReady = hasCompletedAIValidation;

  // Create validation checklist
  const validationChecklist = [
    {
      label: 'AI Signals Check Complete',
      completed: hasCompletedAIValidation,
      description: `AI signals score: ${aiScore}% (AI signals check must be completed)`,
      icon: hasCompletedAIValidation ? CheckCircle : Clock
    }
  ];

  return (
    <div className="space-y-6">
      {/* Build Track Readiness Status */}
      <Card className={`border-2 ${isReady ? 'border-green-500/20 bg-gradient-to-r from-green-50 to-emerald-50' : 'border-orange-500/20 bg-gradient-to-r from-orange-50 to-amber-50'}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isReady ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
              {isReady ? (
                <Rocket className="w-6 h-6 text-green-600" />
              ) : (
                <Clock className="w-6 h-6 text-orange-600" />
              )}
            </div>
            <div>
              <CardTitle className={`text-2xl ${isReady ? 'text-green-800' : 'text-orange-800'}`}>
                {isReady ? 'Ready for Build Track! 🎉' : 'Complete signals to enable Build Track'}
              </CardTitle>
              <p className={`mt-1 ${isReady ? 'text-green-700' : 'text-orange-700'}`}>
                {isReady 
                  ? 'Strong signals detected. Start the Build Track to implement.'
                  : 'Run the AI Signals Check to enable the Build Track.'
                }
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
                <div className="font-semibold text-green-800">{overallProgress}%</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-muted-foreground">AI Analysis</div>
                <div className="font-semibold text-blue-800">{aiScore}%</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-sm text-muted-foreground">Tasks Complete</div>
                <div className="font-semibold text-purple-800">{completedTasks}/{totalTasks}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Requirements Checklist */}
      {!isReady && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Validation Requirements
            </CardTitle>
              <p className="text-muted-foreground">
              Complete these requirements to enable the Build Track with validated signals.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationChecklist.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${item.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <Icon className={`w-5 h-5 mt-0.5 ${item.completed ? 'text-green-600' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <div className={`font-medium ${item.completed ? 'text-green-800' : 'text-gray-700'}`}>
                      {item.label}
                      {item.completed && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">Complete</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Build Track Section - Only shown when ready */}
      {isReady && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Ready for Build Track
            </CardTitle>
            <p className="text-muted-foreground">
              Strong signals detected! Follow our step-by-step Build Track to implement your validated opportunity.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold mb-2">What happens next:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• We'll recommend the right Build Track</li>
                <li>• Follow step-by-step videos</li>
                <li>• Ship a working app</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <BuildThisButton 
                opportunityId={opportunity?.id} 
                size="lg" 
                className="flex-1" 
                showBadge={false}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
