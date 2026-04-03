
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, CheckCircle, Clock, ChevronDown, ChevronUp, Eye, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PromptPreview } from './PromptPreview';

interface SimplifiedMVPLauncherProps {
  opportunity: any;
  onComplete?: () => void;
  onMVPGenerated?: (generatedOpportunity: any) => void;
}

export const SimplifiedMVPLauncher = ({ opportunity, onComplete, onMVPGenerated }: SimplifiedMVPLauncherProps) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);
  const [launchMode, setLaunchMode] = useState<'quick' | 'review'>('quick');
  const { toast } = useToast();
  const { currentOrganization } = useWorkspace();

  const handleGenerateOnly = async () => {
    setIsLaunching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-mvp-with-lovable', {
        body: { opportunity }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate MVP');
      }

      if (!data) {
        throw new Error('No data returned from MVP generation');
      }

      console.log('MVP generation successful:', data);
      setGeneratedData(data);
      setShowPromptPreview(true);
      
      // Update existing opportunity with MVP data
      await updateOpportunityWithMVP(data);
      
      toast({
        title: "✨ Prompt Generated!",
        description: "Review your Lovable prompt below and customize if needed",
      });
      
    } catch (error) {
      console.error('MVP generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unable to generate MVP prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const handleQuickLaunch = async () => {
    setIsLaunching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-mvp-with-lovable', {
        body: { opportunity }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate MVP');
      }

      if (!data) {
        throw new Error('No data returned from MVP generation');
      }

      console.log('MVP generation successful:', data);
      setGeneratedData(data);
      
      // Update existing opportunity with MVP data
      await updateOpportunityWithMVP(data);
      
      // Auto-copy prompt to clipboard
      if (data.lovablePrompt) {
        await navigator.clipboard.writeText(data.lovablePrompt);
      }
      
      // Auto-open Lovable with project title
      const lovableUrl = `https://lovable.dev/create?title=${encodeURIComponent(data.smartLaunch?.projectTitle || opportunity.title)}`;
      window.open(lovableUrl, '_blank');
      
      toast({
        title: "🚀 Quick Launch Successful!",
        description: "Prompt copied and Lovable opened. Start building!",
      });
      
      onComplete?.();
      
    } catch (error) {
      console.error('MVP generation failed:', error);
      toast({
        title: "Launch Failed",
        description: error instanceof Error ? error.message : "Unable to generate MVP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const handlePromptUpdate = (newPrompt: string) => {
    if (generatedData) {
      setGeneratedData({
        ...generatedData,
        lovablePrompt: newPrompt
      });
    }
  };

  const updateOpportunityWithMVP = async (data: any) => {
    try {
      console.log('Updating opportunity with MVP data:', data);
      
      const { error } = await supabase
        .from('business_opportunities')
        .update({
          mvp_generated: true,
          mvp_prompt: data.lovablePrompt,
          mvp_generated_at: new Date().toISOString()
        })
        .eq('id', opportunity.id);

      if (error) {
        console.error('Error updating opportunity with MVP:', error);
        throw error;
      }

      console.log('Updated opportunity with MVP data');
    } catch (error) {
      console.error('Failed to update opportunity with MVP:', error);
      toast({
        title: "Error",
        description: "Failed to save MVP data",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleLaunchFromPreview = async () => {
    try {
      // Update existing opportunity with MVP data
      await updateOpportunityWithMVP(generatedData);
      
      toast({
        title: "🚀 MVP Launch Complete!",
        description: "Good luck building your MVP in Lovable!",
      });
      
      onComplete?.();
    } catch (error) {
      console.error('Failed to launch MVP:', error);
    }
  };


  if (isLaunching) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                {launchMode === 'quick' ? 'Quick Launching Your MVP' : 'Generating Your Professional MVP'}
              </h3>
              <p className="text-muted-foreground mb-4">
                Creating optimized Lovable prompt with market intelligence...
              </p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Processing market research and competitor analysis</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Applying professional copywriting framework</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Generating technical specifications</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showPromptPreview && generatedData) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Review Your MVP Prompt
              <Badge variant="secondary">Generated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your professional Lovable prompt has been generated. Review it below, make any adjustments, then launch your MVP.
            </p>
          </CardContent>
        </Card>

        <PromptPreview
          prompt={generatedData.lovablePrompt}
          projectTitle={generatedData.smartLaunch?.projectTitle || opportunity.title}
          onPromptChange={handlePromptUpdate}
          onLaunch={handleLaunchFromPreview}
        />

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => setShowPromptPreview(false)}
          >
            ← Back to Options
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          Generate Professional MVP
          <Badge variant="secondary">Enhanced</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="font-semibold">Opportunity: {opportunity.title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {opportunity.description}
          </p>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {opportunity.difficulty_level}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {opportunity.competition_level} competition
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Quick Launch</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generate prompt, copy to clipboard, and open Lovable in one click
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    setLaunchMode('quick');
                    handleQuickLaunch();
                  }}
                  disabled={isLaunching}
                  className="w-full"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Quick Launch
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
                  <Eye className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Review & Customize</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    See your prompt, edit if needed, then launch when ready
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    setLaunchMode('review');
                    handleGenerateOnly();
                  }}
                  disabled={isLaunching}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Review First
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">What happens next:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• AI generates professional Lovable prompt using market data</li>
            <li>• Choose to launch immediately or review/customize first</li>
            <li>• Prompt automatically copied and Lovable opened</li>
            <li>• Build complete application in 2-3 minutes</li>
          </ul>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Choose your preferred workflow above to get started
        </div>
      </CardContent>
    </Card>
  );
};
