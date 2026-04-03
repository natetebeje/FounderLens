
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProgressItem {
  id: string;
  label: string;
  completed: boolean;
}

interface CircularProgressAvatarProps {
  user: any;
  progressItems: ProgressItem[];
  className?: string;
}

export const CircularProgressAvatar = ({ user, progressItems, className = "" }: CircularProgressAvatarProps) => {
  const completedCount = progressItems.filter(item => item.completed).length;
  const totalCount = progressItems.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  
  // Calculate stroke dash array for progress circle
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getInitials = (email: string, firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    const { first_name, last_name } = user.user_metadata || {};
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    return user.email;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Avatar only - no progress ring for navigation */}
      <Avatar className="h-11 w-11">
        <AvatarImage 
          src={user.user_metadata?.avatar_url} 
          alt={getDisplayName()} 
        />
        <AvatarFallback className="bg-gradient-primary text-white font-medium text-sm">
          {getInitials(
            user.email, 
            user.user_metadata?.first_name, 
            user.user_metadata?.last_name
          )}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};
