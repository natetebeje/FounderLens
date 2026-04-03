import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star } from 'lucide-react';

interface SponsorBannerProps {
  sponsor: {
    name: string;
    logo?: string;
    description: string;
    cta: string;
    url: string;
    badge?: string;
  };
  placement?: 'sidebar' | 'content' | 'header';
}

export const SponsorBanner = ({ sponsor, placement = 'sidebar' }: SponsorBannerProps) => {
  const handleClick = () => {
    // Track sponsor click
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'sponsor_click', {
        event_category: 'sponsorship',
        event_label: sponsor.name,
        placement: placement
      });
    }
    window.open(sponsor.url, '_blank', 'noopener,noreferrer');
  };

  if (placement === 'header') {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-primary p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {sponsor.logo && (
              <img src={sponsor.logo} alt={sponsor.name} className="w-8 h-8 rounded" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{sponsor.name}</span>
                {sponsor.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {sponsor.badge}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{sponsor.description}</p>
            </div>
          </div>
          <Button size="sm" onClick={handleClick} className="gap-1">
            {sponsor.cta}
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">
            <Star className="h-3 w-3 mr-1" />
            Sponsor
          </Badge>
          {sponsor.badge && (
            <Badge className="text-xs bg-primary/20 text-primary">
              {sponsor.badge}
            </Badge>
          )}
        </div>
        
        {sponsor.logo && (
          <div className="flex justify-center">
            <img src={sponsor.logo} alt={sponsor.name} className="w-16 h-16 rounded-lg object-cover" />
          </div>
        )}
        
        <div className="text-center space-y-2">
          <h4 className="font-semibold text-sm">{sponsor.name}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {sponsor.description}
          </p>
        </div>
        
        <Button size="sm" onClick={handleClick} className="w-full gap-2">
          {sponsor.cta}
          <ExternalLink className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};