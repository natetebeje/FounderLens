import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { 
  TrendingUp, 
  Search, 
  Target, 
  Users, 
  BarChart3, 
  Globe, 
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MarketIntelligence {
  id: string;
  opportunity_id?: string;
  intelligence_type: string;
  source_platform: string;
  confidence_score: number;
  key_insights: any;
  competitive_data: any;
  market_trends: any;
  customer_feedback: any;
  validation_impact: number;
  created_at: string;
}

interface MonitoringJob {
  id: string;
  job_name: string;
  job_type: string;
  status: string;
  last_run_at?: string;
  next_run_at?: string;
  target_urls: string[];
}

interface ScrapedData {
  id: string;
  source_url: string;
  source_type: string;
  data_type: string;
  content: any;
  created_at: string;
}

interface MarketIntelligenceDashboardProps {
  opportunityId?: string;
  organizationId: string;
}

export const MarketIntelligenceDashboard: React.FC<MarketIntelligenceDashboardProps> = ({
  opportunityId,
  organizationId
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [intelligence, setIntelligence] = useState<MarketIntelligence[]>([]);
  const [monitoringJobs, setMonitoringJobs] = useState<MonitoringJob[]>([]);
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadIntelligenceData();
  }, [opportunityId, organizationId]);

  const loadIntelligenceData = async () => {
    try {
      setIsLoading(true);

      // Load market intelligence
      let intelligenceQuery = supabase
        .from('market_intelligence')
        .select('*')
        .eq('organization_id', organizationId);

      if (opportunityId) {
        intelligenceQuery = intelligenceQuery.eq('opportunity_id', opportunityId);
      }

      const { data: intelligenceData } = await intelligenceQuery
        .order('created_at', { ascending: false });

      // Load monitoring jobs
      const { data: jobsData } = await supabase
        .from('monitoring_jobs')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Load recent scraped data
      const { data: scrapedDataResult } = await supabase
        .from('scraped_data')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(20);

      setIntelligence(intelligenceData || []);
      setMonitoringJobs(jobsData || []);
      setScrapedData(scrapedDataResult || []);
    } catch (error) {
      console.error('Error loading intelligence data:', error);
      toast({
        title: "Error",
        description: "Failed to load market intelligence data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runCompetitorAnalysis = async (competitorUrls: string[]) => {
    if (!user?.id) return;

    try {
      setIsAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('browse-ai-scraper', {
        body: {
          action: 'scrape_competitors',
          data: {
            opportunityId,
            competitorUrls,
            organizationId
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Competitor analysis completed for ${competitorUrls.length} companies`,
      });

      await loadIntelligenceData();
    } catch (error) {
      console.error('Error running competitor analysis:', error);
      toast({
        title: "Error",
        description: "Failed to run competitor analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runMarketTrendAnalysis = async (market: string, keywords: string[]) => {
    try {
      setIsAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('browse-ai-scraper', {
        body: {
          action: 'analyze_market_trends',
          data: {
            market,
            keywords,
            organizationId
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Market trend analysis completed",
      });

      await loadIntelligenceData();
    } catch (error) {
      console.error('Error running market trend analysis:', error);
      toast({
        title: "Error",
        description: "Failed to run market trend analysis",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createMonitoringJob = async (jobData: any) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('browse-ai-scraper', {
        body: {
          action: 'create_monitoring_job',
          data: {
            ...jobData,
            organizationId,
            userId: user.id
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monitoring job created successfully",
      });

      await loadIntelligenceData();
    } catch (error) {
      console.error('Error creating monitoring job:', error);
      toast({
        title: "Error",
        description: "Failed to create monitoring job",
        variant: "destructive",
      });
    }
  };

  const runMonitoringJobs = async () => {
    try {
      setIsAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('browse-ai-scraper', {
        body: {
          action: 'monitor_opportunities',
          data: { organizationId }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${data.jobsProcessed} monitoring jobs completed`,
      });

      await loadIntelligenceData();
    } catch (error) {
      console.error('Error running monitoring jobs:', error);
      toast({
        title: "Error",
        description: "Failed to run monitoring jobs",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const competitorData = intelligence.filter(i => i.intelligence_type === 'competitor_analysis');
  const trendData = intelligence.filter(i => i.intelligence_type === 'market_trends');
  const overallConfidence = intelligence.length > 0 
    ? Math.round(intelligence.reduce((sum, i) => sum + i.confidence_score, 0) / intelligence.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Sources</p>
                <p className="text-2xl font-bold">{scrapedData.length}</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Competitors Analyzed</p>
                <p className="text-2xl font-bold">{competitorData.length}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Monitors</p>
                <p className="text-2xl font-bold">{monitoringJobs.filter(j => j.status === 'active').length}</p>
              </div>
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confidence Score</p>
                <p className="text-2xl font-bold">{overallConfidence}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={overallConfidence} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="intelligence" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="analysis">Analysis Tools</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button 
              onClick={runMonitoringJobs} 
              disabled={isAnalyzing}
              size="sm"
              variant="outline"
            >
              {isAnalyzing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Run Monitors
            </Button>
          </div>
        </div>

        <TabsContent value="intelligence" className="space-y-4">
          <div className="grid gap-4">
            {intelligence.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {item.intelligence_type.replace('_', ' ').toUpperCase()}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.source_platform === 'browse_ai' ? 'default' : 'secondary'}>
                        {item.source_platform}
                      </Badge>
                      <Badge variant="outline">
                        {item.confidence_score}% confidence
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {item.key_insights && (
                      <div>
                        <h4 className="font-semibold mb-2">Key Insights</h4>
                        <ul className="text-sm space-y-1">
                          {Array.isArray(item.key_insights) ? 
                            item.key_insights.map((insight: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {insight}
                              </li>
                            )) : (
                              <li className="text-muted-foreground">No insights available</li>
                            )
                          }
                        </ul>
                      </div>
                    )}

                    {item.competitive_data && Object.keys(item.competitive_data).length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Competitive Data</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          {Object.entries(item.competitive_data).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="ml-1 font-medium">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Impact: +{item.validation_impact} validation points</span>
                      <span>•</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {intelligence.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Intelligence Data Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by running competitor analysis or market trend analysis
                  </p>
                  <Button onClick={() => runCompetitorAnalysis(['https://example.com'])}>
                    Run Sample Analysis
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid gap-4">
            {monitoringJobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{job.job_name}</CardTitle>
                    <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                      {job.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4" />
                      <span>Type: {job.job_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4" />
                      <span>URLs: {job.target_urls.length}</span>
                    </div>
                    {job.last_run_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Last run: {new Date(job.last_run_at).toLocaleString()}</span>
                      </div>
                    )}
                    {job.next_run_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Next run: {new Date(job.next_run_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {monitoringJobs.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Monitoring Jobs</h3>
                  <p className="text-muted-foreground mb-4">
                    Create monitoring jobs to track competitors and market trends automatically
                  </p>
                  <Button onClick={() => createMonitoringJob({
                    jobName: 'Sample Monitor',
                    targetUrls: ['https://example.com'],
                    jobType: 'competitor_tracking',
                    scheduleFrequency: 'daily'
                  })}>
                    Create Sample Monitor
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Competitor Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Analyze competitor websites to gather pricing, features, and positioning data
                </p>
                <Button 
                  onClick={() => runCompetitorAnalysis([
                    'https://stripe.com',
                    'https://square.com',
                    'https://paypal.com'
                  ])}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Target className="mr-2 h-4 w-4" />
                  )}
                  Analyze Payment Processors
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Track market trends, funding announcements, and industry developments
                </p>
                <Button 
                  onClick={() => runMarketTrendAnalysis('fintech', ['payments', 'digital wallet', 'fintech'])}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  )}
                  Analyze Fintech Trends
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};