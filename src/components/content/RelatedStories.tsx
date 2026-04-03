import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image_url: string;
  author_name: string;
  reading_time_minutes: number;
  published_at: string;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
  }>;
}

interface RelatedStoriesProps {
  articles: Article[];
}

export const RelatedStories = ({ articles }: RelatedStoriesProps) => {
  const navigate = useNavigate();

  if (articles.length === 0) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Related Stories</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Card 
            key={article.id} 
            className="glass-card overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
            onClick={() => navigate(`/a/${article.slug}`)}
          >
            {/* Image */}
            <div className="relative h-32">
              <img
                src={article.featured_image_url || "/placeholder.svg"}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {article.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs">
                    {tag.name}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">
                {article.title}
              </h3>

              {/* Excerpt */}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {article.excerpt}
              </p>

              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{article.author_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{article.reading_time_minutes}m</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};