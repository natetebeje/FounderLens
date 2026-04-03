import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ModernContainer } from "@/components/ui/modern-background";
import { CaseStudiesHero } from "@/components/content/CaseStudiesHero";
import { CaseStudiesGrid } from "@/components/content/CaseStudiesGrid";
import { CaseStudiesFilters } from "@/components/content/CaseStudiesFilters";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useToast } from "@/hooks/use-toast";

interface CaseStudy {
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
  revenue_range: string;
  industry: string;
  business_model: string;
  time_to_revenue: string;
  has_build_track: boolean;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
  }>;
}

const CaseStudies = () => {
  const [searchParams] = useSearchParams();
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredCaseStudy, setFeaturedCaseStudy] = useState<CaseStudy | null>(null);
  const { toast } = useToast();

  const selectedRevenue = searchParams.get('revenue');
  const selectedIndustry = searchParams.get('industry');
  const sortBy = searchParams.get('sort') || 'newest';

  useEffect(() => {
    const fetchCaseStudies = async () => {
      try {
        setLoading(true);
        
        // Filter for case study tagged articles
        let query = supabase
          .from('content_articles')
          .select(`
            *,
            content_article_tags!inner(
              content_tags(*)
            )
          `)
          .eq('is_published', true)
          .eq('content_article_tags.content_tags.slug', 'case-study')
          .order('published_at', { ascending: false });

        const { data, error } = await query;
        
        if (error) throw error;

        // Transform the data and add case study specific fields
        const transformedCaseStudies = data?.map((article: any) => ({
          ...article,
          revenue_range: '$10K-50K', // Will be added to metadata later
          industry: 'SaaS', // Will be added to metadata later
          business_model: 'B2B', // Will be added to metadata later
          time_to_revenue: '6 months', // Will be added to metadata later
          has_build_track: false, // Will be added to metadata later
          tags: article.content_article_tags?.map((cat: any) => cat.content_tags) || []
        })) || [];

        // Separate featured from regular case studies
        const featured = transformedCaseStudies.find(study => study.is_featured);
        const regular = transformedCaseStudies.filter(study => !study.is_featured);

        setFeaturedCaseStudy(featured || null);
        setCaseStudies(regular);
      } catch (error: any) {
        console.error('Error fetching case studies:', error);
        toast({
          title: "Error loading case studies",
          description: "Please try again later",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCaseStudies();
  }, [selectedRevenue, selectedIndustry, sortBy, toast]);

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
        <CaseStudiesHero 
          featuredCaseStudy={featuredCaseStudy}
          totalCaseStudies={caseStudies.length + (featuredCaseStudy ? 1 : 0)}
        />
        
        <div className="space-y-6">
          <div className="flex justify-center">
            <CaseStudiesFilters 
              selectedRevenue={selectedRevenue}
              selectedIndustry={selectedIndustry}
              sortBy={sortBy}
            />
          </div>
          
          <CaseStudiesGrid caseStudies={caseStudies} />
        </div>
      </div>
    </ModernContainer>
  );
};

export default CaseStudies;