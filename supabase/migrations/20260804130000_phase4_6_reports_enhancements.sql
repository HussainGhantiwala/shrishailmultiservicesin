-- Migration: Phase 4.6 Reports Enhancements
-- Description: Extend get_ledger_report RPC with customer filtering, average/max transaction stats, and distinct customer counts.

CREATE OR REPLACE FUNCTION public.get_ledger_report(
    p_start_date DATE, 
    p_end_date DATE,
    p_customer_id UUID DEFAULT NULL
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

    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE entry_type IN ('credit', 'opening_balance')), 0),
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'), 0),
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'adjustment'), 0),
        COUNT(*),
        COUNT(DISTINCT customer_id),
        COALESCE(AVG(amount), 0),
        COALESCE(MAX(amount), 0)
    INTO 
        v_total_credit, v_total_debit, v_total_adjustment, v_entry_count, v_total_customers, v_avg_txn, v_max_txn
    FROM public.ledger_entries
    WHERE is_deleted IS NOT TRUE
      AND created_at >= v_start_ts AND created_at < v_end_ts
      AND (p_customer_id IS NULL OR customer_id = p_customer_id);

    v_net_balance := v_total_credit + v_total_adjustment - v_total_debit;

    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_entries
    FROM (
        SELECT 
            le.*, 
            c.name as customer_name,
            c.phone as customer_phone,
            ca.account_number
        FROM public.ledger_entries le
        LEFT JOIN public.customers c ON c.id = le.customer_id
        LEFT JOIN public.customer_accounts ca ON ca.customer_id = le.customer_id
        WHERE le.is_deleted IS NOT TRUE
          AND le.created_at >= v_start_ts AND le.created_at < v_end_ts
          AND (p_customer_id IS NULL OR le.customer_id = p_customer_id)
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
