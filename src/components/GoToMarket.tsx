import { useState } from 'react';
import { ArrowRight, Copy, ExternalLink, BarChart3, Users, Target, Rocket, MessageSquare, Mail, Globe, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GoToMarketProps {
  opportunity: {
    id: string;
    title: string;
    description: string;
  };
  initialStep?: number;
  onStepChange?: (step: number) => void;
}

interface ContentKit {
  platform: string;
  content: string;
  hashtags?: string[];
  tone: string;
  cta: string;
  intent?: string;
  recommendedAngle?: string;
  utmSuffix?: string;
}

export const GoToMarket = ({ opportunity, initialStep = 1, onStepChange }: GoToMarketProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contentKits, setContentKits] = useState<ContentKit[]>([]);
  const [activeStep, setActiveStep] = useState(initialStep);
  const [formData, setFormData] = useState({
    targetAudience: '',
    keyBenefits: '',
    tone: 'professional',
    urgency: 'medium',
    channels: [] as string[],
    landingPageUrl: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: 'first-customers'
  });
  const [leadCount, setLeadCount] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);

  // Show loading state if opportunity data is not available
  if (!opportunity) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const channels = [
    { id: 'twitter', name: 'Twitter/X', icon: MessageSquare },
    { id: 'linkedin', name: 'LinkedIn', icon: Users },
    { id: 'reddit', name: 'Reddit', icon: MessageSquare },
    { id: 'email', name: 'Email', icon: Mail },
    { id: 'landing_page', name: 'Landing Page', icon: Globe }
  ];

  const generateContentKits = async () => {
    if (!formData.targetAudience || !formData.keyBenefits || formData.channels.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in target audience, key benefits, and select at least one channel.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const kits: ContentKit[] = [];

      for (const channel of formData.channels) {
        const { data, error } = await supabase.functions.invoke('ai-content-generator', {
          body: {
            contentType: 'social_post',
            topic: opportunity.title,
            platform: channel,
            targetAudience: formData.targetAudience,
            tone: formData.tone,
            keywords: formData.keyBenefits.split(',').map(k => k.trim()),
            directPost: false,
            opportunity: {
              id: opportunity.id,
              title: opportunity.title,
              description: opportunity.description
            },
            autoIntent: true
          }
        });

        if (error) throw error;

        if (data?.content) {
          kits.push({
            platform: channel,
            content: data.content,
            hashtags: data.hashtags || [],
            tone: formData.tone,
            cta: data.suggestedCTA || generateCTA(channel),
            intent: data.intent,
            recommendedAngle: data.recommendedAngle,
            utmSuffix: data.utmSuffix
          });
        }
      }

      setContentKits(kits);
      const newStep = 2;
      setActiveStep(newStep);
      onStepChange?.(newStep);
      toast({
        title: "Content Kits Generated!",
        description: `Created ${kits.length} channel-ready content pieces.`,
      });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content kits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCTA = (channel: string) => {
    const baseUrl = formData.landingPageUrl || 'founderlens.io';
    const utm = buildUTMString(channel);
    
    switch (channel) {
      case 'twitter':
        return `Try it: ${baseUrl}${utm}`;
      case 'linkedin':
        return `Learn more: ${baseUrl}${utm}`;
      case 'reddit':
        return `Check it out: ${baseUrl}${utm}`;
      case 'email':
        return `Get started: ${baseUrl}${utm}`;
      default:
        return `Visit: ${baseUrl}${utm}`;
    }
  };

  const buildUTMString = (channel: string, kit?: ContentKit) => {
    const params = new URLSearchParams();
    if (formData.utmSource || channel) params.append('utm_source', formData.utmSource || channel);
    if (formData.utmMedium) params.append('utm_medium', formData.utmMedium);
    
    // Use AI-suggested UTM suffix if available
    const campaignName = kit?.utmSuffix ? `${formData.utmCampaign}-${kit.utmSuffix}` : formData.utmCampaign;
    if (campaignName) params.append('utm_campaign', campaignName);
    
    return params.toString() ? `?${params.toString()}` : '';
  };

  const copyToClipboard = async (text: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${platform} content copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy content. Please select and copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleChannelToggle = (channelId: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channelId)
        ? prev.channels.filter(c => c !== channelId)
        : [...prev.channels, channelId]
    }));
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Define Your Go-To-Market Strategy</h3>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="target-audience">Target Audience</Label>
            <Textarea
              id="target-audience"
              placeholder="Describe your ideal customers (e.g., 'SaaS founders looking to validate ideas', 'Solo entrepreneurs in tech')"
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="key-benefits">Key Benefits (comma-separated)</Label>
            <Input
              id="key-benefits"
              placeholder="e.g., saves time, reduces risk, increases success rate"
              value={formData.keyBenefits}
              onChange={(e) => setFormData(prev => ({ ...prev, keyBenefits: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tone">Content Tone</Label>
              <Select value={formData.tone} onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value }))}>
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

            <div>
              <Label htmlFor="urgency">Campaign Urgency</Label>
              <Select value={formData.urgency} onValueChange={(value) => setFormData(prev => ({ ...prev, urgency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Build awareness</SelectItem>
                  <SelectItem value="medium">Medium - Generate interest</SelectItem>
                  <SelectItem value="high">High - Drive immediate action</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Select Channels</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {channels.map(channel => {
                const Icon = channel.icon;
                const isSelected = formData.channels.includes(channel.id);
                return (
                  <Button
                    key={channel.id}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => handleChannelToggle(channel.id)}
                    className="h-auto p-3 flex flex-col items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{channel.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">UTM Tracking Setup</h4>
            <div className="grid gap-3">
              <div>
                <Label htmlFor="landing-url">Landing Page URL</Label>
                <Input
                  id="landing-url"
                  placeholder="https://yourwebsite.com"
                  value={formData.landingPageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, landingPageUrl: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="utm-source">UTM Source</Label>
                  <Input
                    id="utm-source"
                    placeholder="twitter"
                    value={formData.utmSource}
                    onChange={(e) => setFormData(prev => ({ ...prev, utmSource: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="utm-medium">UTM Medium</Label>
                  <Input
                    id="utm-medium"
                    placeholder="social"
                    value={formData.utmMedium}
                    onChange={(e) => setFormData(prev => ({ ...prev, utmMedium: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="utm-campaign">UTM Campaign</Label>
                  <Input
                    id="utm-campaign"
                    value={formData.utmCampaign}
                    onChange={(e) => setFormData(prev => ({ ...prev, utmCampaign: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={generateContentKits} disabled={loading} className="w-full">
        {loading ? "Generating Content..." : "Generate Content Kits"}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Content Kits</h3>
        <Button variant="outline" onClick={() => {
          const newStep = 3;
          setActiveStep(newStep);
          onStepChange?.(newStep);
        }}>
          View Dashboard
          <BarChart3 className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4">
        {contentKits.map((kit, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base capitalize">{kit.platform}</CardTitle>
                  {kit.intent && (
                    <Badge variant="secondary" className="text-xs">
                      {kit.intent}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(kit.content, kit.platform)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Post Now
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{kit.content}</p>
                </div>
                {kit.hashtags && kit.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {kit.hashtags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div><strong>CTA:</strong> {kit.cta}</div>
                  {kit.recommendedAngle && (
                    <div><strong>Angle:</strong> {kit.recommendedAngle}</div>
                  )}
                  {kit.utmSuffix && (
                    <div><strong>UTM:</strong> {formData.utmCampaign}-{kit.utmSuffix}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => {
          const newStep = 1;
          setActiveStep(newStep);
          onStepChange?.(newStep);
        }}>
          Back to Setup
        </Button>
        <Button onClick={() => {
          const newStep = 3;
          setActiveStep(newStep);
          onStepChange?.(newStep);
        }} className="flex-1">
          Go to Dashboard
          <BarChart3 className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">First Customers Dashboard</h3>
        <Button variant="outline" onClick={() => {
          const newStep = 2;
          setActiveStep(newStep);
          onStepChange?.(newStep);
        }}>
          Back to Content
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Content Created</p>
                <p className="text-lg font-semibold">{contentKits.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Leads Captured</p>
                <p className="text-lg font-semibold">{leadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-lg font-semibold">{conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Days Active</p>
                <p className="text-lg font-semibold">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Capture Snippet</CardTitle>
          <CardDescription>
            Add this HTML snippet to your landing page to track conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
              {`<!-- FounderLens Lead Capture -->
<script>
(function() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('utm_source')) {
    // Track lead source
    console.log('Lead from:', params.get('utm_source'));
    // Add your analytics tracking here
  }
})();
</script>`}
            </div>
            <Button
              variant="outline"
              onClick={() => copyToClipboard(`<!-- FounderLens Lead Capture -->
<script>
(function() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('utm_source')) {
    console.log('Lead from:', params.get('utm_source'));
  }
})();
</script>`, 'Lead Capture Snippet')}
              className="w-full"
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy Snippet
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 bg-primary rounded-full" />
              Post your content across selected channels
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 bg-muted rounded-full" />
              Monitor UTM parameters in your analytics
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 bg-muted rounded-full" />
              Collect feedback from early users
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 bg-muted rounded-full" />
              Iterate based on performance data
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Go-To-Market Accelerator</h2>
        <p className="text-muted-foreground">
          Generate channel-ready content and track your first customer acquisition for "{opportunity.title}"
        </p>
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                activeStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-12 h-0.5 ${
                  activeStep > step ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {activeStep === 1 && renderStep1()}
          {activeStep === 2 && renderStep2()}
          {activeStep === 3 && renderStep3()}
        </CardContent>
      </Card>
    </div>
  );
};