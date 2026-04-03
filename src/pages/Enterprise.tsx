import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Palette, 
  Shield, 
  Globe, 
  Upload,
  Lock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EnterpriseSettings {
  white_label_enabled: boolean;
  custom_logo_url: string;
  custom_brand_color: string;
  custom_domain: string;
  sso_enabled: boolean;
  sso_provider: string;
  sso_config: Record<string, any>;
}

const Enterprise = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useWorkspace();
  const { canUseFeature } = useFeatureGating(currentOrganization?.id);
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<EnterpriseSettings>({
    white_label_enabled: false,
    custom_logo_url: '',
    custom_brand_color: '#2563eb',
    custom_domain: '',
    sso_enabled: false,
    sso_provider: '',
    sso_config: {}
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canUseFeature('enterprise_features')) {
      navigate('/pricing');
      return;
    }
    loadEnterpriseSettings();
  }, [currentOrganization, canUseFeature, navigate]);

  const loadEnterpriseSettings = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('enterprise_settings')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          white_label_enabled: data.white_label_enabled,
          custom_logo_url: data.custom_logo_url || '',
          custom_brand_color: data.custom_brand_color || '#2563eb',
          custom_domain: data.custom_domain || '',
          sso_enabled: data.sso_enabled,
          sso_provider: data.sso_provider || '',
          sso_config: (data.sso_config as Record<string, any>) || {}
        });
      }
    } catch (error) {
      console.error('Error loading enterprise settings:', error);
      toast({
        title: "Error",
        description: "Failed to load enterprise settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!currentOrganization) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('enterprise_settings')
        .upsert({
          organization_id: currentOrganization.id,
          white_label_enabled: settings.white_label_enabled,
          custom_logo_url: settings.custom_logo_url,
          custom_brand_color: settings.custom_brand_color,
          custom_domain: settings.custom_domain,
          sso_enabled: settings.sso_enabled,
          sso_provider: settings.sso_provider,
          sso_config: settings.sso_config,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Enterprise settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save enterprise settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    // In a real implementation, you would upload to Supabase Storage
    const reader = new FileReader();
    reader.onload = (e) => {
      setSettings(prev => ({
        ...prev,
        custom_logo_url: e.target?.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading enterprise settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Settings className="w-8 h-8 text-primary" />
                Enterprise Settings
              </h1>
              <p className="text-muted-foreground mt-2">
                Configure white-labeling, SSO, and advanced security features
              </p>
            </div>
            <Badge variant="outline" className="bg-gradient-primary text-white">
              Enterprise Plan
            </Badge>
          </div>

          <Tabs defaultValue="branding" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="branding" className="gap-2">
                <Palette className="w-4 h-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="sso" className="gap-2">
                <Shield className="w-4 h-4" />
                SSO
              </TabsTrigger>
              <TabsTrigger value="domain" className="gap-2">
                <Globe className="w-4 h-4" />
                Domain
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Lock className="w-4 h-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    White-Label Branding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable White-Labeling</Label>
                      <p className="text-sm text-muted-foreground">
                        Customize the platform with your brand colors and logo
                      </p>
                    </div>
                    <Switch
                      checked={settings.white_label_enabled}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, white_label_enabled: checked }))
                      }
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="logo">Custom Logo</Label>
                      <div className="flex items-center gap-4 mt-2">
                        {settings.custom_logo_url && (
                          <img 
                            src={settings.custom_logo_url} 
                            alt="Custom logo" 
                            className="w-16 h-16 object-contain border rounded"
                          />
                        )}
                        <div>
                          <Button
                            variant="outline"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                            className="gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Logo
                          </Button>
                          <input
                            id="logo-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(file);
                            }}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Recommended: PNG/SVG, 200x50px
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="brand-color">Brand Color</Label>
                      <div className="flex items-center gap-4 mt-2">
                        <Input
                          id="brand-color"
                          type="color"
                          value={settings.custom_brand_color}
                          onChange={(e) => 
                            setSettings(prev => ({ ...prev, custom_brand_color: e.target.value }))
                          }
                          className="w-20 h-10"
                        />
                        <Input
                          value={settings.custom_brand_color}
                          onChange={(e) => 
                            setSettings(prev => ({ ...prev, custom_brand_color: e.target.value }))
                          }
                          placeholder="#2563eb"
                          className="max-w-32"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sso" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Single Sign-On (SSO)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Enable SSO</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow users to sign in with your identity provider
                      </p>
                    </div>
                    <Switch
                      checked={settings.sso_enabled}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, sso_enabled: checked }))
                      }
                    />
                  </div>

                  {settings.sso_enabled && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div>
                          <Label>SSO Provider</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {['SAML', 'OIDC', 'OAuth2'].map((provider) => (
                              <Button
                                key={provider}
                                variant={settings.sso_provider === provider ? "default" : "outline"}
                                onClick={() => 
                                  setSettings(prev => ({ ...prev, sso_provider: provider }))
                                }
                                className="h-16"
                              >
                                {provider}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="sso-config">SSO Configuration (JSON)</Label>
                          <Textarea
                            id="sso-config"
                            value={JSON.stringify(settings.sso_config, null, 2)}
                            onChange={(e) => {
                              try {
                                const config = JSON.parse(e.target.value);
                                setSettings(prev => ({ ...prev, sso_config: config }));
                              } catch {
                                // Invalid JSON, ignore
                              }
                            }}
                            rows={6}
                            placeholder='{"issuer": "https://your-provider.com", "clientId": "your-client-id"}'
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="domain" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Custom Domain
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="custom-domain">Domain</Label>
                    <Input
                      id="custom-domain"
                      value={settings.custom_domain}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, custom_domain: e.target.value }))
                      }
                      placeholder="app.yourcompany.com"
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure a custom domain for your white-labeled instance
                    </p>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      DNS Configuration Required
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      To use a custom domain, add this CNAME record to your DNS:
                    </p>
                    <div className="bg-background p-2 rounded border font-mono text-sm">
                      CNAME {settings.custom_domain || 'your-domain.com'} → founderlens.app
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h4 className="font-medium text-green-800">Enabled Features</h4>
                      </div>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• End-to-end encryption</li>
                        <li>• SOC 2 Type II compliance</li>
                        <li>• GDPR compliance</li>
                        <li>• Audit logging</li>
                        <li>• Advanced user permissions</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-5 h-5 text-blue-600" />
                        <h4 className="font-medium text-blue-800">Additional Security</h4>
                      </div>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• IP allowlisting</li>
                        <li>• Session timeout controls</li>
                        <li>• Multi-factor authentication</li>
                        <li>• Advanced threat detection</li>
                        <li>• Custom security policies</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              size="lg"
              className="gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Enterprise;