-- Migration: Update Customer Status CHECK constraint for Approval Workflow
-- Description: Adds 'pending_approval' to customer status CHECK constraint

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_status_check;

ALTER TABLE public.customers
    ADD CONSTRAINT customers_status_check
    CHECK (status IN ('pending_approval', 'active', 'inactive', 'blocked'));

-- Update default status to pending_approval for self-registrations
ALTER TABLE public.customers ALTER COLUMN status SET DEFAULT 'pending_approval';

COMMENT ON COLUMN public.customers.status IS 'Status: pending_approval, active, inactive, blocked';
