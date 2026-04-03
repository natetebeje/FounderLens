
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Rocket, Copy, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SmartLaunchButtonProps {
  mvpData: any;
  onLaunch?: () => void;
}

export const SmartLaunchButton = ({ mvpData, onLaunch }: SmartLaunchButtonProps) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const { toast } = useToast();

  const handleSmartLaunch = async () => {
    setIsLaunching(true);
    
    try {
      // Copy the Lovable prompt to clipboard
      await navigator.clipboard.writeText(mvpData.lovablePrompt);
      
      // Open Lovable in a new tab
      const lovableUrl = `https://lovable.dev/create?title=${encodeURIComponent(mvpData.smartLaunch?.projectTitle || 'New Project')}`;
      window.open(lovableUrl, '_blank');
      
      // Call optional callback
      onLaunch?.();
      
      toast({
        title: "Smart Launch Activated! 🚀",
        description: "Prompt copied to clipboard. Lovable opened in new tab.",
      });
      
    } catch (error) {
      console.error('Smart Launch failed:', error);
      toast({
        title: "Launch Failed",
        description: "Unable to copy prompt or open Lovable. Please try manually.",
        variant: "destructive",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Rocket className="w-5 h-5 text-primary" />
          Smart Launch Workflow
          <Badge variant="secondary">Automated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium">Professional Prompt Generated</div>
              <div className="text-sm text-muted-foreground">
                {mvpData.lovablePrompt?.length || 0} characters of optimized instructions
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium">Auto-Copy to Clipboard</div>
              <div className="text-sm text-muted-foreground">
                Prompt will be ready to paste in Lovable
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <ExternalLink className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium">Open Lovable Platform</div>
              <div className="text-sm text-muted-foreground">
                New tab with project creation interface
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium">Generate MVP</div>
              <div className="text-sm text-muted-foreground">
                {mvpData.smartLaunch?.estimatedTime || '2-3 minutes'} to full application
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <Button 
            onClick={handleSmartLaunch}
            disabled={isLaunching}
            className="w-full"
            size="lg"
          >
            {isLaunching ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                Start Smart Launch
              </>
            )}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground text-center">
          This will copy your prompt and open Lovable.dev in a new tab
        </div>
      </CardContent>
    </Card>
  );
};
