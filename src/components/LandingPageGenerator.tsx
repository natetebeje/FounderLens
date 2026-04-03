
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Globe, 
  Copy, 
  Download, 
  Sparkles, 
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LandingPageGeneratorProps {
  opportunity: any;
}

export const LandingPageGenerator = ({ opportunity }: LandingPageGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLanding, setGeneratedLanding] = useState<any>(null);
  const { toast } = useToast();

  const generateLandingPage = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('landing-page-generator', {
        body: { opportunity }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate landing page');
      }

      setGeneratedLanding(data);
      
      toast({
        title: "Landing Page Generated!",
        description: "Your AI-powered landing page is ready for review",
      });
      
    } catch (error) {
      console.error('Landing page generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Unable to generate landing page. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard",
    });
  };

  const exportHTML = () => {
    if (!generatedLanding) return;
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${generatedLanding.headline}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white">
    <div class="max-w-4xl mx-auto p-6">
        <div class="text-center space-y-4 mb-8">
            <h1 class="text-4xl font-bold text-gray-900">${generatedLanding.headline}</h1>
            <p class="text-xl text-gray-600 max-w-2xl mx-auto">${generatedLanding.subheadline}</p>
            <button class="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700">
                ${generatedLanding.cta}
            </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            ${generatedLanding.features.map(feature => `
                <div class="flex items-start gap-2">
                    <div class="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span class="text-sm">${feature}</span>
                </div>
            `).join('')}
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            ${Object.entries(generatedLanding.pricing).map(([plan, price]) => `
                <div class="border-2 border-gray-200 rounded-lg p-4 text-center">
                    <h4 class="font-semibold capitalize text-gray-900">${plan}</h4>
                    <div class="text-2xl font-bold my-2 text-gray-900">${price}</div>
                    <button class="w-full bg-gray-900 text-white py-2 px-4 rounded">Choose Plan</button>
                </div>
            `).join('')}
        </div>
        
        <div class="space-y-4">
            <h3 class="text-xl font-semibold text-center text-gray-900">What Our Customers Say</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${generatedLanding.testimonials.map(testimonial => `
                    <div class="border border-gray-200 rounded-lg p-4">
                        <p class="text-sm mb-3 text-gray-700">"${testimonial.quote}"</p>
                        <div class="text-xs text-gray-500">
                            <strong>${testimonial.name}</strong> - ${testimonial.role}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="text-center py-8 bg-gray-50 rounded-lg mt-8">
            <h3 class="text-2xl font-bold mb-4 text-gray-900">Ready to Get Started?</h3>
            <button class="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700">
                ${generatedLanding.cta}
            </button>
        </div>
    </div>
</body>
</html>
    `;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${opportunity.title.replace(/[^a-zA-Z0-9]/g, '-')}-landing-page.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (generatedLanding) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Your AI-Generated Landing Page</h3>
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Generated
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(generatedLanding, null, 2))}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Data
            </Button>
            <Button variant="outline" size="sm" onClick={exportHTML}>
              <Download className="w-4 h-4 mr-2" />
              Export HTML
            </Button>
          </div>
        </div>

        {/* Preview */}
        <Card className="border-2 border-dashed">
          <CardContent className="p-6">
            <div className="space-y-8">
              {/* Hero Section */}
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">{generatedLanding.headline}</h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  {generatedLanding.subheadline}
                </p>
                <Button size="lg" className="mt-4">
                  {generatedLanding.cta}
                </Button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedLanding.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(generatedLanding.pricing).map(([plan, price]) => (
                  <Card key={plan} className="border-2">
                    <CardContent className="p-4 text-center">
                      <h4 className="font-semibold capitalize">{plan}</h4>
                      <div className="text-2xl font-bold my-2">{String(price)}</div>
                      <Button size="sm" className="w-full">Choose Plan</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Testimonials */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-center">What Our Customers Say</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedLanding.testimonials.map((testimonial: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <p className="text-sm mb-3">"{testimonial.quote}"</p>
                        <div className="text-xs text-muted-foreground">
                          <strong>{testimonial.name}</strong> - {testimonial.role}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="text-center py-8 bg-muted/50 rounded-lg">
                <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
                <Button size="lg">
                  {generatedLanding.cta}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Next Steps for Market Validation</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Export the HTML and customize the design to match your brand</li>
            <li>• Set up a domain and hosting for your landing page</li>
            <li>• Add analytics tracking (Google Analytics, Facebook Pixel)</li>
            <li>• Create a waitlist or contact form to capture leads</li>
            <li>• Run targeted ads to test market response and conversion rates</li>
            <li>• A/B test different headlines and CTAs for optimization</li>
          </ul>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold mb-2">AI is Creating Your Landing Page</h3>
        <p className="text-muted-foreground">
          Analyzing your opportunity and generating compelling copy...
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          Generate Quick Landing Page
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">Opportunity: {opportunity.title}</h4>
          <p className="text-sm text-muted-foreground mb-3">{opportunity.description}</p>
          <div className="flex gap-2">
            <Badge variant="outline">{opportunity.difficulty_level}</Badge>
            <Badge variant="outline">{opportunity.competition_level} competition</Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold">AI Will Generate:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Compelling headline based on your problem statement</li>
            <li>• Feature highlights tailored to your target market</li>
            <li>• Realistic pricing structure for your market size</li>
            <li>• Authentic testimonials for your target audience</li>
            <li>• Clear call-to-action optimized for conversions</li>
            <li>• Mobile-responsive HTML export</li>
          </ul>
        </div>
        
        <Button onClick={generateLandingPage} className="w-full">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Landing Page with AI
        </Button>
      </CardContent>
    </Card>
  );
};
