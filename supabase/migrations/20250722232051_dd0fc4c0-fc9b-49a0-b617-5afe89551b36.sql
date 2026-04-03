
-- Remove 'manual' and 'imported' from the source field constraint
-- Update the source field to only allow 'discovery' and 'mvp_generated'
ALTER TABLE business_opportunities 
DROP CONSTRAINT IF EXISTS business_opportunities_source_check;

-- Add new constraint with only 'discovery' and 'mvp_generated'
ALTER TABLE business_opportunities 
ADD CONSTRAINT business_opportunities_source_check 
CHECK (source IN ('discovery', 'mvp_generated'));

-- Update any existing opportunities with 'manual' or 'imported' source to 'discovery'
UPDATE business_opportunities 
SET source = 'discovery' 
WHERE source IN ('manual', 'imported');
