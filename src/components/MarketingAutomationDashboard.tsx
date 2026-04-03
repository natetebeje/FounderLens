import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Calendar, 
  Users, 
  TrendingUp, 
  MessageSquare,
  Mail,
  Globe,
  Target,
  BarChart3,
  Play,
  Pause,
  Settings,
  Plus,
  Edit3,
  Send,
  Clock,
  Eye,
  Trash2
} from 'lucide-react';
import { ZapierIntegration } from './ZapierIntegration';
import { ContentDetailModal } from './ContentDetailModal';
import { ContentCalendar } from './ContentCalendar';

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  platforms: string[];
  performance_metrics: any;
  created_at: string;
}

interface MarketingContent {
  id: string;
  content: string;
  content_type: string;
  platform: string;
  status: string;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
  target_audience?: any;
  engagement_data?: any;
}

const MarketingAutomationDashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [content, setContent] = useState<MarketingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedContent, setSelectedContent] = useState<MarketingContent | null>(null);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const { toast } = useToast();

  // Form states for content generation
  const [contentForm, setContentForm] = useState({
    contentType: 'social_post',
    platform: 'twitter',
    topic: '',
    targetAudience: 'entrepreneurs and founders',
    tone: 'professional',
    keywords: ''
  });

  // Form states for campaign creation
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    campaignType: 'content_series',
    platforms: ['twitter'],
    keywords: '',
    themes: ''
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [campaignsResponse, contentResponse] = await Promise.all([
        supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('marketing_content').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      if (campaignsResponse.data) setCampaigns(campaignsResponse.data);
      if (contentResponse.data) setContent(contentResponse.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContentSelect = (content: MarketingContent) => {
    setSelectedContent(content);
    setIsContentModalOpen(true);
  };

  const handleQuickAction = async (contentId: string, action: 'schedule' | 'publish' | 'delete') => {
    try {
      switch (action) {
        case 'schedule':
          // Set for scheduling with default time (1 hour from now)
          const scheduleTime = new Date();
          scheduleTime.setHours(scheduleTime.getHours() + 1);
          
          await supabase
            .from('marketing_content')
            .update({ 
              status: 'scheduled',
              scheduled_for: scheduleTime.toISOString()
            })
            .eq('id', contentId);
          
          toast({
            title: "Content Scheduled",
            description: "Content scheduled for 1 hour from now"
          });
          break;
          
        case 'publish':
          // Add to publish queue
          await supabase.from('marketing_content_queue').insert({
            content_id: contentId,
            platform: 'twitter', // Default platform
            scheduled_time: new Date().toISOString(),
            status: 'pending'
          });
          
          await supabase
            .from('marketing_content')
            .update({ status: 'publishing' })
            .eq('id', contentId);
          
          toast({
            title: "Publishing Content",
            description: "Content is being published"
          });
          break;
          
        case 'delete':
          if (confirm('Are you sure you want to delete this content?')) {
            await supabase
              .from('marketing_content')
              .delete()
              .eq('id', contentId);
            
            toast({
              title: "Content Deleted",
              description: "Content has been deleted"
            });
          }
          break;
      }
      
      loadDashboardData();
    } catch (error: any) {
      console.error('Error performing action:', error);
      toast({
        title: "Action Failed",
        description: error.message || "Failed to perform action",
        variant: "destructive"
      });
    }
  };

  const generateContent = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-content-generator', {
        body: {
          contentType: contentForm.contentType,
          platform: contentForm.platform,
          topic: contentForm.topic,
          targetAudience: contentForm.targetAudience,
          tone: contentForm.tone,
          keywords: contentForm.keywords.split(',').map(k => k.trim()).filter(Boolean)
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Content Generated!",
          description: "New marketing content has been created successfully"
        });
        
        // Reset form and reload data
        setContentForm(prev => ({ ...prev, topic: '', keywords: '' }));
        loadDashboardData();
      } else {
        throw new Error(data.error || 'Content generation failed');
      }
    } catch (error: any) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const createCampaign = async () => {
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .insert({
          name: campaignForm.name,
          campaign_type: campaignForm.campaignType,
          platforms: campaignForm.platforms,
          target_keywords: campaignForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
          content_themes: campaignForm.themes.split(',').map(t => t.trim()).filter(Boolean),
          frequency_settings: {
            daily_posts: 2,
            peak_hours: ['9:00', '17:00']
          }
        });

      if (error) throw error;

      toast({
        title: "Campaign Created!",
        description: "New marketing campaign has been set up successfully"
      });

      // Reset form and reload data
      setCampaignForm({
        name: '',
        campaignType: 'content_series',
        platforms: ['twitter'],
        keywords: '',
        themes: ''
      });
      loadDashboardData();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create campaign",
        variant: "destructive"
      });
    }
  };

  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ status: newStatus })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: "Campaign Updated",
        description: `Campaign ${newStatus === 'active' ? 'activated' : 'paused'} successfully`
      });

      loadDashboardData();
    } catch (error: any) {
      console.error('Error updating campaign:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update campaign",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading marketing automation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Automation</h1>
          <p className="text-muted-foreground">
            AI-powered content generation and multi-channel distribution
          </p>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-primary/20 text-primary border-primary/20">
          <Zap className="w-4 h-4 mr-1" />
          AI Engine Active
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.filter(c => c.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">
              +2 from last week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Generated</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{content.length}</div>
            <p className="text-xs text-muted-foreground">
              +15 this week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Posts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{content.filter(c => c.status === 'scheduled').length}</div>
            <p className="text-xs text-muted-foreground">
              Next: 2 hours
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.2%</div>
            <p className="text-xs text-muted-foreground">
              +1.2% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content Generation</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="automation">Automation Rules</TabsTrigger>
          <TabsTrigger value="zapier">Zapier Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          {/* Content Calendar */}
          <ContentCalendar onContentSelect={handleContentSelect} />
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Content Generation Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Generate New Content
                </CardTitle>
                <CardDescription>
                  Create AI-powered marketing content for any platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contentType">Content Type</Label>
                    <Select value={contentForm.contentType} onValueChange={(value) => setContentForm(prev => ({ ...prev, contentType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="social_post">Social Media Post</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="blog_post">Blog Post</SelectItem>
                        <SelectItem value="landing_page">Landing Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Select value={contentForm.platform} onValueChange={(value) => setContentForm(prev => ({ ...prev, platform: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="reddit">Reddit</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="blog">Blog</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    value={contentForm.topic}
                    onChange={(e) => setContentForm(prev => ({ ...prev, topic: e.target.value }))}
                    placeholder="e.g., Business validation strategies for startups"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={contentForm.keywords}
                    onChange={(e) => setContentForm(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="e.g., startup, validation, market research"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={contentForm.tone} onValueChange={(value) => setContentForm(prev => ({ ...prev, tone: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="authoritative">Authoritative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audience">Target Audience</Label>
                    <Input
                      id="audience"
                      value={contentForm.targetAudience}
                      onChange={(e) => setContentForm(prev => ({ ...prev, targetAudience: e.target.value }))}
                      placeholder="entrepreneurs and founders"
                    />
                  </div>
                </div>

                <Button 
                  onClick={generateContent}
                  disabled={generating || !contentForm.topic}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Enhanced Content List */}
            <Card>
              <CardHeader>
                <CardTitle>Content Management</CardTitle>
                <CardDescription>
                  Review, edit, schedule, and publish your marketing content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {content.slice(0, 8).map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {item.platform || item.content_type}
                          </Badge>
                          <Badge 
                            variant={
                              item.status === 'published' ? 'default' : 
                              item.status === 'scheduled' ? 'secondary' : 
                              'outline'
                            }
                            className="text-xs"
                          >
                            {item.status}
                          </Badge>
                          {item.scheduled_for && (
                            <Badge variant="outline" className="text-xs text-blue-600">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(item.scheduled_for).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleContentSelect(item)}
                            className="h-7 w-7 p-0"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleContentSelect(item)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          {item.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuickAction(item.id, 'schedule')}
                                className="h-7 w-7 p-0"
                              >
                                <Clock className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuickAction(item.id, 'publish')}
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                              >
                                <Send className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuickAction(item.id, 'delete')}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {item.content}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                        <span>{item.content.length} characters</span>
                      </div>
                    </div>
                  ))}
                  
                  {content.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No content generated yet.</p>
                      <p className="text-sm">Create your first piece of marketing content above.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Campaign Creation Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Campaign
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign Name</Label>
                  <Input
                    id="campaignName"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Q1 Content Series"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaignType">Type</Label>
                  <Select value={campaignForm.campaignType} onValueChange={(value) => setCampaignForm(prev => ({ ...prev, campaignType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="content_series">Content Series</SelectItem>
                      <SelectItem value="lead_generation">Lead Generation</SelectItem>
                      <SelectItem value="product_launch">Product Launch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Target Keywords</Label>
                  <Textarea
                    id="keywords"
                    value={campaignForm.keywords}
                    onChange={(e) => setCampaignForm(prev => ({ ...prev, keywords: e.target.value }))}
                    placeholder="startup, business ideas, validation"
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={createCampaign}
                  disabled={!campaignForm.name}
                  className="w-full"
                >
                  Create Campaign
                </Button>
              </CardContent>
            </Card>

            {/* Active Campaigns */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Active Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{campaign.name}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                            >
                              {campaign.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground capitalize mb-2">
                          {campaign.campaign_type.replace('_', ' ')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {campaign.platforms.map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Marketing Analytics
              </CardTitle>
              <CardDescription>
                Performance metrics and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
                <p className="text-muted-foreground">
                  Detailed analytics and performance metrics will be available once you start running campaigns.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Automation Rules
              </CardTitle>
              <CardDescription>
                Set up triggers and automated actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Automation Rules Coming Soon</h3>
                <p className="text-muted-foreground">
                  Advanced automation rules and triggers will be available in the next update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zapier">
          <ZapierIntegration />
        </TabsContent>
      </Tabs>

      {/* Content Detail Modal */}
      <ContentDetailModal
        content={selectedContent}
        isOpen={isContentModalOpen}
        onClose={() => {
          setIsContentModalOpen(false);
          setSelectedContent(null);
        }}
        onContentUpdated={loadDashboardData}
      />
    </div>
  );
};

export default MarketingAutomationDashboard;