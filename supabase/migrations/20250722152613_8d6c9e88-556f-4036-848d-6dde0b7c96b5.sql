
-- Create system announcements table for Communication Center
CREATE TABLE public.system_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, warning, success, error
  target_audience TEXT NOT NULL DEFAULT 'all', -- all, admins, users, specific_plan
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create security events table for real security tracking
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- login_attempt, login_failure, suspicious_activity, etc.
  user_id UUID REFERENCES auth.users,
  ip_address INET,
  user_agent TEXT,
  event_data JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create performance metrics table for real monitoring
CREATE TABLE public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT NOT NULL DEFAULT 'count',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create email notifications log for Communication Center
CREATE TABLE public.email_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed, delivered
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies
CREATE POLICY "Admins can manage system announcements" 
ON public.system_announcements 
FOR ALL 
USING (is_admin());

CREATE POLICY "Admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (is_admin());

CREATE POLICY "System can insert security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view performance metrics" 
ON public.performance_metrics 
FOR SELECT 
USING (is_admin());

CREATE POLICY "System can insert performance metrics" 
ON public.performance_metrics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view email notifications" 
ON public.email_notifications 
FOR SELECT 
USING (is_admin());

CREATE POLICY "System can manage email notifications" 
ON public.email_notifications 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_system_announcements_active ON public.system_announcements(is_active);
CREATE INDEX idx_security_events_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX idx_performance_metrics_name ON public.performance_metrics(metric_name);
CREATE INDEX idx_performance_metrics_recorded_at ON public.performance_metrics(recorded_at);
CREATE INDEX idx_email_notifications_status ON public.email_notifications(status);

-- Add triggers for updated_at columns
CREATE TRIGGER update_system_announcements_updated_at
  BEFORE UPDATE ON public.system_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO public.system_announcements (title, message, type, created_by) VALUES
('System Maintenance', 'Scheduled maintenance on Sunday 2AM-4AM UTC', 'warning', 'fd1605a9-1a5c-4969-bccc-5ee909515102'),
('New Features Released', 'Check out our latest AI improvements!', 'success', 'fd1605a9-1a5c-4969-bccc-5ee909515102');

INSERT INTO public.security_events (event_type, user_id, ip_address, severity) VALUES
('login_success', 'fd1605a9-1a5c-4969-bccc-5ee909515102', '192.168.1.1', 'low'),
('login_failure', NULL, '192.168.1.100', 'medium');

INSERT INTO public.performance_metrics (metric_name, metric_value, metric_unit) VALUES
('api_response_time', 150, 'ms'),
('database_connections', 45, 'count'),
('error_rate', 0.02, 'percentage');

INSERT INTO public.email_notifications (recipient_email, subject, template_type, status, sent_at) VALUES
('user@example.com', 'Welcome to FounderLens', 'welcome', 'delivered', now() - interval '1 hour'),
('admin@example.com', 'Weekly Report', 'report', 'sent', now() - interval '30 minutes');
