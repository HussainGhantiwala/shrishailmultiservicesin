-- Migration: Phase 4.5 Enhancements
-- Description: Add payment_method to ledger_entries, extend notifications, trigger automated notifications, and update analytics/reports RPC functions.

-- 1. Extend ledger_entries table
ALTER TABLE public.ledger_entries 
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS other_payment_method TEXT;

-- 2. Extend notifications table
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS reference_id UUID;

-- 3. Helper Function: Broadcast notification to all admin/staff profiles
CREATE OR REPLACE FUNCTION public.broadcast_notification(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'system',
    p_severity TEXT DEFAULT 'info',
    p_ref_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles WHERE role IN ('admin', 'staff') LOOP
        INSERT INTO public.notifications (
            id, user_id, title, message, is_read, type, severity, reference_id, created_at
        ) VALUES (
            gen_random_uuid(), r.id, p_title, p_message, FALSE, p_type, p_severity, p_ref_id, NOW()
        );
    END LOOP;
END;
$$;

-- 4. Trigger Function: Automatically create notification on ledger mutation
CREATE OR REPLACE FUNCTION public.trg_notify_ledger_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cust_name TEXT;
    v_action_title TEXT;
    v_msg TEXT;
    v_type_label TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT name INTO v_cust_name FROM public.customers WHERE id = NEW.customer_id;
        v_type_label := CASE 
            WHEN NEW.entry_type IN ('credit', 'opening_balance') THEN 'Amount Given (+)'
            WHEN NEW.entry_type = 'debit' THEN 'Payment Received (-)'
            ELSE 'Adjustment'
        END;
        
        v_action_title := 'New Ledger Entry Recorded';
        v_msg := format('%s of ₹%s for %s (%s)', v_type_label, NEW.amount, COALESCE(v_cust_name, 'Customer'), COALESCE(NEW.description, ''));
        
        PERFORM public.broadcast_notification(v_action_title, v_msg, 'ledger', 'info', NEW.id);

        -- Also notify customer if user_id exists
        IF EXISTS (SELECT 1 FROM public.customers WHERE id = NEW.customer_id AND user_id IS NOT NULL) THEN
            INSERT INTO public.notifications (id, user_id, title, message, is_read, type, severity, reference_id, created_at)
            SELECT gen_random_uuid(), user_id, v_action_title, v_msg, FALSE, 'ledger', 'info', NEW.id
            FROM public.customers WHERE id = NEW.customer_id AND user_id IS NOT NULL;
        END IF;

    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) THEN
            SELECT name INTO v_cust_name FROM public.customers WHERE id = NEW.customer_id;
            v_action_title := 'Ledger Entry Deleted';
            v_msg := format('Entry #%s for %s of ₹%s was deleted', substring(NEW.id::text from 1 for 8), COALESCE(v_cust_name, 'Customer'), NEW.amount);
            PERFORM public.broadcast_notification(v_action_title, v_msg, 'ledger', 'warning', NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_notify ON public.ledger_entries;
CREATE TRIGGER trg_ledger_notify
    AFTER INSERT OR UPDATE ON public.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_ledger_change();

-- 5. Trigger Function: Automatically create notification on customer status/registration change
CREATE OR REPLACE FUNCTION public.trg_notify_customer_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        PERFORM public.broadcast_notification(
            'New Customer Registered',
            format('Customer %s (%s) registered on portal and is pending review.', NEW.name, NEW.phone),
            'customer',
            'info',
            NEW.id
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            PERFORM public.broadcast_notification(
                format('Customer Status Changed to %s', UPPER(NEW.status)),
                format('Customer %s status changed from %s to %s.', NEW.name, OLD.status, NEW.status),
                'customer',
                CASE WHEN NEW.status = 'blocked' THEN 'danger' ELSE 'success' END,
                NEW.id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_notify ON public.customers;
CREATE TRIGGER trg_customer_notify
    AFTER INSERT OR UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_customer_change();

-- 6. Updated get_ledger_report with exact timestamp boundaries
CREATE OR REPLACE FUNCTION public.get_ledger_report(p_start_date DATE, p_end_date DATE)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_ts TIMESTAMPTZ;
    v_end_ts TIMESTAMPTZ;
    v_total_credit NUMERIC;
    v_total_debit NUMERIC;
    v_total_adjustment NUMERIC;
    v_net_balance NUMERIC;
    v_entry_count INT;
    v_entries JSON;
    v_result JSON;
BEGIN
    -- Timestamps boundaries for full-day inclusive filtering
    v_start_ts := p_start_date::TIMESTAMPTZ;
    v_end_ts := (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ;

    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE entry_type IN ('credit', 'opening_balance')), 0),
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'), 0),
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'adjustment'), 0),
        COUNT(*)
    INTO 
        v_total_credit, v_total_debit, v_total_adjustment, v_entry_count
    FROM public.ledger_entries
    WHERE is_deleted IS NOT TRUE
      AND created_at >= v_start_ts AND created_at < v_end_ts;

    v_net_balance := v_total_credit + v_total_adjustment - v_total_debit;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_entries
    FROM (
        SELECT 
            le.*, 
            c.name as customer_name,
            c.phone as customer_phone
        FROM public.ledger_entries le
        LEFT JOIN public.customers c ON c.id = le.customer_id
        WHERE le.is_deleted IS NOT TRUE
          AND le.created_at >= v_start_ts AND le.created_at < v_end_ts
        ORDER BY le.created_at DESC
    ) t;

    v_result := json_build_object(
        'total_credit', v_total_credit,
        'total_debit', v_total_debit,
        'total_adjustment', v_total_adjustment,
        'net_balance', v_net_balance,
        'entry_count', v_entry_count,
        'entries', v_entries
    );

    RETURN v_result;
