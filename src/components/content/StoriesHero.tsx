import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Eye, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image_url: string;
  author_name: string;
  author_avatar_url: string;
  reading_time_minutes: number;
  view_count: number;
  published_at: string;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
  }>;
}

interface StoriesHeroProps {
  featuredArticle: Article | null;
  totalStories: number;
}

export const StoriesHero = ({ featuredArticle, totalStories }: StoriesHeroProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold gradient-text">
          FounderLens Stories
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Real founder journeys, validated opportunities, and actionable insights from the trenches of entrepreneurship.
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span>{totalStories} Stories</span>
          <span>Weekly Updates</span>
          <span>Data-Driven Insights</span>
        </div>
      </div>

      {/* Featured Article */}
      {featuredArticle && (
        <Card className="glass-card overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image */}
            <div className="relative h-64 md:h-auto">
              <img
                src={featuredArticle.featured_image_url || "/placeholder.svg"}
                alt={featuredArticle.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  Featured Story
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 flex flex-col justify-center space-y-4">
              <div className="flex flex-wrap gap-2">
                {featuredArticle.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
              </div>

              <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
                {featuredArticle.title}
              </h2>

              <p className="text-muted-foreground leading-relaxed">
                {featuredArticle.excerpt}
              </p>

              {/* Meta Information */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{featuredArticle.author_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{featuredArticle.reading_time_minutes} min read</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{featuredArticle.view_count}</span>
                </div>
              </div>

              <Button 
                size="lg" 
                className="w-fit"
                onClick={() => navigate(`/a/${featuredArticle.slug}`)}
              >
                Read Full Story
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};