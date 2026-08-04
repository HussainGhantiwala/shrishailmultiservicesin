-- Migration: Create RPC functions and views for business management portal
-- All functions are SECURITY DEFINER with SET search_path = public to bypass RLS

-- 1. get_dashboard_summary()
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today_credit NUMERIC;
    v_today_debit NUMERIC;
    v_today_profit NUMERIC;
    v_total_outstanding NUMERIC;
    v_total_customers INT;
    v_active_customers INT;
    v_pending_customers INT;
    v_blocked_customers INT;
    v_today_new_registrations INT;
    v_recent_entries JSON;
    v_result JSON;
BEGIN
    -- Today's credit
    SELECT COALESCE(SUM(amount), 0) INTO v_today_credit
    FROM public.ledger_entries
    WHERE entry_type IN ('credit', 'opening_balance')
      AND DATE(timezone('utc', created_at)) = CURRENT_DATE
      AND is_deleted IS NOT TRUE;

    -- Today's debit
    SELECT COALESCE(SUM(amount), 0) INTO v_today_debit
    FROM public.ledger_entries
    WHERE entry_type = 'debit'
      AND DATE(timezone('utc', created_at)) = CURRENT_DATE
      AND is_deleted IS NOT TRUE;

    -- Today's profit
    v_today_profit := v_today_credit - v_today_debit;

    -- Total outstanding
    SELECT COALESCE(SUM(outstanding_balance), 0) INTO v_total_outstanding
    FROM public.customer_accounts;

    -- Customer counts
    SELECT COUNT(*) INTO v_total_customers FROM public.customers;
    
    SELECT COUNT(*) INTO v_active_customers 
    FROM public.customers WHERE status = 'active';
    
    SELECT COUNT(*) INTO v_pending_customers 
    FROM public.customers WHERE status = 'pending_approval';
    
    SELECT COUNT(*) INTO v_blocked_customers 
    FROM public.customers WHERE status = 'blocked';

    SELECT COUNT(*) INTO v_today_new_registrations 
    FROM public.customers 
    WHERE DATE(timezone('utc', created_at)) = CURRENT_DATE;

    -- Recent entries
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_recent_entries
    FROM (
        SELECT 
            le.id, 
            le.customer_id, 
            le.entry_type, 
            le.amount, 
            le.description, 
            le.reference_no, 
            le.created_at, 
            c.name as customer_name
        FROM public.ledger_entries le
        LEFT JOIN public.customers c ON c.id = le.customer_id
        WHERE le.is_deleted IS NOT TRUE
        ORDER BY le.created_at DESC
        LIMIT 10
    ) t;

    -- Build final JSON
    v_result := json_build_object(
        'today_credit', v_today_credit,
        'today_debit', v_today_debit,
        'today_profit', v_today_profit,
        'total_outstanding', v_total_outstanding,
        'total_customers', v_total_customers,
        'active_customers', v_active_customers,
        'pending_customers', v_pending_customers,
        'blocked_customers', v_blocked_customers,
        'today_new_registrations', v_today_new_registrations,
        'recent_entries', v_recent_entries
    );

    RETURN v_result;
END;
$$;


-- 2. get_monthly_ledger_summary(p_months INT DEFAULT 6)
CREATE OR REPLACE FUNCTION public.get_monthly_ledger_summary(p_months INT DEFAULT 6)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_result
    FROM (
        SELECT 
            to_char(date_trunc('month', created_at), 'Mon YYYY') as month,
            COALESCE(SUM(amount) FILTER (WHERE entry_type IN ('credit', 'opening_balance')), 0) as total_credit,
            COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'), 0) as total_debit,
            (COALESCE(SUM(amount) FILTER (WHERE entry_type IN ('credit', 'opening_balance')), 0) - 
             COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'), 0)) as net,
            date_trunc('month', created_at) as month_date
        FROM public.ledger_entries
        WHERE is_deleted IS NOT TRUE
          AND created_at >= date_trunc('month', CURRENT_DATE) - (p_months - 1) * interval '1 month'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) DESC
    ) t;

    -- We remove month_date from final output, but it was used for ordering.
    -- Better way is to build object manually if we want exact shape without month_date.
    -- Let's re-write the inner query to just select the required fields.
    
    SELECT COALESCE(json_agg(json_build_object(
        'month', to_char(m_date, 'Mon YYYY'),
        'total_credit', c_credit,
        'total_debit', c_debit,
        'net', c_credit - c_debit
    )), '[]'::json) INTO v_result
    FROM (
        SELECT 
            date_trunc('month', created_at) as m_date,
            COALESCE(SUM(amount) FILTER (WHERE entry_type IN ('credit', 'opening_balance')), 0) as c_credit,
            COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'), 0) as c_debit
        FROM public.ledger_entries
        WHERE is_deleted IS NOT TRUE
          AND created_at >= date_trunc('month', CURRENT_DATE) - (p_months - 1) * interval '1 month'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) DESC
    ) agg;

    RETURN v_result;
END;
$$;


-- 3. get_customer_statistics()
CREATE OR REPLACE FUNCTION public.get_customer_statistics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_top_outstanding JSON;
    v_top_paying JSON;
    v_payment_method_distribution JSON;
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

    -- Payment method distribution
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_payment_method_distribution
    FROM (
        SELECT payment_method as method, COUNT(*) as count, SUM(amount) as total
        FROM public.payments
        GROUP BY payment_method
    ) t;

    -- Build final JSON
    v_result := json_build_object(
        'top_outstanding', v_top_outstanding,
        'top_paying', v_top_paying,
        'payment_method_distribution', v_payment_method_distribution
    );

    RETURN v_result;
END;
$$;


-- 4. get_ledger_report(p_start_date DATE, p_end_date DATE)
CREATE OR REPLACE FUNCTION public.get_ledger_report(p_start_date DATE, p_end_date DATE)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_credit NUMERIC;
    v_total_debit NUMERIC;
    v_total_adjustment NUMERIC;
    v_net_balance NUMERIC;
    v_entry_count INT;
    v_entries JSON;
    v_result JSON;
BEGIN
    -- Aggregates
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE entry_type IN ('credit', 'opening_balance')), 0),
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'), 0),
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'adjustment'), 0),
        COUNT(*)
    INTO 
        v_total_credit, v_total_debit, v_total_adjustment, v_entry_count
    FROM public.ledger_entries
    WHERE is_deleted IS NOT TRUE
      AND DATE(timezone('utc', created_at)) BETWEEN p_start_date AND p_end_date;

    v_net_balance := v_total_credit + v_total_adjustment - v_total_debit;

    -- Entries array
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_entries
    FROM (
        SELECT 
            le.*, 
            c.name as customer_name
        FROM public.ledger_entries le
        LEFT JOIN public.customers c ON c.id = le.customer_id
        WHERE le.is_deleted IS NOT TRUE
          AND DATE(timezone('utc', le.created_at)) BETWEEN p_start_date AND p_end_date
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


-- 5. create_notification(p_user_id UUID, p_title TEXT, p_message TEXT)
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id UUID, p_title TEXT, p_message TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (
        id, 
        user_id, 
        title, 
        message, 
        is_read, 
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        p_title,
        p_message,
        FALSE,
        NOW()
    );
END;
$$;


-- Enable Supabase Realtime for specified tables
-- This adds the tables to the supabase_realtime publication
DO $$
BEGIN
    -- Customers
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'customers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
    END IF;

    -- Customer Accounts
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'customer_accounts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_accounts;
    END IF;

    -- Ledger Entries
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ledger_entries'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ledger_entries;
    END IF;

    -- Notifications
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;