END;
$$;

-- 7. Updated get_customer_statistics with payment_method breakdown for credit and debit
CREATE OR REPLACE FUNCTION public.get_customer_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_top_outstanding JSON;
    v_top_paying JSON;
    v_credit_method_distribution JSON;
    v_debit_method_distribution JSON;
    v_result JSON;
BEGIN
    -- Top outstanding
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_top_outstanding
    FROM (
        SELECT c.id, c.name, c.phone, ca.outstanding_balance, ca.account_number
        FROM public.customers c
        JOIN public.customer_accounts ca ON c.id = ca.customer_id
        ORDER BY ca.outstanding_balance DESC NULLS LAST
        LIMIT 5
    ) t;

    -- Top paying
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_top_paying
    FROM (
        SELECT c.id, c.name, c.phone, ca.total_paid, ca.account_number
        FROM public.customers c
        JOIN public.customer_accounts ca ON c.id = ca.customer_id
        ORDER BY ca.total_paid DESC NULLS LAST
        LIMIT 5
    ) t;

    -- Amount Given (Credit) by Payment Method
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_credit_method_distribution
    FROM (
        SELECT COALESCE(payment_method, 'Cash') as method, COUNT(*) as count, SUM(amount) as total
        FROM public.ledger_entries
        WHERE is_deleted IS NOT TRUE AND entry_type IN ('credit', 'opening_balance')
        GROUP BY COALESCE(payment_method, 'Cash')
        ORDER BY total DESC
    ) t;

    -- Payments Received (Debit) by Payment Method
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_debit_method_distribution
    FROM (
        SELECT COALESCE(payment_method, 'Cash') as method, COUNT(*) as count, SUM(amount) as total
        FROM public.ledger_entries
        WHERE is_deleted IS NOT TRUE AND entry_type = 'debit'
        GROUP BY COALESCE(payment_method, 'Cash')
        ORDER BY total DESC
    ) t;

    v_result := json_build_object(
        'top_outstanding', v_top_outstanding,
        'top_paying', v_top_paying,
        'credit_method_distribution', v_credit_method_distribution,
        'debit_method_distribution', v_debit_method_distribution
    );

    RETURN v_result;
END;
$$;
