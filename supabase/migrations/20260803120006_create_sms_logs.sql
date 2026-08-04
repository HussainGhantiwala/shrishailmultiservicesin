-- Migration: Create SMS Logs Table
-- Description: Dispatched SMS and WhatsApp reminder logs

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_customer_id ON public.sms_logs(customer_id);

COMMENT ON TABLE public.sms_logs IS 'SMS and payment reminder notification log';
