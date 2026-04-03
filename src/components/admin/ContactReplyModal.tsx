import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2 } from "lucide-react";

interface ContactFormSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  admin_notes?: string;
}

interface ContactReplyModalProps {
  submission: ContactFormSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ContactReplyModal = ({ 
  submission, 
  isOpen, 
  onClose, 
  onSuccess 
}: ContactReplyModalProps) => {
  const [replyMessage, setReplyMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!submission || !replyMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a reply message",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reply-contact', {
        body: {
          submissionId: submission.id,
          message: replyMessage.trim(),
          adminNotes: adminNotes.trim() || undefined
        }
      });

      if (error) {
        console.error('Error sending reply:', error);
        toast({
          title: "Error",
          description: "Failed to send reply. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Reply Sent",
        description: `Successfully sent reply to ${submission.email}`,
      });

      // Reset form and close modal
      setReplyMessage("");
      setAdminNotes("");
      onSuccess();
      onClose();

    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  if (!submission) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reply to Contact Submission</DialogTitle>
          <DialogDescription>
            Send a direct email response to {submission.name} ({submission.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Message */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Original Message</h4>
            <div className="space-y-2 text-sm">
              <p><strong>From:</strong> {submission.name} ({submission.email})</p>
              <p><strong>Subject:</strong> {submission.subject}</p>
              <p><strong>Date:</strong> {new Date(submission.created_at).toLocaleDateString()}</p>
              <div className="mt-3 p-3 bg-background rounded border">
                <p className="whitespace-pre-wrap">{submission.message}</p>
              </div>
            </div>
          </div>

          {/* Reply Message */}
          <div className="space-y-2">
            <Label htmlFor="reply-message">Your Reply *</Label>
            <Textarea
              id="reply-message"
              placeholder="Type your response here..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </div>

          {/* Admin Notes (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="admin-notes">Internal Notes (Optional)</Label>
            <Input
              id="admin-notes"
              placeholder="Add internal notes for your team..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              These notes are only visible to admins and won't be sent to the user
            </p>
          </div>

          {/* Current Admin Notes */}
          {submission.admin_notes && (
            <div className="bg-muted p-3 rounded">
              <h5 className="font-medium text-sm mb-1">Previous Admin Notes:</h5>
              <p className="text-sm text-muted-foreground">{submission.admin_notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={sending || !replyMessage.trim()}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Reply
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};