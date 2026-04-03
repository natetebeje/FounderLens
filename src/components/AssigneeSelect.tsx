import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserX } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationMember {
  user_id: string;
  role: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface AssigneeSelectProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  disabled?: boolean;
}

export const AssigneeSelect = ({ value, onValueChange, disabled }: AssigneeSelectProps) => {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentOrganization } = useWorkspace();

  useEffect(() => {
    if (!currentOrganization) return;

    const loadMembers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('organization_members')
          .select(`
            user_id,
            role
          `)
          .eq('organization_id', currentOrganization.id);

        if (error) throw error;

        // Get profiles for each member
        const memberIds = data?.map(m => m.user_id) || [];
        if (memberIds.length === 0) {
          setMembers([]);
          return;
        }

        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', memberIds);

        // Combine members with profiles
        const membersWithProfiles = data?.map(member => ({
          ...member,
          profiles: profilesData?.find(p => p.user_id === member.user_id) || null
        })) || [];

        setMembers(membersWithProfiles);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMembers();
  }, [currentOrganization]);

  const getMemberName = (member: OrganizationMember) => {
    const firstName = member.profiles?.first_name || '';
    const lastName = member.profiles?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'Unknown User';
  };

  const getMemberInitials = (member: OrganizationMember) => {
    const firstName = member.profiles?.first_name || '';
    const lastName = member.profiles?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  const handleValueChange = (newValue: string) => {
    if (newValue === 'unassigned') {
      onValueChange(undefined);
    } else {
      onValueChange(newValue);
    }
  };

  const selectedMember = members.find(m => m.user_id === value);

  return (
    <Select 
      value={value || 'unassigned'} 
      onValueChange={handleValueChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          {value && selectedMember ? (
            <div className="flex items-center gap-2">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-xs">
                  {getMemberInitials(selectedMember)}
                </AvatarFallback>
              </Avatar>
              <span>{getMemberName(selectedMember)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserX className="w-4 h-4" />
              <span>Unassigned</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4" />
            <span>Unassigned</span>
          </div>
        </SelectItem>
        {members.map((member) => (
          <SelectItem key={member.user_id} value={member.user_id}>
            <div className="flex items-center gap-2">
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-xs">
                  {getMemberInitials(member)}
                </AvatarFallback>
              </Avatar>
              <span>{getMemberName(member)}</span>
              <span className="text-xs text-muted-foreground">({member.role})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};