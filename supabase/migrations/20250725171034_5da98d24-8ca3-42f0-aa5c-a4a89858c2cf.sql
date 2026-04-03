-- Create Zapier webhooks table
CREATE TABLE IF NOT EXISTS public.zapier_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  name TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  last_triggered TIMESTAMP WITH TIME ZONE,
  last_success TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook logs table for tracking webhook calls
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID REFERENCES public.zapier_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.zapier_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for zapier_webhooks
CREATE POLICY "Users can view their own webhooks" 
ON public.zapier_webhooks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webhooks" 
ON public.zapier_webhooks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks" 
ON public.zapier_webhooks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks" 
ON public.zapier_webhooks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for webhook_logs
CREATE POLICY "Users can view logs for their webhooks" 
ON public.webhook_logs 
FOR SELECT 
USING (
  webhook_id IN (
    SELECT id FROM public.zapier_webhooks WHERE user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_zapier_webhooks_user_id ON public.zapier_webhooks(user_id);
CREATE INDEX idx_zapier_webhooks_event_type ON public.zapier_webhooks(event_type);
CREATE INDEX idx_zapier_webhooks_active ON public.zapier_webhooks(is_active);
CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_zapier_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_zapier_webhooks_updated_at
  BEFORE UPDATE ON public.zapier_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_zapier_webhook_updated_at();