
-- Add MVP tracking fields to business_opportunities table
ALTER TABLE public.business_opportunities 
ADD COLUMN mvp_generated boolean DEFAULT false,
ADD COLUMN mvp_prompt text,
ADD COLUMN mvp_generated_at timestamp with time zone;

-- Add index for filtering MVP-ready opportunities
CREATE INDEX idx_business_opportunities_mvp_generated 
ON public.business_opportunities(mvp_generated) 
WHERE mvp_generated = true;
