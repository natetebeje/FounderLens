-- Create automated workflow engine tables and functions

-- Automation workflows table
CREATE TABLE public.automation_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  workflow_type TEXT NOT NULL, -- 'content_generation', 'lead_nurturing', 'campaign_launch', 'optimization'
  trigger_event TEXT NOT NULL, -- 'schedule', 'user_signup', 'campaign_complete', 'engagement_threshold'
  trigger_conditions JSONB DEFAULT '{}',
  actions JSONB NOT NULL, -- Array of actions to execute
  is_active BOOLEAN DEFAULT true,
  next_execution TIMESTAMPTZ,
  last_execution TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automation execution log
CREATE TABLE public.automation_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  execution_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  trigger_data JSONB DEFAULT '{}',
  execution_results JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Content automation queue
CREATE TABLE public.content_automation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.marketing_content(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'posted', 'failed', 'cancelled'
  post_data JSONB NOT NULL,
  platform_response JSONB DEFAULT '{}',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead automation sequences
CREATE TABLE public.lead_automation_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.marketing_leads(id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL, -- 'welcome', 'nurturing', 'conversion', 'reactivation'
  sequence_step INTEGER NOT NULL DEFAULT 1,
  next_action_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
  sequence_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A/B test results tracking
CREATE TABLE public.ab_test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.marketing_ab_tests(id) ON DELETE CASCADE,
  variant TEXT NOT NULL, -- 'A' or 'B'
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  user_segment JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance optimization suggestions
CREATE TABLE public.optimization_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_type TEXT NOT NULL, -- 'content', 'timing', 'targeting', 'budget'
  target_type TEXT NOT NULL, -- 'campaign', 'content', 'lead_sequence'
  target_id UUID NOT NULL,
  suggestion_title TEXT NOT NULL,
  suggestion_description TEXT NOT NULL,
  suggested_changes JSONB NOT NULL,
  confidence_score INTEGER DEFAULT 0, -- 0-100
  potential_impact JSONB DEFAULT '{}', -- expected improvements
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'applied', 'rejected', 'testing'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_automation_workflows_active ON public.automation_workflows(is_active, next_execution) WHERE is_active = true;
CREATE INDEX idx_content_queue_pending ON public.content_automation_queue(status, scheduled_time) WHERE status = 'pending';
CREATE INDEX idx_lead_sequences_active ON public.lead_automation_sequences(status, next_action_time) WHERE status = 'active';
CREATE INDEX idx_automation_executions_workflow ON public.automation_executions(workflow_id, started_at);

-- RLS Policies
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_automation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_automation_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_suggestions ENABLE ROW LEVEL SECURITY;

-- Admin access policies
CREATE POLICY "Admins can manage automation workflows" ON public.automation_workflows FOR ALL USING (is_admin());
CREATE POLICY "Admins can view automation executions" ON public.automation_executions FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage content queue" ON public.content_automation_queue FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage lead sequences" ON public.lead_automation_sequences FOR ALL USING (is_admin());
CREATE POLICY "Admins can view ab test results" ON public.ab_test_results FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage optimization suggestions" ON public.optimization_suggestions FOR ALL USING (is_admin());

-- System policies for automation
CREATE POLICY "System can manage content queue" ON public.content_automation_queue FOR ALL USING (true);
CREATE POLICY "System can manage lead sequences" ON public.lead_automation_sequences FOR ALL USING (true);
CREATE POLICY "System can insert ab test results" ON public.ab_test_results FOR INSERT WITH CHECK (true);
CREATE POLICY "System can insert automation executions" ON public.automation_executions FOR INSERT WITH CHECK (true);

-- Automation trigger function
CREATE OR REPLACE FUNCTION public.process_automation_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  workflow_record RECORD;
  execution_id UUID;
BEGIN
  -- Process due automation workflows
  FOR workflow_record IN 
    SELECT * FROM public.automation_workflows 
    WHERE is_active = true 
    AND (next_execution IS NULL OR next_execution <= NOW())
    ORDER BY next_execution ASC NULLS FIRST
    LIMIT 50
  LOOP
    -- Create execution record
    INSERT INTO public.automation_executions (workflow_id, execution_status, trigger_data)
    VALUES (workflow_record.id, 'pending', jsonb_build_object('triggered_at', NOW()))
    RETURNING id INTO execution_id;
    
    -- Update workflow execution count and next execution time
    UPDATE public.automation_workflows 
    SET 
      execution_count = execution_count + 1,
      last_execution = NOW(),
      next_execution = CASE 
        WHEN workflow_record.trigger_event = 'schedule' THEN
          CASE 
            WHEN workflow_record.trigger_conditions->>'frequency' = 'hourly' THEN NOW() + INTERVAL '1 hour'
            WHEN workflow_record.trigger_conditions->>'frequency' = 'daily' THEN NOW() + INTERVAL '1 day'
            WHEN workflow_record.trigger_conditions->>'frequency' = 'weekly' THEN NOW() + INTERVAL '1 week'
            ELSE NOW() + INTERVAL '1 day'
          END
        ELSE NULL -- Event-driven workflows don't have next execution
      END,
      updated_at = NOW()
    WHERE id = workflow_record.id;
    
    RAISE LOG 'Queued automation workflow % for execution (execution_id: %)', workflow_record.name, execution_id;
  END LOOP;
END;
$function$;

-- Content posting automation function
CREATE OR REPLACE FUNCTION public.process_content_posting_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  queue_record RECORD;
BEGIN
  -- Process due content posts
  FOR queue_record IN 
    SELECT * FROM public.content_automation_queue 
    WHERE status = 'pending' 
    AND scheduled_time <= NOW()
    ORDER BY scheduled_time ASC
    LIMIT 20
  LOOP
    -- Update status to processing
    UPDATE public.content_automation_queue 
    SET status = 'processing', updated_at = NOW()
    WHERE id = queue_record.id;
    
    RAISE LOG 'Processing content post % for platform %', queue_record.content_id, queue_record.platform;
  END LOOP;
END;
$function$;

-- Lead nurturing automation function
CREATE OR REPLACE FUNCTION public.process_lead_nurturing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sequence_record RECORD;
BEGIN
  -- Process due lead nurturing actions
  FOR sequence_record IN 
    SELECT * FROM public.lead_automation_sequences 
    WHERE status = 'active' 
    AND next_action_time <= NOW()
    ORDER BY next_action_time ASC
    LIMIT 30
  LOOP
    -- Update next action time based on sequence step
    UPDATE public.lead_automation_sequences 
    SET 
      sequence_step = sequence_step + 1,
      next_action_time = CASE 
        WHEN sequence_step < 5 THEN NOW() + INTERVAL '2 days'
        WHEN sequence_step < 10 THEN NOW() + INTERVAL '1 week'
        ELSE NOW() + INTERVAL '2 weeks'
      END,
      updated_at = NOW()
    WHERE id = sequence_record.id;
    
    RAISE LOG 'Processing lead nurturing for lead % (step %)', sequence_record.lead_id, sequence_record.sequence_step;
  END LOOP;
END;
$function$;

-- Insert default automation workflows
INSERT INTO public.automation_workflows (name, workflow_type, trigger_event, trigger_conditions, actions) VALUES
('Daily Content Generation', 'content_generation', 'schedule', 
 '{"frequency": "daily", "time": "09:00"}',
 '[{"type": "generate_content", "platform": "twitter", "content_type": "social_post", "topic": "business_tips"}]'),

('Weekly Campaign Launch', 'campaign_launch', 'schedule',
 '{"frequency": "weekly", "day": "monday", "time": "10:00"}',
 '[{"type": "create_campaign", "campaign_type": "growth", "duration_days": 7}]'),

('New Lead Welcome Sequence', 'lead_nurturing', 'user_signup',
 '{"trigger_delay": "5 minutes"}',
 '[{"type": "send_welcome_email"}, {"type": "add_to_nurturing_sequence"}]'),

('Performance Optimization', 'optimization', 'schedule',
 '{"frequency": "daily", "time": "06:00"}',
 '[{"type": "analyze_performance"}, {"type": "generate_suggestions"}, {"type": "auto_apply_safe_optimizations"}]');

-- Add updated_at triggers
CREATE TRIGGER update_automation_workflows_updated_at
  BEFORE UPDATE ON public.automation_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_automation_queue_updated_at
  BEFORE UPDATE ON public.content_automation_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_automation_sequences_updated_at
  BEFORE UPDATE ON public.lead_automation_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();