-- Create refunds table to track refund history
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_refund_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, canceled
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Create policies for refunds
CREATE POLICY "Admins can view all refunds" 
ON public.refunds 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can create refunds" 
ON public.refunds 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Admins can update refunds" 
ON public.refunds 
FOR UPDATE 
USING (is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_refunds_updated_at
BEFORE UPDATE ON public.refunds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_refunds_user_id ON public.refunds(user_id);
CREATE INDEX idx_refunds_status ON public.refunds(status);
CREATE INDEX idx_refunds_created_at ON public.refunds(created_at);

-- Add refund_status to subscriptions table for tracking
ALTER TABLE public.subscriptions 
ADD COLUMN refund_status TEXT DEFAULT NULL,
ADD COLUMN refunded_amount INTEGER DEFAULT 0,
ADD COLUMN refund_reason TEXT DEFAULT NULL;