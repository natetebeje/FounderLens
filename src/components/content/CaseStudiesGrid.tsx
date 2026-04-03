import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  Clock, 
  Users,
  ArrowRight,
  Play,
  Eye
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
  view_count: number;
  reading_time_minutes: number;
}

interface CaseStudiesGridProps {
  caseStudies: CaseStudy[];
}

export const CaseStudiesGrid = ({ caseStudies }: CaseStudiesGridProps) => {
  const navigate = useNavigate();

  if (caseStudies.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No case studies found. Check back soon for more success stories!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {caseStudies.map((caseStudy) => (
        <Card key={caseStudy.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
          {/* Image */}
          <div className="relative h-48 overflow-hidden">
            <img
              src={caseStudy.featured_image_url || "/placeholder.svg"}
              alt={caseStudy.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-black/80 text-white border-0">
                {caseStudy.revenue_range}
              </Badge>
            </div>
            {caseStudy.has_build_track && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-green-600 text-white border-0">
                  <Play className="h-3 w-3 mr-1" />
                  Build Track
                </Badge>
              </div>
            )}
          </div>

          <CardHeader className="pb-3">
            <h3 className="text-xl font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {caseStudy.title}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2">
              {caseStudy.excerpt}
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <Clock className="h-4 w-4 mx-auto text-blue-600 mb-1" />
                <div className="text-xs font-medium">{caseStudy.time_to_revenue}</div>
                <div className="text-xs text-muted-foreground">To Revenue</div>
              </div>
              <div>
                <Users className="h-4 w-4 mx-auto text-purple-600 mb-1" />
                <div className="text-xs font-medium">{caseStudy.industry}</div>
                <div className="text-xs text-muted-foreground">Industry</div>
              </div>
              <div>
                <Eye className="h-4 w-4 mx-auto text-gray-600 mb-1" />
                <div className="text-xs font-medium">{caseStudy.reading_time_minutes}min</div>
                <div className="text-xs text-muted-foreground">Read</div>
              </div>
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 pt-2 border-t">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-sm font-medium">
                {caseStudy.author_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{caseStudy.author_name}</p>
                <p className="text-xs text-muted-foreground">{caseStudy.view_count} views</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate(`/stories/${caseStudy.slug}`)}
                className="flex-1"
              >
                Read Story
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
              {caseStudy.has_build_track && (
                <Button 
                  size="sm" 
                  onClick={() => navigate(`/build?from=case-study&slug=${caseStudy.slug}`)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Build This
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};