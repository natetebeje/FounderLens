-- Database Optimization Phase 1: Add Critical Indexes

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_business_opportunities_organization_user 
ON public.business_opportunities (organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_business_opportunities_created_at 
ON public.business_opportunities (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_business_opportunities_validation_status 
ON public.business_opportunities (validation_status);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_org 
ON public.organization_members (user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_org_status 
ON public.subscriptions (user_id, organization_id, status);

CREATE INDEX IF NOT EXISTS idx_subscription_cache_user_org_expires 
ON public.subscription_cache (user_id, organization_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_org_resource_period 
ON public.usage_tracking (organization_id, resource_type, period_start);

CREATE INDEX IF NOT EXISTS idx_workspace_activities_org_created 
ON public.workspace_activities (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_validation_tasks_opportunity_status 
ON public.validation_tasks (opportunity_id, status);