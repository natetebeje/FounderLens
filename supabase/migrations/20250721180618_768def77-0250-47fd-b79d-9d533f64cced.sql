
-- Add source field to business_opportunities table to track opportunity origin
ALTER TABLE business_opportunities 
ADD COLUMN source TEXT DEFAULT 'discovery' CHECK (source IN ('discovery', 'mvp_generated', 'manual', 'imported'));

-- Update existing opportunities to have 'discovery' as default source
UPDATE business_opportunities 
SET source = 'discovery' 
WHERE source IS NULL;
