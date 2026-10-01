-- Migration: Create Customer Accounts Table
-- Description: Stores cached balance totals derived from ledger entries

CREATE TABLE IF NOT EXISTS public.customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE UNIQUE,
    account_number TEXT NOT NULL UNIQUE,
    outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON public.customer_accounts(customer_id);

COMMENT ON TABLE public.customer_accounts IS 'Account summary ledger balance cache linked 1-to-1 with customers';
