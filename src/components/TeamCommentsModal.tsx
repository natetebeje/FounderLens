
import { useState, useEffect } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  activity_data: any;
  created_at: string;
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface TeamCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  organizationId: string;
}

// Helper function to validate UUID format
const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const TeamCommentsModal = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  organizationId
}: TeamCommentsModalProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && taskId && organizationId) {
      // Validate UUIDs before loading comments
      if (!isValidUUID(taskId) || !isValidUUID(organizationId)) {
        console.error('TeamCommentsModal: Invalid UUID format', { taskId, organizationId });
        toast({
          title: "Error",
          description: "Invalid task or organization ID",
          variant: "destructive",
        });
        return;
      }
      loadComments();
    }
  }, [isOpen, taskId, organizationId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      console.log('TeamCommentsModal: Loading comments for task:', taskId, 'in organization:', organizationId);
      
      const { data, error } = await supabase
        .from('workspace_activities')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('activity_type', 'task_comment')
        .eq('activity_data->>task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('TeamCommentsModal: Error loading comments:', error);
        throw error;
      }

      console.log('TeamCommentsModal: Comments loaded:', data);

      // Get profiles for each comment - filter out invalid user IDs
      const validUserIds = data?.map(c => c.user_id).filter(id => isValidUUID(id)) || [];
      
      if (validUserIds.length === 0) {
        setComments(data?.map(comment => ({ ...comment, profiles: null })) || []);
        return;
      }

      console.log('TeamCommentsModal: Loading profiles for user IDs:', validUserIds);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', validUserIds);

      if (profilesError) {
        console.error('TeamCommentsModal: Error loading profiles:', profilesError);
        // Continue without profiles if there's an error
      }

      // Combine comments with profiles
      const commentsWithProfiles = data?.map(comment => ({
        ...comment,
        profiles: profilesData?.find(p => p.user_id === comment.user_id) || null
      })) || [];

      console.log('TeamCommentsModal: Comments with profiles:', commentsWithProfiles);
      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('TeamCommentsModal: Error loading comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    // Validate required parameters
    if (!isValidUUID(taskId) || !isValidUUID(organizationId)) {
      console.error('TeamCommentsModal: Invalid UUID format for adding comment', { taskId, organizationId });
      toast({
        title: "Error",
        description: "Invalid task or organization ID",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      console.log('TeamCommentsModal: Adding comment for task:', taskId, 'in organization:', organizationId);

      const { error } = await supabase
        .from('workspace_activities')
        .insert({
          organization_id: organizationId,
          user_id: user.user.id,
          activity_type: 'task_comment',
          activity_data: {
            task_id: taskId,
            task_title: taskTitle,
            comment: newComment.trim()
          }
        });

      if (error) {
        console.error('TeamCommentsModal: Error adding comment:', error);
        throw error;
      }

      setNewComment('');
      toast({
        title: "Comment Added",
        description: "Your comment has been added to the task",
      });
      
      loadComments();
    } catch (error) {
      console.error('TeamCommentsModal: Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getUserInitials = (comment: Comment) => {
    const firstName = comment.profiles?.first_name || '';
    const lastName = comment.profiles?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  const getUserName = (comment: Comment) => {
    const firstName = comment.profiles?.first_name || '';
    const lastName = comment.profiles?.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
  };

  // Don't render modal if required props are invalid
  if (!isValidUUID(taskId) || !isValidUUID(organizationId)) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments: {taskTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {getUserInitials(comment)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{getUserName(comment)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        {comment.activity_data.comment}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="border-t pt-4 space-y-4">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end">
            <Button 
              onClick={addComment} 
              disabled={!newComment.trim() || submitting}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
