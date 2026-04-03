import { GrowthMarketingDashboard } from '@/components/GrowthMarketingDashboard';
import { WorkspaceAnalytics } from '@/components/WorkspaceAnalytics';
import { ModernBackground } from "@/components/ui/modern-background";

const Dashboard = () => {
  return (
    <ModernBackground variant="mesh">
      <div className="container mx-auto px-4 py-8 pt-24 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Monitor your workspace analytics and growth marketing performance.</p>
      </div>
      
      <WorkspaceAnalytics />
      <GrowthMarketingDashboard />
      </div>
    </ModernBackground>
  );
};

export default Dashboard;