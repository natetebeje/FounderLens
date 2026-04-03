
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PartyPopper, Target, ArrowRight } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  opportunityCount?: number;
  nextStepLabel?: string;
  onNextStep?: () => void;
}

export const SuccessModal = ({
  isOpen,
  onClose,
  title,
  description,
  opportunityCount,
  nextStepLabel,
  onNextStep
}: SuccessModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {opportunityCount && (
            <div className="flex justify-center">
              <Badge variant="outline" className="px-4 py-2">
                <Target className="w-4 h-4 mr-2" />
                {opportunityCount} Opportunities Generated
              </Badge>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Continue Exploring
            </Button>
            {nextStepLabel && onNextStep && (
              <Button onClick={onNextStep} className="flex-1 gap-2">
                {nextStepLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
