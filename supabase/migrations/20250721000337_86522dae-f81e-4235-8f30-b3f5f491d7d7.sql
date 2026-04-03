
-- Create subscriptions table to track user subscription status
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'free', -- free, basic, pro, enterprise
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due, unpaid
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Create usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL, -- opportunities, team_members, ai_generations, validations
  count INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create feature gates table
CREATE TABLE public.feature_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  limit_value INTEGER, -- NULL means unlimited
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(feature_name, plan_tier)
);

-- Create enterprise settings table
CREATE TABLE public.enterprise_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  custom_domain TEXT,
  custom_logo_url TEXT,
  custom_brand_color TEXT,
  sso_enabled BOOLEAN NOT NULL DEFAULT false,
  sso_provider TEXT,
  sso_config JSONB DEFAULT '{}'::jsonb,
  white_label_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS on all tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- RLS policies for usage tracking
CREATE POLICY "Users can view their organization usage" ON public.usage_tracking
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert usage for their organizations" ON public.usage_tracking
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update usage for their organizations" ON public.usage_tracking
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- RLS policies for feature gates (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view feature gates" ON public.feature_gates
  FOR SELECT TO authenticated USING (true);

-- RLS policies for enterprise settings
CREATE POLICY "Organization members can view enterprise settings" ON public.enterprise_settings
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organization owners can manage enterprise settings" ON public.enterprise_settings
  FOR ALL USING (organization_id IN (
    SELECT id FROM organizations WHERE owner_id = auth.uid()
  ));

-- Insert default feature gates
INSERT INTO public.feature_gates (feature_name, plan_tier, limit_value) VALUES
  ('opportunities', 'free', 1),
  ('opportunities', 'basic', 10),
  ('opportunities', 'pro', NULL),
  ('opportunities', 'enterprise', NULL),
  ('team_members', 'free', 1),
  ('team_members', 'basic', 3),
  ('team_members', 'pro', 10),
  ('team_members', 'enterprise', NULL),
  ('ai_generations', 'free', 3),
  ('ai_generations', 'basic', 25),
  ('ai_generations', 'pro', 100),
  ('ai_generations', 'enterprise', NULL),
  ('validations', 'free', 1),
  ('validations', 'basic', 10),
  ('validations', 'pro', NULL),
  ('validations', 'enterprise', NULL);

-- Function to check feature limits
CREATE OR REPLACE FUNCTION public.check_feature_limit(
  p_user_id UUID,
  p_organization_id UUID,
  p_feature_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_plan TEXT;
  feature_limit INTEGER;
  current_usage INTEGER;
BEGIN
  -- Get current plan
  SELECT plan_tier INTO current_plan
  FROM public.subscriptions
  WHERE user_id = p_user_id AND organization_id = p_organization_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Default to free if no subscription found
  IF current_plan IS NULL THEN
    current_plan := 'free';
  END IF;
  
  -- Get feature limit
  SELECT limit_value INTO feature_limit
  FROM public.feature_gates
  WHERE feature_name = p_feature_name AND plan_tier = current_plan;
  
  -- If limit is NULL, feature is unlimited
  IF feature_limit IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Get current usage
  SELECT COALESCE(count, 0) INTO current_usage
  FROM public.usage_tracking
  WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND resource_type = p_feature_name
    AND period_start <= NOW()
    AND period_end >= NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Check if under limit
  RETURN current_usage < feature_limit;
END;
$$;

-- Function to increment usage
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_organization_id UUID,
  p_resource_type TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_period_start TIMESTAMPTZ;
  current_period_end TIMESTAMPTZ;
BEGIN
  -- Calculate current billing period (monthly)
  current_period_start := date_trunc('month', NOW());
  current_period_end := current_period_start + interval '1 month';
  
  -- Insert or update usage
  INSERT INTO public.usage_tracking (
    user_id, organization_id, resource_type, count, period_start, period_end
  ) VALUES (
    p_user_id, p_organization_id, p_resource_type, 1, current_period_start, current_period_end
  )
  ON CONFLICT (user_id, organization_id, resource_type, period_start)
  DO UPDATE SET count = usage_tracking.count + 1, updated_at = NOW();
END;
$$;

-- Add updated_at trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for usage_tracking
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for enterprise_settings
CREATE TRIGGER update_enterprise_settings_updated_at
  BEFORE UPDATE ON public.enterprise_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
