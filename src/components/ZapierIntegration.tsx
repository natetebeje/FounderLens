import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Zap, 
  Plus, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Copy,
  Play,
  Pause,
  Trash2,
  Globe,
  Mail,
  Users,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ZapierWebhook {
  id: string;
  name: string;
  webhook_url: string;
  event_type: string;
  is_active: boolean;
  last_triggered?: string;
  trigger_count: number;
  description?: string;
  created_at: string;
}

interface WebhookTest {
  id: string;
  status: 'pending' | 'success' | 'failed';
  response?: any;
  error?: string;
  timestamp: string;
}

export const ZapierIntegration: React.FC = () => {
  const [webhooks, setWebhooks] = useState<ZapierWebhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  // Form state for new webhook
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    webhook_url: '',
    event_type: 'content_generated',
    description: ''
  });

  const eventTypes = [
    { value: 'content_ready_for_publishing', label: 'Content Ready for Publishing', description: 'Triggered when content is generated and ready to be published to social media' },
    { value: 'content_published_success', label: 'Content Published Successfully', description: 'Triggered when content is successfully published via Zapier' },
    { value: 'content_published_failed', label: 'Content Publishing Failed', description: 'Triggered when content publishing fails via Zapier' },
    { value: 'content_generated', label: 'Content Generated', description: 'Triggered when new content is created (general tracking)' },
    { value: 'lead_captured', label: 'Lead Captured', description: 'Triggered when a new lead is identified' },
    { value: 'opportunity_created', label: 'Opportunity Created', description: 'Triggered when a new business opportunity is discovered' },
    { value: 'campaign_completed', label: 'Campaign Completed', description: 'Triggered when a marketing campaign finishes' },
    { value: 'analytics_milestone', label: 'Analytics Milestone', description: 'Triggered when performance targets are reached' },
    { value: 'automation_error', label: 'Automation Error', description: 'Triggered when automation workflows fail' }
  ];

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setIsLoading(true);
    try {
      // Use dynamic query since types aren't regenerated yet
      const { data, error } = await (supabase as any)
        .from('zapier_webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error: any) {
      console.error('Error loading webhooks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Zapier webhooks',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createWebhook = async () => {
    if (!newWebhook.name || !newWebhook.webhook_url) {
      toast({
        title: 'Missing Information',
        description: 'Please provide both name and webhook URL',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('zapier_webhooks')
        .insert({
          name: newWebhook.name,
          webhook_url: newWebhook.webhook_url,
          event_type: newWebhook.event_type,
          description: newWebhook.description,
          is_active: true,
          trigger_count: 0,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: 'Webhook Created',
        description: 'Zapier webhook has been configured successfully'
      });

      setNewWebhook({
        name: '',
        webhook_url: '',
        event_type: 'content_generated',
        description: ''
      });
      setShowAddForm(false);
      loadWebhooks();
    } catch (error: any) {
      console.error('Error creating webhook:', error);
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create webhook',
        variant: 'destructive'
      });
    }
  };

  const testWebhook = async (webhook: ZapierWebhook) => {
    setTesting(webhook.id);
    try {
      const testData = {
        event_type: webhook.event_type,
        timestamp: new Date().toISOString(),
        test: true,
        data: {
          message: 'This is a test trigger from FounderLens',
          webhook_name: webhook.name,
          triggered_by: 'manual_test'
        }
      };

      const response = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify(testData)
      });

      // Since we're using no-cors, we can't read the response status
      // But the request was sent successfully
      toast({
        title: 'Test Sent',
        description: 'Test webhook has been triggered. Check your Zap history in Zapier.',
      });

      // Update trigger count
      await (supabase as any)
        .from('zapier_webhooks')
        .update({ 
          trigger_count: webhook.trigger_count + 1,
          last_triggered: new Date().toISOString()
        })
        .eq('id', webhook.id);

      loadWebhooks();
    } catch (error: any) {
      console.error('Error testing webhook:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to send test webhook. Please check the URL.',
        variant: 'destructive'
      });
    } finally {
      setTesting(null);
    }
  };

  const toggleWebhook = async (webhook: ZapierWebhook) => {
    try {
      const { error } = await (supabase as any)
        .from('zapier_webhooks')
        .update({ is_active: !webhook.is_active })
        .eq('id', webhook.id);

      if (error) throw error;

      toast({
        title: 'Webhook Updated',
        description: `Webhook ${webhook.is_active ? 'disabled' : 'enabled'} successfully`
      });

      loadWebhooks();
    } catch (error: any) {
      console.error('Error toggling webhook:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update webhook',
        variant: 'destructive'
      });
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const { error } = await (supabase as any)
        .from('zapier_webhooks')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;

      toast({
        title: 'Webhook Deleted',
        description: 'Zapier webhook has been removed successfully'
      });

      loadWebhooks();
    } catch (error: any) {
      console.error('Error deleting webhook:', error);
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete webhook',
        variant: 'destructive'
      });
    }
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied',
      description: 'Webhook URL copied to clipboard'
    });
  };

  const getEventTypeInfo = (eventType: string) => {
    return eventTypes.find(type => type.value === eventType) || eventTypes[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Zapier integration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Zapier Integration</h2>
          </div>
          <p className="text-muted-foreground mt-1">
            Connect your automation workflows to 7,000+ apps with Zapier
          </p>
        </div>
        
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {/* Setup Instructions */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Configure webhooks to trigger Zaps when events occur in your marketing automation.
          </span>
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://zapier.com/apps/webhook/integrations" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Setup Guide
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Active Webhooks</TabsTrigger>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
          <TabsTrigger value="templates">Zap Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4">
          {/* Add Webhook Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Webhook</CardTitle>
                <CardDescription>
                  Create a webhook to trigger Zapier automations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-name">Webhook Name</Label>
                    <Input
                      id="webhook-name"
                      value={newWebhook.name}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Content Automation Trigger"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-type">Event Type</Label>
                    <select
                      id="event-type"
                      value={newWebhook.event_type}
                      onChange={(e) => setNewWebhook(prev => ({ ...prev, event_type: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                    >
                      {eventTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Zapier Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    value={newWebhook.webhook_url}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, webhook_url: e.target.value }))}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newWebhook.description}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this webhook does..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={createWebhook}>
                    Create Webhook
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Webhooks List */}
          <div className="grid gap-4">
            {webhooks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Webhooks Configured</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Start by adding your first Zapier webhook to automate your workflows
                  </p>
                  <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Webhook
                  </Button>
                </CardContent>
              </Card>
            ) : (
              webhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{webhook.name}</h3>
                        <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                          {webhook.is_active ? 'Active' : 'Paused'}
                        </Badge>
                        <Badge variant="outline">
                          {getEventTypeInfo(webhook.event_type).label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testWebhook(webhook)}
                          disabled={testing === webhook.id}
                        >
                          {testing === webhook.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Test
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleWebhook(webhook)}
                        >
                          {webhook.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {webhook.description && (
                      <CardDescription>{webhook.description}</CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Webhook URL:</span>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs max-w-xs truncate">
                          {webhook.webhook_url}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyWebhookUrl(webhook.webhook_url)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Triggered:</span>
                        <span className="ml-2 font-medium">{webhook.trigger_count} times</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last triggered:</span>
                        <span className="ml-2 font-medium">
                          {webhook.last_triggered 
                            ? new Date(webhook.last_triggered).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automated Content Publishing Setup</CardTitle>
              <CardDescription>
                Connect FounderLens to automatically publish content via Zapier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>Automated Publishing:</strong> Set up Zapier to automatically publish content to LinkedIn, Twitter, and other platforms when it's generated in FounderLens.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Create a Zapier Account & New Zap</h4>
                    <p className="text-muted-foreground">
                      Sign up for Zapier and create a new Zap. Choose "Webhooks by Zapier" as your trigger.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">Configure Webhook Trigger</h4>
                    <p className="text-muted-foreground">
                      Select "Catch Hook" and copy the webhook URL. Create a webhook above with event type "Content Ready for Publishing".
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold">Add Publishing Action</h4>
                    <p className="text-muted-foreground">
                      Connect LinkedIn, Twitter, or other social platforms. Map the "content" field from the webhook to your post content.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold">Optional: Add Feedback Webhook</h4>
                    <p className="text-muted-foreground">
                      Send success/failure data back to FounderLens for tracking.
                    </p>
                    <code className="text-xs bg-muted p-1 rounded mt-1 block">
                      POST to: /functions/v1/zapier-publishing-feedback
                    </code>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold">
                    5
                  </div>
                  <div>
                    <h4 className="font-semibold">Test & Activate</h4>
                    <p className="text-muted-foreground">
                      Test your Zap, then turn it on. Content generation will now automatically trigger publishing!
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 mt-6">
                <Alert>
                  <Globe className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Pro Tip:</strong> Create separate Zaps for each platform to customize posting schedules.
                  </AlertDescription>
                </Alert>
                
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Webhook Data:</strong> Includes content, platform, topic, tone, and keywords.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Marketing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Automatically send generated content to your email marketing platform
                </p>
                <div className="space-y-2">
                  <div className="text-sm"><strong>Trigger:</strong> Content Generated</div>
                  <div className="text-sm"><strong>Actions:</strong> Add to Mailchimp, ConvertKit, or ActiveCampaign</div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://zapier.com/shared/create-zap-from-template" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Use Template
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Lead Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add captured leads to your CRM or lead management system
                </p>
                <div className="space-y-2">
                  <div className="text-sm"><strong>Trigger:</strong> Lead Captured</div>
                  <div className="text-sm"><strong>Actions:</strong> Add to HubSpot, Salesforce, or Airtable</div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://zapier.com/shared/create-zap-from-template" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Use Template
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Social Media
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Cross-post content to multiple social media platforms
                </p>
                <div className="space-y-2">
                  <div className="text-sm"><strong>Trigger:</strong> Content Generated</div>
                  <div className="text-sm"><strong>Actions:</strong> Post to Buffer, Hootsuite, or Later</div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://zapier.com/shared/create-zap-from-template" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Use Template
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Get notified when important events occur in your automation
                </p>
                <div className="space-y-2">
                  <div className="text-sm"><strong>Trigger:</strong> Analytics Milestone</div>
                  <div className="text-sm"><strong>Actions:</strong> Send Slack message or Email notification</div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://zapier.com/shared/create-zap-from-template" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Use Template
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};