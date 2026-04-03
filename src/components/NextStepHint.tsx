import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Lightbulb, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface NextStepHintProps {
  opportunity: any;
  onNextStep: () => void;
  nextStepText: string;
  hintText: string;
  loading?: boolean;
}

export const NextStepHint = ({ 
  opportunity, 
  onNextStep, 
  nextStepText, 
  hintText,
  loading = false
}: NextStepHintProps) => {
  const [internalLoading, setInternalLoading] = useState(false);
  
  const handleClick = async () => {
    setInternalLoading(true);
    try {
      await onNextStep();
    } finally {
      // Keep loading state for a bit to show user something happened
      setTimeout(() => setInternalLoading(false), 1000);
    }
  };

  const isLoading = loading || internalLoading;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Lightbulb className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium text-primary">Next Step</div>
            <div className="text-sm text-muted-foreground" aria-live="polite">
              {isLoading ? "Processing..." : hintText}
            </div>
          </div>
          <Button onClick={handleClick} size="sm" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {nextStepText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};