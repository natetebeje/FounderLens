import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Users,
  ArrowRight,
  Play
} from 'lucide-react';

interface CaseStudy {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image_url: string;
  author_name: string;
  revenue_range: string;
  industry: string;
  time_to_revenue: string;
  has_build_track: boolean;
}

interface CaseStudiesHeroProps {
  featuredCaseStudy: CaseStudy | null;
  totalCaseStudies: number;
}

export const CaseStudiesHero = ({ featuredCaseStudy, totalCaseStudies }: CaseStudiesHeroProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          Success Case Studies
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Real founder stories with actual revenue numbers, proven strategies, and step-by-step build guides
        </p>
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span>{totalCaseStudies} Success Stories</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span>Real Revenue Data</span>
          </div>
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-green-600" />
            <span>Video Build Guides</span>
          </div>
        </div>
      </div>

      {/* Featured Case Study */}
      {featuredCaseStudy && (
        <Card className="overflow-hidden border-2 border-green-500/20 bg-gradient-to-r from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Image */}
              <div className="relative h-64 lg:h-auto">
                <img
                  src={featuredCaseStudy.featured_image_url || "/placeholder.svg"}
                  alt={featuredCaseStudy.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-green-600 text-white border-0">
                    Featured Success
                  </Badge>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-8 flex flex-col justify-center space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">
                    {featuredCaseStudy.title}
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    {featuredCaseStudy.excerpt}
                  </p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <DollarSign className="h-6 w-6 mx-auto text-green-600 mb-1" />
                    <div className="font-semibold text-sm">{featuredCaseStudy.revenue_range}</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </div>
                  <div className="text-center">
                    <Clock className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                    <div className="font-semibold text-sm">{featuredCaseStudy.time_to_revenue}</div>
                    <div className="text-xs text-muted-foreground">To Revenue</div>
                  </div>
                  <div className="text-center">
                    <Users className="h-6 w-6 mx-auto text-purple-600 mb-1" />
                    <div className="font-semibold text-sm">{featuredCaseStudy.industry}</div>
                    <div className="text-xs text-muted-foreground">Industry</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => navigate(`/stories/${featuredCaseStudy.slug}`)}
                    className="flex-1"
                  >
                    Read Full Story
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  {featuredCaseStudy.has_build_track && (
                    <Button 
                      onClick={() => navigate('/build')}
                      variant="outline"
                      className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Build This
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};