import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContentPreviewModal } from './ContentPreviewModal';
import { 
  Zap, 
  Send, 
  CheckCircle, 
  Loader2, 
  ExternalLink,
  Lightbulb,
  ArrowRight,
  Play,
  Twitter,
  Eye,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GeneratedContent {
  id: string;
  content: string;
  content_type: string;
  platform: string;
  status: string;
  created_at: string;
}

export const ZapierContentAutomation: React.FC = () => {
  const [generating, setGenerating] = useState(false);
  const [recentContent, setRecentContent] = useState<GeneratedContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<GeneratedContent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  
  // Form state for content generation
  const [contentForm, setContentForm] = useState({
    topic: '',
    platform: 'linkedin',
    targetAudience: 'entrepreneurs and founders',
    tone: 'professional',
    keywords: ''
  });

  useEffect(() => {
    loadRecentContent();
  }, []);

  const loadRecentContent = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentContent(data || []);
    } catch (error: any) {
      console.error('Error loading recent content:', error);
    }
  };

  const generateContent = async () => {
    if (!contentForm.topic.trim()) {
      toast({
        title: 'Missing Topic',
        description: 'Please enter a topic for content generation',
        variant: 'destructive'
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-content-generator', {
        body: {
          contentType: 'social_post',
          platform: contentForm.platform,
          topic: contentForm.topic,
          targetAudience: contentForm.targetAudience,
          tone: contentForm.tone,
          keywords: contentForm.keywords.split(',').map(k => k.trim()).filter(k => k)
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Content Generated!',
          description: `Draft content created for ${contentForm.platform}. Review it before publishing.`
        });

        // Reset form
        setContentForm({
          topic: '',
          platform: 'linkedin',
          targetAudience: 'entrepreneurs and founders', 
          tone: 'professional',
          keywords: ''
        });

        // Reload recent content
        loadRecentContent();
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate content',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handlePreviewContent = (content: GeneratedContent) => {
    setSelectedContent(content);
    setShowPreview(true);
  };

  const separateContentByStatus = (content: GeneratedContent[]) => {
    const drafts = content.filter(c => c.status === 'draft');
    const published = content.filter(c => c.status === 'published');
    return { drafts, published };
  };

  const { drafts, published } = separateContentByStatus(recentContent);

  const getPlatformEmoji = (platform: string) => {
    switch (platform) {
      case 'twitter': return '🐦';
      case 'linkedin': return '💼';
      case 'reddit': return '🤖';
      default: return '📱';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Automated Content Publishing</h2>
      </div>

      {/* Automation Status Alert */}
      <Alert>
        <Lightbulb className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Content generated here will automatically trigger your Zapier workflows for publishing.
          </span>
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://zapier.com/app/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Zapier Dashboard
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Content Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Content for Review
            </CardTitle>
            <CardDescription>
              Create content drafts that you can review, edit, and publish when ready
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Content Topic</Label>
              <Input
                id="topic"
                value={contentForm.topic}
                onChange={(e) => setContentForm(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g., AI trends in entrepreneurship"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Target Platform</Label>
              <Select value={contentForm.platform} onValueChange={(value) => setContentForm(prev => ({ ...prev, platform: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                  <SelectItem value="twitter">🐦 Twitter</SelectItem>
                  <SelectItem value="reddit">🤖 Reddit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                value={contentForm.targetAudience}
                onChange={(e) => setContentForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                placeholder="entrepreneurs and founders"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Content Tone</Label>
              <Select value={contentForm.tone} onValueChange={(value) => setContentForm(prev => ({ ...prev, tone: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords (comma-separated)</Label>
              <Input
                id="keywords"
                value={contentForm.keywords}
                onChange={(e) => setContentForm(prev => ({ ...prev, keywords: e.target.value }))}
                placeholder="AI, entrepreneurship, business growth"
              />
            </div>

            <Button 
              onClick={generateContent}
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Content Draft
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Automation Flow Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Automation Flow
            </CardTitle>
            <CardDescription>
              How your content flows through the automation pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div className="flex-1">
                  <div className="font-medium">Content Generation</div>
                  <div className="text-sm text-muted-foreground">AI creates optimized content</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div className="flex-1">
                  <div className="font-medium">Zapier Trigger</div>
                  <div className="text-sm text-muted-foreground">Webhook activates your Zap</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div className="flex-1">
                  <div className="font-medium">Auto-Publishing</div>
                  <div className="text-sm text-muted-foreground">Content posts to social media</div>
                </div>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-900">💡 Pro Tip</div>
                <div className="text-sm text-blue-800">
                  Set up different Zaps for each platform to customize posting schedules and formats.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Draft Content */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Draft Content</CardTitle>
            <CardDescription>
              Review and publish your generated content drafts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {drafts.map((content) => (
                <div key={content.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPlatformEmoji(content.platform)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(content.status)}
                          <span className="text-sm font-medium capitalize">{content.platform}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Generated: {new Date(content.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePreviewContent(content)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review & Publish
                    </Button>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <p className="line-clamp-3">{content.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Published Content */}
      {published.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Published Content</CardTitle>
            <CardDescription>
              Content that has been published successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {published.map((content) => (
                <div key={content.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPlatformEmoji(content.platform)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(content.status)}
                          <span className="text-sm font-medium capitalize">{content.platform}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Published: {new Date(content.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePreviewContent(content)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <p className="line-clamp-3">{content.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {recentContent.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No content generated yet.</p>
            <p className="text-sm">Generate your first piece of content above to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Content Preview Modal */}
      {selectedContent && (
        <ContentPreviewModal
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setSelectedContent(null);
          }}
          content={selectedContent}
          onContentUpdated={loadRecentContent}
        />
      )}
    </div>
  );
};

export default ZapierContentAutomation;