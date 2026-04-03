import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ModernContainer } from "@/components/ui/modern-background";
import { ArticleHeader } from "@/components/content/ArticleHeader";
import { ArticleContent } from "@/components/content/ArticleContent";
import { ArticleSidebar } from "@/components/content/ArticleSidebar";
import { RelatedStories } from "@/components/content/RelatedStories";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_url: string;
  author_name: string;
  author_avatar_url: string;
  reading_time_minutes: number;
  view_count: number;
  published_at: string;
  opportunity_id?: string;
  seo_title?: string;
  seo_description?: string;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
  }>;
}

const Article = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('content_articles')
          .select(`
            *,
            content_article_tags(
              content_tags(*)
            )
          `)
          .eq('slug', slug)
          .eq('is_published', true)
          .single();
        
        if (error) throw error;

        // Transform the data to flatten tags
        const transformedArticle = {
          ...data,
          tags: data.content_article_tags?.map((cat: any) => cat.content_tags) || []
        };

        setArticle(transformedArticle);

        // Increment view count
        await supabase
          .from('content_articles')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', data.id);

        // Fetch related articles based on tags
        if (data.content_article_tags?.length > 0) {
          const tagIds = data.content_article_tags.map((cat: any) => cat.content_tags.id);
          
          const { data: related } = await supabase
            .from('content_articles')
            .select(`
              *,
              content_article_tags(
                content_tags(*)
              )
            `)
            .eq('is_published', true)
            .neq('id', data.id)
            .limit(3);

          if (related) {
            const transformedRelated = related.map(article => ({
              ...article,
              tags: article.content_article_tags?.map((cat: any) => cat.content_tags) || []
            }));
            setRelatedArticles(transformedRelated);
          }
        }
      } catch (error: any) {
        console.error('Error fetching article:', error);
        toast({
          title: "Article not found",
          description: "The story you're looking for doesn't exist or has been removed.",
          variant: "destructive"
        });
        navigate('/stories');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug, navigate, toast]);

  useEffect(() => {
    // Update SEO meta tags
    if (article) {
      document.title = article.seo_title || `${article.title} | FounderLens Stories`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', article.seo_description || article.excerpt || '');
      }

      // Update Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      
      if (ogTitle) ogTitle.setAttribute('content', article.title);
      if (ogDescription) ogDescription.setAttribute('content', article.excerpt || '');
      if (ogImage && article.featured_image_url) {
        ogImage.setAttribute('content', article.featured_image_url);
      }
    }

    // Cleanup on unmount
    return () => {
      document.title = 'FounderLens - Validate and Launch Your Business Ideas';
    };
  }, [article]);

  if (loading) {
    return (
      <ModernContainer>
        <LoadingSkeleton />
      </ModernContainer>
    );
  }

  if (!article) {
    return (
      <ModernContainer>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-foreground mb-4">Story Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The story you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/stories')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stories
          </Button>
        </div>
      </ModernContainer>
    );
  }

  return (
    <ModernContainer>
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/stories')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Stories
          </Button>
        </div>

        {/* Article Header */}
        <ArticleHeader article={article} />

        {/* Article Content and Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
          <div className="lg:col-span-2">
            <ArticleContent article={article} />
          </div>
          <div className="lg:col-span-1">
            <ArticleSidebar article={article} />
          </div>
        </div>

        {/* Related Stories */}
        {relatedArticles.length > 0 && (
          <div className="mt-16">
            <RelatedStories articles={relatedArticles} />
          </div>
        )}
      </div>
    </ModernContainer>
  );
};

export default Article;