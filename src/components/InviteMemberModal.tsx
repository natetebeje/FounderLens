import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteMemberModal = ({ isOpen, onClose }: InviteMemberModalProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const { currentOrganization } = useWorkspace();
  const { canUseFeature, incrementUsage } = useFeatureGating(currentOrganization?.id);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email.trim() || !currentOrganization) return;

    if (!canUseFeature('team_members')) {
      toast({
        title: "Team member limit reached",
        description: "Upgrade your plan to invite more team members.",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    try {
      // Generate invitation token
      const token = crypto.randomUUID();
      
      // Insert invitation
      const { error } = await supabase
        .from('workspace_invitations')
        .insert({
          organization_id: currentOrganization.id,
          inviter_id: (await supabase.auth.getUser()).data.user?.id,
          email: email.trim(),
          role,
          token,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Invitation already exists",
            description: "This email has already been invited to this workspace.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      // Increment usage counter
      incrementUsage('team_members');

      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${email}. They'll receive an email with a join link.`,
      });

      setEmail('');
      setRole('member');
      onClose();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Invite someone to join {currentOrganization?.name} workspace. They'll receive an email with a join link.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isInviting}
            />
          </div>
          
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={isInviting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Members can create and edit opportunities. Viewers can only view.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isInviting}>
            Cancel
          </Button>
          <Button 
            onClick={handleInvite}
            disabled={!email.trim() || isInviting || !canUseFeature('team_members')}
          >
            {isInviting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Invitation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};