-- Migration: Create Ledger Entries Table
-- Description: Core accounting engine entries table with soft delete and running balance support

CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('credit', 'debit', 'adjustment', 'opening_balance')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    running_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT NOT NULL,
    reference_no TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_customer_date ON public.ledger_entries(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_type ON public.ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_is_deleted ON public.ledger_entries(is_deleted);

COMMENT ON TABLE public.ledger_entries IS 'Single source of truth for customer ledger entries and accounting timeline';
