import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Crown, Mail, MoreHorizontal, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  status: string;
}

// Helper function to validate UUID format
const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const Team = () => {
  const { currentOrganization, refreshOrganizations } = useWorkspace();
  const { canUseFeature, getUsagePercentage, incrementUsage } = useFeatureGating(currentOrganization?.id);
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Team page - currentOrganization:', currentOrganization);
    if (currentOrganization?.id && isValidUUID(currentOrganization.id)) {
      fetchTeamData();
    } else if (currentOrganization?.id && !isValidUUID(currentOrganization.id)) {
      console.error('Team page - Invalid organization ID:', currentOrganization.id);
      toast({
        title: 'Error',
        description: 'Invalid organization ID format',
        variant: 'destructive'
      });
      setLoading(false);
    } else {
      // If no organization after 3 seconds, stop loading
      const timeout = setTimeout(() => {
        setLoading(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [currentOrganization?.id]);

  const fetchTeamData = async () => {
    if (!currentOrganization?.id || !isValidUUID(currentOrganization.id)) {
      console.error('Team page - Cannot fetch team data: invalid organization ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Team page - Fetching team data for organization:', currentOrganization.id);
      
      // Fetch team members - handle profiles separately since relation might not exist
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select('id, user_id, role, joined_at')
        .eq('organization_id', currentOrganization.id);

      if (membersError) {
        console.error('Team page - Error fetching members:', membersError);
        throw membersError;
      }
      
      // Fetch profiles separately and merge
      let membersWithProfiles = membersData || [];
      if (membersData?.length) {
        // Filter out invalid user IDs
        const validUserIds = membersData.map(member => member.user_id).filter(id => isValidUUID(id));
        
        if (validUserIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', validUserIds);
          
          if (profilesError) {
            console.error('Team page - Error fetching profiles:', profilesError);
            // Continue without profiles if there's an error
          }
          
          // Merge profiles data with members
          membersWithProfiles = membersData.map(member => ({
            ...member,
            profiles: profilesData?.find(profile => profile.user_id === member.user_id) || null
          }));
        }
      }
      
      setMembers(membersWithProfiles);

      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('workspace_invitations')
        .select('id, email, role, created_at, status')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'pending');

      if (invitationsError) {
        console.error('Team page - Error fetching invitations:', invitationsError);
        throw invitationsError;
      }
      setInvitations(invitationsData || []);

    } catch (error) {
      console.error('Team page - Error fetching team data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isValidUUID(memberId)) {
      console.error('Team page - Invalid member ID:', memberId);
      toast({
        title: 'Error',
        description: 'Invalid member ID format',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      });
      
      fetchTeamData();
    } catch (error) {
      console.error('Team page - Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive'
      });
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!isValidUUID(invitationId)) {
      console.error('Team page - Invalid invitation ID:', invitationId);
      toast({
        title: 'Error',
        description: 'Invalid invitation ID format',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Invitation cancelled successfully',
      });
      
      fetchTeamData();
    } catch (error) {
      console.error('Team page - Error cancelling invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation',
        variant: 'destructive'
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Organization Selected</h2>
          <p className="text-muted-foreground">Please select an organization to view team members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Team Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your team members and workspace access
            </p>
          </div>
          {/* Invite Member button is temporarily disabled */}
        </div>

        {/* Coming Soon Notice */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Team invitation feature is coming soon. Currently, you can view existing team members and manage their access.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6">
          {/* Current Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No team members yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Team invitation feature will be available soon
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {member.profiles?.first_name || 'Unknown'} {member.profiles?.last_name || 'User'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleColor(member.role)}>
                          {member.role}
                        </Badge>
                        {member.role !== 'owner' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem 
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-600"
                              >
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Pending Invitations ({invitations.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{invitation.email}</h3>
                          <p className="text-sm text-muted-foreground">
                            Invited {new Date(invitation.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {invitation.role}
                        </Badge>
                        <Badge variant="outline" className="text-orange-600">
                          Pending
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upgrade Prompt Modal */}
        <UpgradePrompt
          isOpen={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          featureName="team_members"
          currentUsage={getUsagePercentage('team_members')}
        />
      </div>
    </div>
  );
};

export default Team;
