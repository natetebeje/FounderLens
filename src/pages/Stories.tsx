import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ModernContainer } from "@/components/ui/modern-background";
import { StoriesHero } from "@/components/content/StoriesHero";
import { StoriesGrid } from "@/components/content/StoriesGrid";
import { StoriesFilters } from "@/components/content/StoriesFilters";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useToast } from "@/hooks/use-toast";

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
  is_featured: boolean;
  published_at: string;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
  }>;
}

const Stories = () => {
  const [searchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const { toast } = useToast();

  const selectedTag = searchParams.get('tag');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from('content_articles')
          .select(`
            *,
            content_article_tags!inner(
              content_tags(*)
            )
          `)
          .eq('is_published', true)
          .order('published_at', { ascending: false });

        if (selectedTag) {
          query = query.eq('content_article_tags.content_tags.slug', selectedTag);
        }

        const { data, error } = await query;
        
        if (error) throw error;

        // Transform the data to flatten tags
        const transformedArticles = data?.map(article => ({
          ...article,
          tags: article.content_article_tags?.map((cat: any) => cat.content_tags) || []
        })) || [];

        // Separate featured from regular articles
        const featured = transformedArticles.find(article => article.is_featured);
        const regular = transformedArticles.filter(article => !article.is_featured);

        setFeaturedArticle(featured || null);
        setArticles(regular);
      } catch (error: any) {
        console.error('Error fetching articles:', error);
        toast({
          title: "Error loading stories",
          description: "Please try again later",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [selectedTag, toast]);

  if (loading) {
    return (
      <ModernContainer>
        <LoadingSkeleton />
      </ModernContainer>
    );
  }

  return (
    <ModernContainer>
      <div className="space-y-12">
        <StoriesHero 
          featuredArticle={featuredArticle}
          totalStories={articles.length + (featuredArticle ? 1 : 0)}
        />
        
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-1/4">
            <StoriesFilters selectedTag={selectedTag} />
          </div>
          
          <div className="lg:w-3/4">
            <StoriesGrid articles={articles} />
          </div>
        </div>
      </div>
    </ModernContainer>
  );
};

export default Stories;