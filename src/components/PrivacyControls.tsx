import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Cookie, Download, Eye, Trash2, Settings, X, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cookieManager, type CookieConsent } from '@/utils/cookieManager';
import { analytics } from '@/utils/analytics';

// CookieConsent interface now imported from cookieManager

export const PrivacyControls = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCookieScanner, setShowCookieScanner] = useState(false);
  const [cookieConsent, setCookieConsent] = useState<CookieConsent>({
    essential: true,
    analytics: false,
    marketing: false,
    functional: true // Default to accepting functional cookies for better UX
  });
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load existing consent from cookie manager
    const existingConsent = cookieManager.getConsent();
    if (existingConsent) {
      setCookieConsent(existingConsent);
      setShowBanner(false); // Don't show banner if consent already given
    } else {
      // Set default consent and show banner for first time users
      const defaultConsent = {
        essential: true,
        analytics: false,
        marketing: false,
        functional: true
      };
      setCookieConsent(defaultConsent);
      cookieManager.updateConsent(defaultConsent);
      setShowBanner(true);
      
      // Auto-hide banner after 48 hours
      setTimeout(() => {
        setShowBanner(false);
      }, 48 * 60 * 60 * 1000);
    }

    // Listen for consent changes
    const unsubscribe = cookieManager.onConsentChange((consent) => {
      setCookieConsent(consent);
    });

    return unsubscribe;
  }, []);

  const handleConsentUpdate = (type: keyof CookieConsent, value: boolean) => {
    const updatedConsent = { ...cookieConsent, [type]: value };
    setCookieConsent(updatedConsent);
    
    // Update consent through cookie manager (handles enforcement)
    cookieManager.updateConsent(updatedConsent);
    
    // Update analytics consent
    analytics.updateConsent(updatedConsent);

    toast({
      title: "Preferences Updated",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} cookies ${value ? 'enabled' : 'disabled'}`,
    });
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    setCookieConsent(allAccepted);
    cookieManager.updateConsent(allAccepted);
    analytics.updateConsent(allAccepted);
    setShowBanner(false);
    setShowModal(false);
    
    toast({
      title: "All cookies accepted",
      description: "You can change your preferences anytime in settings",
    });
  };

  const handleRejectAll = () => {
    const onlyEssential = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    setCookieConsent(onlyEssential);
    cookieManager.updateConsent(onlyEssential);
    analytics.updateConsent(onlyEssential);
    setShowBanner(false);
    setShowModal(false);
    
    toast({
      title: "Optional cookies rejected",
      description: "Only essential cookies will be used",
    });
  };

  const handleSavePreferences = () => {
    cookieManager.updateConsent(cookieConsent);
    analytics.updateConsent(cookieConsent);
    setShowBanner(false);
    setShowModal(false);
    
    toast({
      title: "Preferences saved",
      description: "Your cookie preferences have been updated",
    });
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    toast({
      title: "Cookie preferences saved",
      description: "Default settings applied. Access settings in footer anytime.",
    });
  };

  const exportUserData = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to export your data.",
          variant: "destructive",
        });
        return;
      }

      // Collect user data from various tables
      const [
        { data: profile },
        { data: opportunities },
        { data: goals },
        { data: skills },
        { data: experiences }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('business_opportunities').select('*').eq('user_id', user.id),
        supabase.from('user_goals').select('*').eq('user_id', user.id),
        supabase.from('user_skills').select('*').eq('user_id', user.id),
        supabase.from('user_experiences').select('*').eq('user_id', user.id)
      ]);

      // Export cookie and privacy data
      const privacyData = cookieManager.exportUserData();

      const userData = {
        profile,
        opportunities,
        goals,
        skills,
        experiences,
        privacy: privacyData,
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
        exportVersion: '2.0'
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `founderlens-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your data has been downloaded as a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const requestDataDeletion = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    try {
      // Clear local data immediately
      cookieManager.clearAllData();
      
      // Request server-side data deletion
      await supabase.functions.invoke('contact-form-submit', {
        body: {
          name: user.user_metadata?.first_name || 'User',
          email: user.email,
          subject: 'Data Deletion Request - GDPR/CCPA',
          message: `I would like to request the deletion of all my personal data from FounderLens in accordance with GDPR/CCPA regulations. User ID: ${user.id}`,
          botProtection: { confidence: 0, interactionData: true }
        }
      });

      toast({
        title: "Deletion request submitted",
        description: "Local data cleared. Server data will be deleted within 30 days",
      });
    } catch (error) {
      toast({
        title: "Request failed",
        description: "There was an error submitting your deletion request. Please contact support directly.",
        variant: "destructive",
      });
    }
  };

  const renderCookieScanner = () => {
    const cookiesByCategory = cookieManager.getCookiesByCategory();
    const activeCookies = cookieManager.getAllCookies();

    return (
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-medium text-muted-foreground">Cookie Scanner</h4>
        
        {Object.entries(cookiesByCategory).map(([category, cookies]) => (
          <Collapsible key={category}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start p-0 h-auto">
                <span className="text-xs capitalize">{category} Cookies ({cookies.length})</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pt-1">
              {cookies.map((cookie) => (
                <div key={cookie.name} className="text-xs p-2 border rounded text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{cookie.name}</p>
                      <p className="text-muted-foreground">{cookie.purpose}</p>
                      <p className="text-muted-foreground">
                        {cookie.provider} | {cookie.duration}
                      </p>
                    </div>
                    {activeCookies.some(active => active.name.match(cookie.name.replace('*', '.*'))) ? (
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
        
        {activeCookies.filter(active => !cookieManager.getCookieInfo(active.name)).length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-yellow-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Unknown Cookies
            </h5>
            {activeCookies
              .filter(active => !cookieManager.getCookieInfo(active.name))
              .map((cookie) => (
                <div key={cookie.name} className="text-xs p-2 border rounded bg-yellow-50 text-left">
                  <p className="font-medium">{cookie.name}</p>
                  <p className="text-muted-foreground">Unknown purpose - not in our database</p>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  // Bottom banner for first-time users
  if (showBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Cookie className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">We use cookies to improve your experience</p>
                <p className="text-muted-foreground text-xs">
                  Essential and functional cookies are enabled by default. You can customize anytime.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowModal(true)}
                className="text-xs"
              >
                Settings
              </Button>
              <Button 
                onClick={handleAcceptAll} 
                size="sm"
                className="text-xs"
              >
                Accept All
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDismissBanner}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Settings button when banner is hidden
  if (!showModal) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowModal(true)}
          className="bg-background shadow-lg"
        >
          <Cookie className="w-4 h-4 mr-2" />
          Privacy Settings
        </Button>
      </div>
    );
  }

  // Full settings modal
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cookie className="w-4 h-4" />
              Cookie Settings
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowModal(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We use cookies to enhance your experience. Choose your preferences below.
          </p>

          {/* Essential Cookies - Always On */}
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Essential</span>
                <Badge variant="secondary" className="text-xs">Required</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Necessary for basic functionality</p>
            </div>
            <Switch checked={cookieConsent.essential} disabled />
          </div>

          {/* Analytics Cookies */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium">Analytics</span>
              <p className="text-xs text-muted-foreground">Help improve our service</p>
            </div>
            <Switch
              checked={cookieConsent.analytics}
              onCheckedChange={(checked) => handleConsentUpdate('analytics', checked)}
            />
          </div>

          {/* Marketing Cookies */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm font-medium">Marketing</span>
              <p className="text-xs text-muted-foreground">Personalized advertisements</p>
            </div>
            <Switch
              checked={cookieConsent.marketing}
              onCheckedChange={(checked) => handleConsentUpdate('marketing', checked)}
            />
          </div>

          {/* Advanced Settings */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start p-0 h-auto">
                <Settings className="w-3 h-3 mr-2" />
                <span className="text-xs">Advanced Settings</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm font-medium">Functional</span>
                  <p className="text-xs text-muted-foreground">Enhanced features</p>
                </div>
                <Switch
                  checked={cookieConsent.functional}
                  onCheckedChange={(checked) => handleConsentUpdate('functional', checked)}
                />
              </div>
              
              <div className="border-t pt-3 space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Data Rights</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportUserData}
                    disabled={isExporting}
                    className="text-xs h-8"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    {isExporting ? 'Exporting...' : 'Export'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/privacy', '_blank')}
                    className="text-xs h-8"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Privacy
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCookieScanner(!showCookieScanner)}
                  className="text-xs h-8 w-full"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Cookie Scanner
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestDataDeletion}
                  className="text-xs h-8 w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete Data
                </Button>
              </div>
              
              {showCookieScanner && renderCookieScanner()}
            </CollapsibleContent>
          </Collapsible>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleAcceptAll} size="sm" className="flex-1 text-xs">
              Accept All
            </Button>
            <Button onClick={handleRejectAll} variant="outline" size="sm" className="flex-1 text-xs">
              Reject Optional
            </Button>
          </div>
          
          <Button 
            onClick={handleSavePreferences} 
            variant="secondary" 
            size="sm" 
            className="w-full text-xs"
          >
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};