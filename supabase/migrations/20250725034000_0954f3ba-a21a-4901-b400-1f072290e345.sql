-- AI Marketing Automation System Database Schema

-- Marketing content templates and generation
CREATE TABLE public.marketing_content_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'social_post', 'email', 'blog_post', 'landing_page'
  platform TEXT, -- 'twitter', 'linkedin', 'reddit', 'email', 'blog'
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Array of variable names like {name}, {industry}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated marketing content
CREATE TABLE public.marketing_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.marketing_content_templates(id),
  content TEXT NOT NULL,
  content_type TEXT NOT NULL,
  platform TEXT,
  target_audience JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'published', 'failed'
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  engagement_data JSONB DEFAULT '{}'::jsonb,
  generated_by TEXT DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Social media campaigns and automation
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL, -- 'content_series', 'lead_generation', 'product_launch'
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed'
  platforms TEXT[] DEFAULT '{}',
  target_keywords TEXT[] DEFAULT '{}',
  content_themes TEXT[] DEFAULT '{}',
  frequency_settings JSONB DEFAULT '{}'::jsonb, -- posting frequency per platform
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead tracking and management
CREATE TABLE public.marketing_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_platform TEXT NOT NULL, -- 'twitter', 'linkedin', 'reddit', 'organic'
  source_url TEXT,
  contact_info JSONB NOT NULL, -- email, social handle, etc.
  lead_data JSONB DEFAULT '{}'::jsonb, -- industry, company, interests
  engagement_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'
  last_interaction TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ,
  notes TEXT,
  assigned_campaign_id UUID REFERENCES public.marketing_campaigns(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead interaction tracking
CREATE TABLE public.lead_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'view', 'click', 'reply', 'dm', 'email_open'
  platform TEXT NOT NULL,
  interaction_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A/B testing for marketing content
CREATE TABLE public.marketing_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL, -- 'subject_line', 'content', 'cta', 'landing_page'
  variant_a_content TEXT NOT NULL,
  variant_b_content TEXT NOT NULL,
  traffic_split INTEGER DEFAULT 50, -- percentage for variant A
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed'
  winner TEXT, -- 'a', 'b', 'no_significant_difference'
  confidence_level DECIMAL,
  results JSONB DEFAULT '{}'::jsonb,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing automation rules and triggers
CREATE TABLE public.marketing_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- 'user_signup', 'opportunity_created', 'inactivity_7_days'
  trigger_conditions JSONB DEFAULT '{}'::jsonb,
  action_type TEXT NOT NULL, -- 'send_email', 'create_content', 'post_social'
  action_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing analytics and performance tracking
CREATE TABLE public.marketing_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL NOT NULL,
  metric_type TEXT NOT NULL, -- 'engagement_rate', 'conversion_rate', 'reach', 'clicks'
  platform TEXT,
  campaign_id UUID REFERENCES public.marketing_campaigns(id),
  content_id UUID REFERENCES public.marketing_content(id),
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content scheduling queue
CREATE TABLE public.marketing_content_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.marketing_content(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'posted', 'failed'
  post_id TEXT, -- platform-specific post ID
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.marketing_content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing tables (admins can manage everything)
CREATE POLICY "Admins can manage marketing content templates" ON public.marketing_content_templates FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage marketing content" ON public.marketing_content FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage marketing campaigns" ON public.marketing_campaigns FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage marketing leads" ON public.marketing_leads FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage lead interactions" ON public.lead_interactions FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage AB tests" ON public.marketing_ab_tests FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage automation rules" ON public.marketing_automation_rules FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage marketing analytics" ON public.marketing_analytics FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage content queue" ON public.marketing_content_queue FOR ALL USING (is_admin());

-- System can insert analytics and interactions (for automation)
CREATE POLICY "System can insert marketing analytics" ON public.marketing_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert lead interactions" ON public.lead_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update content queue" ON public.marketing_content_queue FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_marketing_content_status ON public.marketing_content(status);
CREATE INDEX idx_marketing_content_scheduled ON public.marketing_content(scheduled_for);
CREATE INDEX idx_marketing_leads_status ON public.marketing_leads(status);
CREATE INDEX idx_marketing_leads_source ON public.marketing_leads(source_platform);
CREATE INDEX idx_marketing_analytics_date ON public.marketing_analytics(date_recorded);
CREATE INDEX idx_content_queue_scheduled ON public.marketing_content_queue(scheduled_time);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_marketing_content_templates_updated_at BEFORE UPDATE ON public.marketing_content_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_content_updated_at BEFORE UPDATE ON public.marketing_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_leads_updated_at BEFORE UPDATE ON public.marketing_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_ab_tests_updated_at BEFORE UPDATE ON public.marketing_ab_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_automation_rules_updated_at BEFORE UPDATE ON public.marketing_automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_content_queue_updated_at BEFORE UPDATE ON public.marketing_content_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();