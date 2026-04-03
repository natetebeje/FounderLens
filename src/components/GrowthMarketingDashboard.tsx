import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  FileText, 
  Users, 
  TrendingUp,
  Play,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface MarketingKPIs {
  activeCampaigns: number;
  experimentsRunning: number;
  newLeads: number;
  contentPublished: number;
}

interface OpportunityWithCampaigns {
  id: string;
  title: string;
  campaigns: number;
  leads: number;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  platform: string;
  performance: number;
}

export const GrowthMarketingDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<MarketingKPIs>({
    activeCampaigns: 0,
    experimentsRunning: 0,
    newLeads: 0,
    contentPublished: 0
  });
  const [opportunities, setOpportunities] = useState<OpportunityWithCampaigns[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentOrganization } = useWorkspace();

  useEffect(() => {
    loadMarketingData();
  }, [currentOrganization]);

  const loadMarketingData = async () => {
    setIsLoading(true);
    try {
      const [campaignsResult, opportunitiesResult, contentResult, contactsResult] = await Promise.all([
        supabase.from('marketing_campaigns').select('*'),
        supabase.from('business_opportunities').select('id, title, validation_status').limit(5),
        supabase.from('marketing_content').select('id, status'),
        supabase.from('contact_form_submissions').select('id, created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      // Calculate KPIs
      const activeCampaigns = campaignsResult.data?.filter(c => c.status === 'active')?.length || 0;
      const experimentsRunning = campaignsResult.data?.filter(c => c.campaign_type === 'ab_test')?.length || 0;
      const newLeads = contactsResult.data?.length || 0;
      const contentPublished = contentResult.data?.filter(c => c.status === 'published')?.length || 0;

      setKpis({ activeCampaigns, experimentsRunning, newLeads, contentPublished });

      // Transform opportunities data
      const opportunitiesWithCampaigns: OpportunityWithCampaigns[] = opportunitiesResult.data?.map(opp => ({
        id: opp.id,
        title: opp.title,
        campaigns: Math.floor(Math.random() * 3) + 1, // Placeholder
        leads: Math.floor(Math.random() * 20) + 5, // Placeholder
        status: opp.validation_status || 'pending'
      })) || [];

      setOpportunities(opportunitiesWithCampaigns);

      // Transform campaigns data
      const simpleCampaigns: Campaign[] = campaignsResult.data?.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        platform: c.platforms?.[0] || 'Email',
        performance: Math.floor(Math.random() * 100) + 20 // Placeholder
      })) || [];

      setCampaigns(simpleCampaigns);
    } catch (error) {
      console.error('Failed to load marketing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'outline';
      case 'validated': return 'default';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Marketing Ops</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Target className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Marketing Ops</h2>
      </div>

      {/* Marketing KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Play className="h-4 w-4" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Experiments Running
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.experimentsRunning}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              New Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.newLeads}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Content Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.contentPublished}</div>
          </CardContent>
        </Card>
      </div>

      {/* By Opportunity */}
      <Card>
        <CardHeader>
          <CardTitle>By Opportunity</CardTitle>
        </CardHeader>
        <CardContent>
          {opportunities.length > 0 ? (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div key={opp.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <div className="font-medium">{opp.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {opp.campaigns} campaigns • {opp.leads} leads
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(opp.status)}>
                      {opp.status}
                    </Badge>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No opportunities found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns.length > 0 ? (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-muted-foreground">{campaign.platform}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold">{campaign.performance}%</div>
                      <div className="text-xs text-muted-foreground">Performance</div>
                    </div>
                    <Badge variant={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Play className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No active campaigns</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};