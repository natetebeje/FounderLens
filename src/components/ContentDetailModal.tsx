import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Edit3, 
  Calendar, 
  Send, 
  Clock, 
  Globe, 
  Save,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react';

interface MarketingContent {
  id: string;
  content: string;
  content_type: string;
  platform: string;
  status: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  target_audience?: any;
  engagement_data?: any;
}

interface ContentDetailModalProps {
  content: MarketingContent | null;
  isOpen: boolean;
  onClose: () => void;
  onContentUpdated: () => void;
}

export const ContentDetailModal: React.FC<ContentDetailModalProps> = ({
  content,
  isOpen,
  onClose,
  onContentUpdated
}) => {
  const [editingContent, setEditingContent] = useState<string>('');
  const [contentType, setContentType] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [scheduledFor, setScheduledFor] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (content) {
      setEditingContent(content.content || '');
      setContentType(content.content_type || '');
      setPlatform(content.platform || '');
      setStatus(content.status || '');
      setScheduledFor(content.scheduled_for ? new Date(content.scheduled_for).toISOString().slice(0, 16) : '');
    }
  }, [content]);

  const handleSave = async () => {
    if (!content) return;
    
    setLoading(true);
    try {
      const updateData: any = {
        content: editingContent,
        content_type: contentType,
        platform,
        status,
        updated_at: new Date().toISOString()
      };

      if (scheduledFor) {
        updateData.scheduled_for = new Date(scheduledFor).toISOString();
      }

      const { error } = await supabase
        .from('marketing_content')
        .update(updateData)
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Content Updated",
        description: "Your content has been successfully updated."
      });
      
      onContentUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating content:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!content || !scheduledFor) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('marketing_content')
        .update({ 
          status: 'scheduled',
          scheduled_for: new Date(scheduledFor).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Content Scheduled",
        description: `Content scheduled for ${new Date(scheduledFor).toLocaleString()}`
      });
      
      onContentUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error scheduling content:', error);
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNow = async () => {
    if (!content) return;
    
    setLoading(true);
    try {
      // Add to content queue for immediate publishing
      const { error: queueError } = await supabase
        .from('marketing_content_queue')
        .insert({
          content_id: content.id,
          platform: content.platform || 'twitter',
          scheduled_time: new Date().toISOString(),
          status: 'pending'
        });

      if (queueError) throw queueError;

      // Update content status
      const { error } = await supabase
        .from('marketing_content')
        .update({ 
          status: 'publishing',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Publishing Content",
        description: "Your content is being published to the selected platform."
      });
      
      onContentUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error publishing content:', error);
      toast({
        title: "Publishing Failed",
        description: error.message || "Failed to publish content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!content) return;
    
    if (!confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('marketing_content')
        .delete()
        .eq('id', content.id);

      if (error) throw error;

      toast({
        title: "Content Deleted",
        description: "Content has been permanently deleted."
      });
      
      onContentUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error deleting content:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editingContent);
    toast({
      title: "Copied to Clipboard",
      description: "Content has been copied to your clipboard."
    });
  };

  if (!content) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Edit Marketing Content
          </DialogTitle>
          <DialogDescription>
            Review, edit, schedule, or publish your AI-generated marketing content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Content Metadata */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{content.content_type}</Badge>
            <Badge variant="outline">{content.platform}</Badge>
            <Badge variant={
              content.status === 'published' ? 'default' : 
              content.status === 'scheduled' ? 'secondary' : 
              'outline'
            }>
              {content.status}
            </Badge>
            {content.scheduled_for && (
              <Badge variant="outline" className="text-blue-600">
                <Clock className="w-3 h-3 mr-1" />
                {new Date(content.scheduled_for).toLocaleString()}
              </Badge>
            )}
          </div>

          {/* Content Editor */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social_post">Social Media Post</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="blog_post">Blog Post</SelectItem>
                  <SelectItem value="landing_page">Landing Page</SelectItem>
                  <SelectItem value="ad_copy">Ad Copy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="reddit">Reddit</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="blog">Blog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Content Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
            </div>
            <Textarea
              id="content"
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              placeholder="Your marketing content..."
              className="min-h-[200px] resize-y"
            />
            <div className="text-xs text-muted-foreground">
              {editingContent.length} characters
            </div>
          </div>

          {/* Scheduling */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled-for">Schedule For</Label>
              <Input
                id="scheduled-for"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          {/* Content Stats */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium mb-2">Content Information</h4>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div>Created: {new Date(content.created_at).toLocaleString()}</div>
              <div>Last Updated: {new Date(content.updated_at).toLocaleString()}</div>
              {content.engagement_data && (
                <div>Engagement: {JSON.stringify(content.engagement_data)}</div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 flex-wrap">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
            
            {scheduledFor && status !== 'scheduled' && (
              <Button
                variant="outline"
                onClick={handleSchedule}
                disabled={loading}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Schedule
              </Button>
            )}
            
            <Button
              onClick={handlePublishNow}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Publish Now
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};