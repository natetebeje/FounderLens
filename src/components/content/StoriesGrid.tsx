import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Eye, User, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

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

interface StoriesGridProps {
  articles: Article[];
}

export const StoriesGrid = ({ articles }: StoriesGridProps) => {
  const navigate = useNavigate();

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-foreground mb-2">No stories found</h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or check back later for new content.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <Card key={article.id} className="glass-card overflow-hidden hover:shadow-lg transition-all duration-300">
          {/* Image */}
          <div className="relative h-48">
            <img
              src={article.featured_image_url || "/placeholder.svg"}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {article.tags.slice(0, 2).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-foreground line-clamp-2 leading-tight">
              {article.title}
            </h3>

            {/* Excerpt */}
            <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
              {article.excerpt}
            </p>

            {/* Meta Information */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{article.author_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{article.reading_time_minutes}m</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Read More Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-center"
              onClick={() => navigate(`/a/${article.slug}`)}
            >
              Read Story
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};