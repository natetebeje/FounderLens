
-- Add comment support to workspace_activities
ALTER TABLE workspace_activities 
ADD COLUMN parent_id uuid REFERENCES workspace_activities(id);

-- Add indexes for better performance
CREATE INDEX idx_workspace_activities_parent_id ON workspace_activities(parent_id);
CREATE INDEX idx_workspace_activities_org_type ON workspace_activities(organization_id, activity_type);

-- Add member role management
ALTER TABLE organization_members 
ADD COLUMN updated_at timestamp with time zone DEFAULT now();

-- Add validation task assignment support
ALTER TABLE validation_tasks 
ADD COLUMN assigned_to uuid,
ADD COLUMN comments_count integer DEFAULT 0;

-- Add opportunity metrics tracking
ALTER TABLE business_opportunities 
ADD COLUMN views_count integer DEFAULT 0,
ADD COLUMN last_viewed_at timestamp with time zone;

-- Update validation workflows to track team collaboration
ALTER TABLE validation_workflows 
ADD COLUMN team_members uuid[],
ADD COLUMN collaboration_score integer DEFAULT 0;

-- Create simple analytics materialized view for performance
CREATE MATERIALIZED VIEW workspace_analytics AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT bo.id) as total_opportunities,
  COUNT(DISTINCT CASE WHEN bo.validation_status = 'completed' THEN bo.id END) as completed_opportunities,
  COUNT(DISTINCT CASE WHEN bo.validation_status = 'in_progress' THEN bo.id END) as in_progress_opportunities,
  COUNT(DISTINCT om.user_id) as total_members,
  COUNT(DISTINCT wa.id) as total_activities,
  MAX(wa.created_at) as last_activity_at
FROM organizations o
LEFT JOIN business_opportunities bo ON bo.organization_id = o.id
LEFT JOIN organization_members om ON om.organization_id = o.id
LEFT JOIN workspace_activities wa ON wa.organization_id = o.id
GROUP BY o.id, o.name;

-- Add RLS policies for new features
CREATE POLICY "Users can view analytics for their organizations"
ON workspace_analytics
FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
));

-- Add trigger to refresh analytics periodically
CREATE OR REPLACE FUNCTION refresh_workspace_analytics()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW workspace_analytics;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for analytics refresh (simplified approach)
CREATE TRIGGER refresh_analytics_on_opportunity_change
  AFTER INSERT OR UPDATE OR DELETE ON business_opportunities
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_workspace_analytics();
