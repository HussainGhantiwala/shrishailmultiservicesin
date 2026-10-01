-- Migration: Create Functions and Triggers
-- Description: Automated triggers for profile creation, account generation, and ledger balance recalculation

-- 1. Helper Function: Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
    RETURN COALESCE(v_role, 'customer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger Function: Auto create profile on auth signup
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
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Trigger Function: Auto generate customer account on customer registration
CREATE OR REPLACE FUNCTION public.handle_new_customer_account()
RETURNS TRIGGER AS $$
DECLARE
    next_acc_no TEXT;
    seq_val INT;
BEGIN
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

DROP TRIGGER IF EXISTS on_customer_created ON public.customers;
CREATE TRIGGER on_customer_created
    AFTER INSERT ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer_account();

-- 4. Function: Recalculate customer account balance based on active ledger entries
CREATE OR REPLACE FUNCTION public.recalculate_customer_account_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_credit NUMERIC(12, 2) := 0.00;
    v_total_debit NUMERIC(12, 2) := 0.00;
    v_total_adjustment NUMERIC(12, 2) := 0.00;
    v_outstanding NUMERIC(12, 2) := 0.00;
BEGIN
    SELECT
        COALESCE(SUM(CASE WHEN entry_type IN ('credit', 'opening_balance') THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN entry_type = 'adjustment' THEN amount ELSE 0 END), 0.00)
    INTO v_total_credit, v_total_debit, v_total_adjustment
    FROM public.ledger_entries
    WHERE customer_id = p_customer_id AND is_deleted = false;

    v_outstanding := (v_total_credit + v_total_adjustment) - v_total_debit;

    UPDATE public.customer_accounts
    SET
        total_credit = v_total_credit,
        total_debit = v_total_debit,
        total_paid = v_total_debit,
        outstanding_balance = v_outstanding,
        updated_at = now()
    WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger Function: Recalculate account balance on ledger mutation
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_ledger_changed ON public.ledger_entries;
CREATE TRIGGER on_ledger_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.trg_ledger_sync_balance();
