-- Add missing columns to marketing_content_queue table
ALTER TABLE public.marketing_content_queue 
ADD COLUMN IF NOT EXISTS next_retry timestamp with time zone,
ADD COLUMN IF NOT EXISTS posted_at timestamp with time zone;