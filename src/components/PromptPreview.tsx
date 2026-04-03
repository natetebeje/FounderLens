
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Copy, Edit2, Download, ChevronDown, ChevronUp, Check, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PromptPreviewProps {
  prompt: string;
  onPromptChange?: (newPrompt: string) => void;
  projectTitle: string;
  onLaunch?: () => void;
}

export const PromptPreview = ({ prompt, onPromptChange, projectTitle, onLaunch }: PromptPreviewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showSections, setShowSections] = useState(false);
  const { toast } = useToast();

  const handleCopy = async (text: string, label: string = 'Full prompt') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(label);
      setTimeout(() => setCopiedSection(null), 2000);
      
      toast({
        title: "Copied to clipboard!",
        description: `${label} is ready to paste in Lovable`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please try copying manually",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.toLowerCase().replace(/\s+/g, '-')}-lovable-prompt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Prompt downloaded!",
      description: "You can now use it later or share with your team",
    });
  };

  const handleSaveEdit = () => {
    onPromptChange?.(editedPrompt);
    setIsEditing(false);
    toast({
      title: "Prompt updated!",
      description: "Your changes have been saved",
    });
  };

  const handleCancelEdit = () => {
    setEditedPrompt(prompt);
    setIsEditing(false);
  };

  const handleCopyAndLaunch = async () => {
    await handleCopy(prompt);
    
    // Open Lovable with enhanced URL
    const lovableUrl = `https://lovable.dev/create?title=${encodeURIComponent(projectTitle)}`;
    window.open(lovableUrl, '_blank');
    
    onLaunch?.();
  };

  // Parse prompt sections (basic parsing for common sections)
  const parseSections = (promptText: string) => {
    const sections = [];
    const lines = promptText.split('\n');
    let currentSection = { title: 'Introduction', content: [] as string[] };
    
    for (const line of lines) {
      if (line.toLowerCase().includes('hero section') || line.toLowerCase().includes('# hero')) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { title: 'Hero Section', content: [] };
      } else if (line.toLowerCase().includes('features') || line.toLowerCase().includes('# features')) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { title: 'Features', content: [] };
      } else if (line.toLowerCase().includes('pain points') || line.toLowerCase().includes('problems')) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { title: 'Pain Points', content: [] };
      } else if (line.toLowerCase().includes('technical') || line.toLowerCase().includes('components')) {
        if (currentSection.content.length > 0) sections.push(currentSection);
        currentSection = { title: 'Technical Requirements', content: [] };
      } else {
        currentSection.content.push(line);
      }
    }
    
    if (currentSection.content.length > 0) sections.push(currentSection);
    return sections;
  };

  const sections = parseSections(prompt);
  const wordCount = prompt.split(/\s+/).length;
  const charCount = prompt.length;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Generated Lovable Prompt</span>
            <Badge variant="secondary">{wordCount} words</Badge>
            <Badge variant="outline">{charCount} chars</Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              placeholder="Edit your Lovable prompt here..."
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit}>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <pre className="bg-muted/30 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono max-h-[400px] overflow-y-auto">
                {prompt}
              </pre>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(prompt)}
              >
                {copiedSection === 'Full prompt' ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <Collapsible open={showSections} onOpenChange={setShowSections}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full">
                  {showSections ? 'Hide' : 'Show'} Prompt Sections
                  {showSections ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-3">
                {sections.map((section, index) => (
                  <Card key={index} className="border border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{section.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(section.content.join('\n'), section.title)}
                        >
                          {copiedSection === section.title ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {section.content.join('\n').trim()}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button 
            onClick={handleCopyAndLaunch}
            className="flex-1"
            size="lg"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy & Open Lovable
          </Button>
          <Button 
            variant="outline"
            onClick={() => handleCopy(prompt)}
            size="lg"
          >
            {copiedSection === 'Full prompt' ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open('https://lovable.dev/create', '_blank')}
            size="lg"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Review your prompt above, then copy and paste it into Lovable to create your MVP
        </div>
      </CardContent>
    </Card>
  );
};
