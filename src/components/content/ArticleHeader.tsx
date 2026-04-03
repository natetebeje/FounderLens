import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Eye, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Article {
  id: string;
  title: string;
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

interface ArticleHeaderProps {
  article: Article;
}

export const ArticleHeader = ({ article }: ArticleHeaderProps) => {
  return (
    <div className="space-y-8">
      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {article.tags.map((tag) => (
          <Badge key={tag.id} variant="outline">
            {tag.name}
          </Badge>
        ))}
      </div>

      {/* Title and Excerpt */}
      <div className="space-y-4">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
          {article.title}
        </h1>
        {article.excerpt && (
          <p className="text-xl text-muted-foreground leading-relaxed">
            {article.excerpt}
          </p>
        )}
      </div>

      {/* Author and Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={article.author_avatar_url} alt={article.author_name} />
            <AvatarFallback>
              {article.author_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{article.author_name}</p>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{article.reading_time_minutes} min read</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{article.view_count} views</span>
          </div>
        </div>
      </div>

      {/* Featured Image */}
      {article.featured_image_url && (
        <div className="relative h-64 md:h-96 rounded-lg overflow-hidden">
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};