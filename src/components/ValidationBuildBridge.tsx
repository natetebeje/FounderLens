import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Rocket, CheckCircle, Brain, Target, Calendar } from 'lucide-react';

interface ValidationBuildBridgeProps {
  opportunityId: string;
  validationScore: number;
  hasAiValidation: boolean;
  hasRedditValidation: boolean;
}

export const ValidationBuildBridge = ({ 
  opportunityId, 
  validationScore, 
  hasAiValidation, 
  hasRedditValidation 
}: ValidationBuildBridgeProps) => {
  
  const isReadyToBuild = validationScore >= 50 && (hasAiValidation || hasRedditValidation);
  
  if (!isReadyToBuild) {
    return (
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-amber-900">Complete Validation First</CardTitle>
              <CardDescription className="text-amber-700">
                Build programs unlock after validation reaches 50% completion
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                {hasAiValidation ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Brain className="w-4 h-4 text-gray-400" />
                )}
                <span className={hasAiValidation ? "text-green-700" : "text-gray-500"}>
                  AI Validation
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasRedditValidation ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Calendar className="w-4 h-4 text-gray-400" />
                )}
                <span className={hasRedditValidation ? "text-green-700" : "text-gray-500"}>
                  Market Intelligence
                </span>
              </div>
            </div>
            <p className="text-sm text-amber-700">
              Current score: <strong>{validationScore}%</strong> (Need 50% minimum)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-primary">🎉 Validation Complete - Ready to Build!</CardTitle>
            <CardDescription>
              Transform your validated opportunity into a real product with step-by-step build programs
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Evidence-based foundation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Step-by-step programs</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Launch-ready MVP</span>
            </div>
          </div>
          
          <div className="bg-white/50 rounded-lg p-3 border">
            <div className="text-sm font-medium text-primary mb-1">
              Validation Score: {validationScore}% ✅
            </div>
            <div className="text-xs text-muted-foreground">
              {hasAiValidation && hasRedditValidation 
                ? "Both AI and Market validation complete" 
                : hasAiValidation 
                ? "AI validation complete" 
                : "Market intelligence complete"}
            </div>
          </div>
          
          <Button 
            variant="hero"
            size="lg"
            className="w-full group h-12 text-base"
            onClick={() => window.location.href = `/build?from=opportunity&id=${opportunityId}`}
          >
            <Rocket className="w-5 h-5 mr-2" />
            Explore Build Programs
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};