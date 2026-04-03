
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Rocket } from 'lucide-react';
import { SimplifiedMVPLauncher } from './SimplifiedMVPLauncher';

interface MVPGeneratorProps {
  opportunity: any;
  isOpen: boolean;
  onClose: () => void;
}

export const MVPGenerator = ({ opportunity, isOpen, onClose }: MVPGeneratorProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            AI MVP Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
        <SimplifiedMVPLauncher 
          opportunity={opportunity}
          onComplete={onClose}
        />
        </div>
      </DialogContent>
    </Dialog>
  );
};
