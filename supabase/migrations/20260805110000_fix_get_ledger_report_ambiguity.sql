-- ==============================================================================
-- Migration: Fix get_ledger_report RPC Ambiguity
-- Description: Drop conflicting overloaded signatures of get_ledger_report
-- and establish ONE canonical, unambiguous function supporting optional customer
-- and customer_type filtering.
-- ==============================================================================

-- 1. Explicitly drop all conflicting overloaded versions of get_ledger_report
DROP FUNCTION IF EXISTS public.get_ledger_report(date, date);
DROP FUNCTION IF EXISTS public.get_ledger_report(date, date, uuid);
DROP FUNCTION IF EXISTS public.get_ledger_report(date, date, uuid, uuid);

-- 2. Create the ONE CANONICAL get_ledger_report function
CREATE OR REPLACE FUNCTION public.get_ledger_report(
    p_start_date DATE, 
    p_end_date DATE,
    p_customer_id UUID DEFAULT NULL,
    p_customer_type_id UUID DEFAULT NULL
)
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
    v_total_customers INT;
    v_avg_txn NUMERIC;
    v_max_txn NUMERIC;
    v_entries JSON;
    v_result JSON;
BEGIN
    -- Timestamps boundaries for full-day inclusive filtering
    v_start_ts := p_start_date::TIMESTAMPTZ;
    v_end_ts := (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ;

    -- Aggregate totals strictly filtered by customer and customer type when specified
    SELECT 
        COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type IN ('credit', 'opening_balance')), 0),
        COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'debit'), 0),
        COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'adjustment'), 0),
        COUNT(*),
        COUNT(DISTINCT le.customer_id),
        COALESCE(AVG(le.amount), 0),
        COALESCE(MAX(le.amount), 0)
    INTO 
        v_total_credit, v_total_debit, v_total_adjustment, v_entry_count, v_total_customers, v_avg_txn, v_max_txn
    FROM public.ledger_entries le
    LEFT JOIN public.customers c ON c.id = le.customer_id
    WHERE le.is_deleted IS NOT TRUE
      AND le.created_at >= v_start_ts AND le.created_at < v_end_ts
      AND (p_customer_id IS NULL OR le.customer_id = p_customer_id)
      AND (p_customer_type_id IS NULL OR c.customer_type_id = p_customer_type_id);

    v_net_balance := v_total_credit + v_total_adjustment - v_total_debit;

    -- Detailed entries list with customer metadata joined
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_entries
    FROM (
        SELECT 
            le.*, 
            c.name AS customer_name,
            c.phone AS customer_phone,
            c.customer_type_id,
            ct.name AS customer_type_name,
            ca.account_number
        FROM public.ledger_entries le
        LEFT JOIN public.customers c ON c.id = le.customer_id
        LEFT JOIN public.customer_types ct ON ct.id = c.customer_type_id
        LEFT JOIN public.customer_accounts ca ON ca.customer_id = le.customer_id
        WHERE le.is_deleted IS NOT TRUE
          AND le.created_at >= v_start_ts AND le.created_at < v_end_ts
          AND (p_customer_id IS NULL OR le.customer_id = p_customer_id)
          AND (p_customer_type_id IS NULL OR c.customer_type_id = p_customer_type_id)
        ORDER BY le.created_at DESC
    ) t;

    v_result := json_build_object(
        'total_credit', v_total_credit,
        'total_debit', v_total_debit,
        'total_adjustment', v_total_adjustment,
        'net_balance', v_net_balance,
        'entry_count', v_entry_count,
        'total_customers', v_total_customers,
        'avg_transaction_value', v_avg_txn,
        'max_transaction_value', v_max_txn,
        'entries', v_entries
    );

    RETURN v_result;
END;
$$;

-- 3. Grant execute permissions explicitly to authenticated and anon/service roles
GRANT EXECUTE ON FUNCTION public.get_ledger_report(DATE, DATE, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ledger_report(DATE, DATE, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ledger_report(DATE, DATE, UUID, UUID) TO anon;
