-- Fix database functions with proper search_path for production security
-- This addresses the security warnings from the linter

-- Set proper search_path for existing functions to prevent search path vulnerabilities
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user_organization() SET search_path = public;
ALTER FUNCTION public.user_is_organization_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.user_owns_organization(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.log_workspace_activity() SET search_path = public;
ALTER FUNCTION public.log_member_join() SET search_path = public;
ALTER FUNCTION public.increment_usage(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.get_real_usage_count(uuid, text) SET search_path = public;
ALTER FUNCTION public.check_feature_limit(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Create user profiles table for production user management (extends existing profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create organization invitations table for production team features
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- Enable RLS on organization_invitations
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for organization_invitations
CREATE POLICY "Organization members can view invitations" ON public.organization_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = organization_invitations.organization_id 
            AND user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Organization admins can create invitations" ON public.organization_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = organization_invitations.organization_id 
            AND user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

-- Add indexes for better performance in production
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_business_opportunities_user_id ON public.business_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_validation_tasks_opportunity_id ON public.validation_tasks(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_automated_market_intelligence_opportunity_id ON public.automated_market_intelligence(opportunity_id);