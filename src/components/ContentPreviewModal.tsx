import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Twitter,
  Linkedin,
  MessageSquare,
  Send,
  Loader2,
  Edit3,
  Save,
  X,
  Zap,
  RotateCcw
} from 'lucide-react';

interface ContentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: {
    id: string;
    content: string;
    content_type: string;
    platform: string;
    status: string;
    created_at: string;
  };
  onContentUpdated?: () => void;
}

export const ContentPreviewModal: React.FC<ContentPreviewModalProps> = ({
  isOpen,
  onClose,
  content,
  onContentUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content.content);
  const [isPosting, setIsPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      case 'reddit': return <MessageSquare className="w-4 h-4" />;
      default: return <Send className="w-4 h-4" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'twitter': return 'text-blue-500';
      case 'linkedin': return 'text-blue-700';
      case 'reddit': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getCharacterLimit = (platform: string) => {
    switch (platform) {
      case 'twitter': return 280;
      case 'linkedin': return 3000;
      default: return null;
    }
  };

  const characterLimit = getCharacterLimit(content.platform);
  const isOverLimit = characterLimit && editedContent.length > characterLimit;

  const handleSaveEdit = async () => {
    if (isOverLimit) {
      toast({
        title: "Content too long",
        description: `Content exceeds ${characterLimit} character limit`,
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('marketing_content')
        .update({ content: editedContent })
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Content updated",
        description: "Your changes have been saved"
      });

      setIsEditing(false);
      content.content = editedContent; // Update the content object
      onContentUpdated?.();
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save changes",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDirectPost = async () => {
    if (content.platform !== 'twitter') {
      toast({
        title: "Direct posting unavailable",
        description: "Direct posting is only available for Twitter content",
        variant: "destructive"
      });
      return;
    }

    setIsPosting(true);
    
    // First update status to publishing to prevent double-posting
    try {
      await supabase
        .from('marketing_content')
        .update({ status: 'publishing' })
        .eq('id', content.id);
      
      content.status = 'publishing';
    } catch (error) {
      console.error('Error updating status:', error);
    }

    try {
      console.log('Calling Twitter integration with content:', editedContent);
      const { data, error } = await supabase.functions.invoke('twitter-integration', {
        body: {
          action: 'post_tweet',
          content: editedContent
        }
      });

      if (error) {
        console.error('Twitter function error:', error);
        throw error;
      }

      console.log('Twitter response:', data);

      // Update content status to published only after successful posting
      await supabase
        .from('marketing_content')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString(),
          engagement_data: { posted_via: 'direct', tweet_id: data?.tweet?.data?.id }
        })
        .eq('id', content.id);

      content.status = 'published';

      toast({
        title: "Posted to Twitter!",
        description: "Your content has been published successfully"
      });

      onContentUpdated?.();
      onClose();
    } catch (error: any) {
      console.error('Error posting to Twitter:', error);
      
      // Reset status back to draft on error
      await supabase
        .from('marketing_content')
        .update({ status: 'draft' })
        .eq('id', content.id);
      
      content.status = 'draft';
      
      toast({
        title: "Posting failed",
        description: error.message || "Failed to post to Twitter. Try again.",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleTriggerZapier = async () => {
    setIsPosting(true);
    
    // First update status to publishing
    try {
      await supabase
        .from('marketing_content')
        .update({ status: 'publishing' })
        .eq('id', content.id);
      
      content.status = 'publishing';
    } catch (error) {
      console.error('Error updating status:', error);
    }

    try {
      const { error } = await supabase.functions.invoke('zapier-webhook-handler', {
        body: {
          event_type: 'content_ready_for_publishing',
          data: {
            content_id: content.id,
            content: editedContent,
            content_type: content.content_type,
            platform: content.platform,
            generated_at: content.created_at,
            publish_immediately: true,
            formatted_content: editedContent,
            suggested_publish_time: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      // Update content status to published only after successful Zapier trigger
      await supabase
        .from('marketing_content')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString(),
          engagement_data: { posted_via: 'zapier', triggered_at: new Date().toISOString() }
        })
        .eq('id', content.id);

      content.status = 'published';

      toast({
        title: "Sent to Zapier!",
        description: "Your content has been sent to your automation workflow"
      });

      onContentUpdated?.();
      onClose();
    } catch (error: any) {
      console.error('Error triggering Zapier:', error);
      
      // Reset status back to draft on error
      await supabase
        .from('marketing_content')
        .update({ status: 'draft' })
        .eq('id', content.id);
      
      content.status = 'draft';
      
      toast({
        title: "Automation failed",
        description: error.message || "Failed to trigger Zapier workflow. Try again.",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className={getPlatformColor(content.platform)}>
              {getPlatformIcon(content.platform)}
            </div>
            <DialogTitle>Content Preview</DialogTitle>
            <Badge variant="outline" className="capitalize">
              {content.platform}
            </Badge>
          </div>
          <DialogDescription>
            Review and edit your content before publishing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Content</label>
              {characterLimit && (
                <span className={`text-xs ${isOverLimit ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {editedContent.length}/{characterLimit}
                </span>
              )}
            </div>
            
            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className={`min-h-[120px] ${isOverLimit ? 'border-red-500' : ''}`}
                placeholder="Edit your content..."
              />
            ) : (
              <div className="p-3 bg-muted/50 rounded-lg border min-h-[120px]">
                <p className="whitespace-pre-wrap">{editedContent}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 mr-1" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedContent(content.content);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Edit Content
              </Button>
            )}
          </div>

          {!isEditing && (content.status === 'draft' || content.status === 'publishing') && (
            <div className="flex gap-2 pt-4 border-t">
              {content.platform === 'twitter' && (
                <Button
                  onClick={handleDirectPost}
                  disabled={isPosting}
                  className="flex-1"
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {content.status === 'publishing' ? 'Retrying...' : 'Posting...'}
                    </>
                  ) : (
                    <>
                      <Twitter className="w-4 h-4 mr-2" />
                      {content.status === 'publishing' ? 'Retry Post to Twitter' : 'Post to Twitter'}
                    </>
                  )}
                </Button>
              )}
              
              <Button
                onClick={handleTriggerZapier}
                disabled={isPosting}
                variant="outline"
                className="flex-1"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {content.status === 'publishing' ? 'Retrying...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {content.status === 'publishing' ? 'Retry Send to Zapier' : 'Send to Zapier'}
                  </>
                )}
              </Button>
              
              {content.status === 'publishing' && (
                <Button
                  onClick={async () => {
                    await supabase
                      .from('marketing_content')
                      .update({ status: 'draft' })
                      .eq('id', content.id);
                    content.status = 'draft';
                    onContentUpdated?.();
                    toast({
                      title: "Status reset",
                      description: "Content moved back to draft status"
                    });
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Draft
                </Button>
              )}
            </div>
          )}

          {content.status === 'publishing' && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Status:</strong> Publishing in progress. If posting failed, you can retry above or reset to draft.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};