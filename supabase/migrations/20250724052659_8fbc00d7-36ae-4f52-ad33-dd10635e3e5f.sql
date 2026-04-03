-- Add response tracking fields to contact_form_submissions table
ALTER TABLE public.contact_form_submissions 
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES auth.users(id);

-- Update status check constraint to include new status options
ALTER TABLE public.contact_form_submissions 
DROP CONSTRAINT IF EXISTS contact_form_submissions_status_check;

ALTER TABLE public.contact_form_submissions 
ADD CONSTRAINT contact_form_submissions_status_check 
CHECK (status IN ('new', 'responded', 'resolved'));

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_status 
ON public.contact_form_submissions(status);

-- Create index for better performance on responded_by queries
CREATE INDEX IF NOT EXISTS idx_contact_form_submissions_responded_by 
ON public.contact_form_submissions(responded_by);