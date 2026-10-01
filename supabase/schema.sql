-- ============================================================
-- SHRISHHAIL MULTI SERVICES - DATABASE SCHEMA (PHASE 3 LEDGER ENGINE)
-- PostgreSQL / Supabase Migration Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'staff', 'customer')),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. CUSTOMERS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    address TEXT,
    gst_number TEXT,
    notes TEXT,
    is_login_enabled BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'active', 'inactive', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. CUSTOMER ACCOUNTS TABLE
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 4. LEDGER ENTRIES TABLE (PHASE 3 CORE ACCOUNTING ENGINE)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 5. AUDIT LOGS TABLE (Full Financial Change Tracking)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'ledger',
    entity_id UUID,
    before_state JSONB,
    after_state JSONB,
    reason TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 6. INDEXES
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ledger_customer_date ON public.ledger_entries(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_type ON public.ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_is_deleted ON public.ledger_entries(is_deleted);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);

-- ------------------------------------------------------------
-- 7. BALANCE CALCULATION & ACCOUNT SYNC FUNCTION
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_customer_account_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_credit NUMERIC(12, 2) := 0.00;
    v_total_debit NUMERIC(12, 2) := 0.00;
    v_total_adjustment NUMERIC(12, 2) := 0.00;
    v_outstanding NUMERIC(12, 2) := 0.00;
BEGIN
    -- Sum active non-deleted entries
    SELECT
        COALESCE(SUM(CASE WHEN entry_type IN ('credit', 'opening_balance') THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN entry_type = 'adjustment' THEN amount ELSE 0 END), 0.00)
    INTO v_total_credit, v_total_debit, v_total_adjustment
    FROM public.ledger_entries
    WHERE customer_id = p_customer_id AND is_deleted = false;

    v_outstanding := (v_total_credit + v_total_adjustment) - v_total_debit;

    -- Update cached account balances
    UPDATE public.customer_accounts
    SET
        total_credit = v_total_credit,
        total_debit = v_total_debit,
        total_paid = v_total_debit,
        outstanding_balance = v_outstanding,
        updated_at = now()
    WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to recalculate on ledger mutation
CREATE OR REPLACE FUNCTION public.trg_ledger_sync_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.recalculate_customer_account_balance(OLD.customer_id);
    ELSE
        PERFORM public.recalculate_customer_account_balance(NEW.customer_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ledger_changed ON public.ledger_entries;
CREATE TRIGGER on_ledger_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.trg_ledger_sync_balance();

-- ------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ledger entries viewable by staff/admin or customer owner" ON public.ledger_entries
    FOR SELECT USING (
        public.get_user_role(auth.uid()) IN ('admin', 'staff')
        OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
    );

CREATE POLICY "Ledger entries insertable by staff/admin" ON public.ledger_entries
    FOR INSERT WITH CHECK (
        public.get_user_role(auth.uid()) IN ('admin', 'staff')
    );

CREATE POLICY "Ledger entries updateable by staff/admin" ON public.ledger_entries
    FOR UPDATE USING (
        public.get_user_role(auth.uid()) IN ('admin', 'staff')
    );

CREATE POLICY "Ledger entries soft deleteable by admin only" ON public.ledger_entries
    FOR DELETE USING (
        public.get_user_role(auth.uid()) = 'admin'
    );
