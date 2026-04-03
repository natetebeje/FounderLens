
import { CircularProgressAvatar } from "./CircularProgressAvatar";
import { Card, CardContent } from "@/components/ui/card";

interface ProgressItem {
  id: string;
  label: string;
  completed: boolean;
}

interface ProfileOverviewProps {
  user: any;
  firstName: string;
  lastName: string;
  email: string;
  progressItems: ProgressItem[];
  lastUpdated: Date;
}

export const ProfileOverview = ({ 
  user, 
  firstName, 
  lastName, 
  email, 
  progressItems,
  lastUpdated 
}: ProfileOverviewProps) => {
  const completedCount = progressItems.filter(item => item.completed).length;
  const totalCount = progressItems.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  const getDisplayName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) {
      return firstName;
    }
    return email || "Getting started...";
  };

  const formatLastUpdated = () => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastUpdated.getTime()) / 60000);
    
    if (diffInMinutes < 1) {
      return "Just now";
    }
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    return lastUpdated.toLocaleDateString();
  };

  return (
    <Card className="bg-gradient-card backdrop-blur-glass border-border/50 h-fit sticky top-8">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Avatar with Progress Ring */}
          <div className="flex justify-center">
            <CircularProgressAvatar
              user={user}
              progressItems={progressItems}
              className="w-12 h-12"
            />
          </div>
          
          {/* Name Display */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground">
              {getDisplayName()}
            </h3>
            {firstName && lastName && email && (
              <p className="text-sm text-muted-foreground mt-2">
                {email}
              </p>
            )}
          </div>
          
          {/* Progress Percentage */}
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {percentage}%
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Complete
            </p>
          </div>
          
          {/* Last Updated */}
          <div className="text-center pt-4 border-t border-border/50 w-full">
            <p className="text-xs text-muted-foreground">
              Profile updated {formatLastUpdated()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
