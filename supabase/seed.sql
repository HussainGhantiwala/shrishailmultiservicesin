-- ============================================================
-- SHRISHHAIL MULTI SERVICES - DATABASE SEED DATA (DEVELOPMENT ONLY)
-- ============================================================
-- NOTE: In production environments, passwords MUST be changed immediately!

-- Default Admin Profile Seed Instructions:
-- 1. Email: admin@shrishailmultiservices.in
-- 2. Password: ChangeMe123!
-- 3. Role: admin

-- Default Staff Profile Seed Instructions:
-- 1. Email: staff@shrishailmultiservices.in
-- 2. Password: ChangeMe123!
-- 3. Role: staff

-- Default Customer Profile Seed Instructions:
-- 1. Email: customer@shrishailmultiservices.in
-- 2. Password: ChangeMe123!
-- 3. Role: customer

-- SQL Snippet for manual database seeding if running Supabase CLI locally:
-- Insert System Settings
INSERT INTO public.settings (key, value)
VALUES (
    'company_info',
    '{"name": "Shrishail Multi Services", "phone": "+91 98765 43210", "gst": "27AAAAA0000A1Z5", "address": "Plot 42, Main Road, Solapur, Maharashtra"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
