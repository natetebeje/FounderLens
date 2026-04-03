-- Create content articles table for FounderLens Stories
CREATE TABLE public.content_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  author_name TEXT NOT NULL DEFAULT 'FounderLens Team',
  author_avatar_url TEXT,
  reading_time_minutes INTEGER DEFAULT 5,
  view_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  requires_subscription BOOLEAN DEFAULT false,
  opportunity_id UUID, -- Link to existing validation data
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content tags table
CREATE TABLE public.content_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create many-to-many relationship for article tags
CREATE TABLE public.content_article_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.content_articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.content_tags(id) ON DELETE CASCADE,
  UNIQUE(article_id, tag_id)
);

-- Create build tracks table for Build Lab
CREATE TABLE public.build_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  difficulty_level TEXT NOT NULL DEFAULT 'beginner', -- beginner, intermediate, advanced
  estimated_duration_hours INTEGER DEFAULT 10,
  featured_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  requires_subscription BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create build lessons table
CREATE TABLE public.build_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.build_tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_duration_minutes INTEGER,
  lesson_content TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  opportunity_id UUID, -- Link to validation data for in-lesson integration
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(track_id, slug)
);

-- Create lesson progress tracking
CREATE TABLE public.lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.build_lessons(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.build_tracks(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.content_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_articles
CREATE POLICY "Anyone can view published articles" 
ON public.content_articles 
FOR SELECT 
USING (is_published = true AND (requires_subscription = false OR auth.uid() IS NOT NULL));

CREATE POLICY "Admins can manage all articles" 
ON public.content_articles 
FOR ALL 
USING (is_admin());

-- RLS Policies for content_tags
CREATE POLICY "Anyone can view tags" 
ON public.content_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage tags" 
ON public.content_tags 
FOR ALL 
USING (is_admin());

-- RLS Policies for content_article_tags
CREATE POLICY "Anyone can view article tags" 
ON public.content_article_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage article tags" 
ON public.content_article_tags 
FOR ALL 
USING (is_admin());

-- RLS Policies for build_tracks
CREATE POLICY "Anyone can view published tracks" 
ON public.build_tracks 
FOR SELECT 
USING (is_published = true AND (requires_subscription = false OR auth.uid() IS NOT NULL));

CREATE POLICY "Admins can manage all tracks" 
ON public.build_tracks 
FOR ALL 
USING (is_admin());

-- RLS Policies for build_lessons
CREATE POLICY "Anyone can view published lessons" 
ON public.build_lessons 
FOR SELECT 
USING (is_published = true AND EXISTS (
  SELECT 1 FROM public.build_tracks 
  WHERE id = build_lessons.track_id 
  AND is_published = true 
  AND (requires_subscription = false OR auth.uid() IS NOT NULL)
));

CREATE POLICY "Admins can manage all lessons" 
ON public.build_lessons 
FOR ALL 
USING (is_admin());

-- RLS Policies for lesson_progress
CREATE POLICY "Users can view their own progress" 
ON public.lesson_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
ON public.lesson_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.lesson_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_content_articles_published ON public.content_articles(is_published, published_at DESC);
CREATE INDEX idx_content_articles_slug ON public.content_articles(slug);
CREATE INDEX idx_content_articles_opportunity ON public.content_articles(opportunity_id);
CREATE INDEX idx_build_tracks_published ON public.build_tracks(is_published, sort_order);
CREATE INDEX idx_build_lessons_track ON public.build_lessons(track_id, sort_order);
CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id, track_id);

-- Create triggers for updated_at
CREATE TRIGGER update_content_articles_updated_at
  BEFORE UPDATE ON public.content_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_build_tracks_updated_at
  BEFORE UPDATE ON public.build_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_build_lessons_updated_at
  BEFORE UPDATE ON public.build_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample content tags
INSERT INTO public.content_tags (name, slug, color) VALUES
('Success Story', 'success-story', 'green'),
('Product Hunt', 'product-hunt', 'orange'),
('SaaS', 'saas', 'blue'),
('E-commerce', 'ecommerce', 'purple'),
('AI/ML', 'ai-ml', 'indigo'),
('Marketplace', 'marketplace', 'pink'),
('Mobile App', 'mobile-app', 'teal'),
('Bootstrapped', 'bootstrapped', 'yellow'),
('VC Funded', 'vc-funded', 'red'),
('Remote Team', 'remote-team', 'gray');

-- Insert sample build track
INSERT INTO public.build_tracks (
  title, 
  slug, 
  description, 
  difficulty_level, 
  estimated_duration_hours, 
  is_published, 
  sort_order
) VALUES (
  'Build a SaaS Landing Page That Converts',
  'saas-landing-page',
  'Learn how to design, build, and optimize a high-converting SaaS landing page from scratch. This track covers market research, copywriting, design principles, and conversion optimization.',
  'beginner',
  8,
  true,
  1
);