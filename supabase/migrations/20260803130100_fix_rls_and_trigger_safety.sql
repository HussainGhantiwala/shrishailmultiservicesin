-- ============================================================
-- Migration: Fix RLS policies and trigger safety
-- ============================================================
-- Issue 1: Customer signup fails because INSERT policy on
--          customers table only allows admin/staff roles.
--          A self-registering customer (role='customer') is blocked.
-- Fix:     Add a policy allowing authenticated customers to
--          insert exactly their own record (user_id = auth.uid()).
--
-- Issue 2: Admin login returns 500 because handle_new_user()
--          trigger does a plain INSERT into profiles, which fails
--          with a primary key conflict when a profile already
--          exists (e.g. from bootstrap_admin.sql or re-signup).
--          The trigger error propagates back through Supabase Auth
--          as an opaque HTTP 500 / AuthRetryableFetchError.
-- Fix:     Make handle_new_user() use INSERT ... ON CONFLICT
--          so it is idempotent and never crashes auth signup/login.
-- ============================================================

-- ------------------------------------------------------------
-- FIX 1: Allow customers to self-register
-- Add INSERT policy so a customer can create their own record
-- ------------------------------------------------------------
CREATE POLICY "Customers self-register own record" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = (SELECT auth.uid())
    );

-- Also allow customers to insert their own opening-balance
-- ledger entry and audit log during signup
CREATE POLICY "Ledger self-insert for own customer" ON public.ledger_entries
    FOR INSERT TO authenticated
    WITH CHECK (
        customer_id IN (
            SELECT id FROM public.customers
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Audit logs insertable by authenticated" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ------------------------------------------------------------
-- FIX 2: Make handle_new_user() idempotent with ON CONFLICT
-- This prevents the trigger from crashing when a profile row
-- already exists (bootstrap, re-signup, identity linking, etc.)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
        NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
        name  = COALESCE(EXCLUDED.name, public.profiles.name),
        email = COALESCE(EXCLUDED.email, public.profiles.email),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- FIX 3: Make handle_new_customer_account() idempotent
-- Prevents duplicate account if customer row is re-inserted
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_customer_account()
RETURNS TRIGGER AS $$
DECLARE
    next_acc_no TEXT;
    seq_val INT;
BEGIN
    -- Skip if account already exists for this customer
    IF EXISTS (SELECT 1 FROM public.customer_accounts WHERE customer_id = NEW.id) THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(COUNT(*), 0) + 1001 INTO seq_val FROM public.customer_accounts;
    next_acc_no := 'ACC-' || seq_val::TEXT;

    INSERT INTO public.customer_accounts (
        customer_id,
        account_number,
        outstanding_balance,
        total_paid,
        total_credit,
        total_debit,
        status
    )
    VALUES (
        NEW.id,
        next_acc_no,
        0.00,
        0.00,
        0.00,
        0.00,
        'active'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_customer_created ON public.customers;
CREATE TRIGGER on_customer_created
    AFTER INSERT ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer_account();
