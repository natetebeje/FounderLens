-- Create track enrollments table
CREATE TABLE public.track_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id UUID NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Enable Row Level Security
ALTER TABLE public.track_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for track enrollments
CREATE POLICY "Users can view their own enrollments" 
ON public.track_enrollments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own enrollments" 
ON public.track_enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments" 
ON public.track_enrollments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_track_enrollments_updated_at
BEFORE UPDATE ON public.track_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update build_tracks table to add enrollment-related fields
ALTER TABLE public.build_tracks 
ADD COLUMN IF NOT EXISTS enrollment_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS enrollment_limit INTEGER NULL,
ADD COLUMN IF NOT EXISTS enrollment_count INTEGER DEFAULT 0;

-- Insert the AI App Bootcamp as the first program
INSERT INTO public.build_tracks (
  title,
  slug,
  description,
  difficulty_level,
  estimated_duration_hours,
  is_published,
  requires_subscription,
  enrollment_enabled,
  sort_order
) VALUES (
  'AI App Bootcamp',
  'saas-landing-page',
  'Learn to build a complete SaaS application from scratch using modern tools and AI assistance. Perfect for entrepreneurs and developers looking to launch their first product.',
  'beginner',
  20,
  true,
  false,
  true,
  1
) ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_published = EXCLUDED.is_published,
  enrollment_enabled = EXCLUDED.enrollment_enabled;