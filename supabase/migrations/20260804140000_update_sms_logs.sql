-- Migration: Update sms_logs table for Fast2SMS integration
-- Description: Add provider, response, sent_at, and created_by columns to sms_logs table.

ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS sms_logs_status_check;

ALTER TABLE public.sms_logs 
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'Fast2SMS',
  ADD COLUMN IF NOT EXISTS response JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.sms_logs 
  ADD CONSTRAINT sms_logs_status_check CHECK (status IN ('pending', 'sent', 'delivered', 'failed'));

-- Enable RLS on sms_logs and grant permissions
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.sms_logs;
CREATE POLICY "Enable read access for authenticated users" 
ON public.sms_logs FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.sms_logs;
CREATE POLICY "Enable insert for authenticated users" 
ON public.sms_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);
