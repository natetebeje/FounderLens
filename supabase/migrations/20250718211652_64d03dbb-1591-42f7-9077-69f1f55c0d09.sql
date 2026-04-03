
-- Add SWOT analysis column to the existing automated_market_intelligence table
ALTER TABLE automated_market_intelligence 
ADD COLUMN swot_analysis JSONB DEFAULT '{}';
