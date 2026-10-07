-- ==============================================================================
-- Migration: Analytics Customer Type & Customer Filtering Functions
-- Description:
-- Extends analytics RPC functions to support customer type and individual customer
-- filtering with atomic, server-side database aggregation:
-- 1. get_monthly_ledger_summary(p_months, p_customer_id, p_customer_type_id)
-- 2. get_customer_statistics(p_customer_id, p_customer_type_id)
-- 3. get_savings_analytics(p_months, p_customer_id, p_customer_type_id)
-- Drops obsolete signatures first to prevent function overloading ambiguity.
-- Preserves 100% backward compatibility when parameters are NULL / omitted.
-- ==============================================================================

-- 1. Drop obsolete signatures to prevent PostgreSQL function overload ambiguity
DROP FUNCTION IF EXISTS public.get_monthly_ledger_summary(INT);
DROP FUNCTION IF EXISTS public.get_customer_statistics();
DROP FUNCTION IF EXISTS public.get_savings_analytics(INT);

-- ------------------------------------------------------------------------------
-- 2. RPC: get_monthly_ledger_summary
-- Aggregates monthly credit, debit, and net movement for the specified period,
-- filtered by customer and/or customer_type.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_monthly_ledger_summary(
    p_months INT DEFAULT 6,
    p_customer_id UUID DEFAULT NULL,
    p_customer_type_id UUID DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT COALESCE(json_agg(json_build_object(
        'month', to_char(m_date, 'Mon YYYY'),
        'total_credit', c_credit,
        'total_debit', c_debit,
        'net', c_credit - c_debit
    )), '[]'::json) INTO v_result
    FROM (
        SELECT 
            date_trunc('month', le.created_at) as m_date,
            COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type IN ('credit', 'opening_balance')), 0) as c_credit,
            COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'debit'), 0) as c_debit
        FROM public.ledger_entries le
        WHERE le.is_deleted IS NOT TRUE
          AND le.created_at >= date_trunc('month', CURRENT_DATE) - (p_months - 1) * interval '1 month'
          AND (p_customer_id IS NULL OR le.customer_id = p_customer_id)
          AND (p_customer_type_id IS NULL OR EXISTS (
              SELECT 1 FROM public.customers c
              WHERE c.id = le.customer_id AND c.customer_type_id = p_customer_type_id
          ))
        GROUP BY date_trunc('month', le.created_at)
        ORDER BY date_trunc('month', le.created_at) DESC
    ) agg;

    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. RPC: get_customer_statistics
-- Returns top outstanding customers, top paying customers, payment method
-- breakdowns, and summary totals filtered by customer and/or customer_type.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_customer_statistics(
    p_customer_id UUID DEFAULT NULL,
    p_customer_type_id UUID DEFAULT NULL
)
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
    v_total_customers INT := 0;
    v_total_credit NUMERIC(12,2) := 0;
    v_total_debit NUMERIC(12,2) := 0;
    v_total_outstanding NUMERIC(12,2) := 0;
    v_total_transactions INT := 0;
    v_result JSON;
BEGIN
    -- Summary counts & sums filtered by customer & customer type
    SELECT 
        COUNT(DISTINCT c.id),
        COALESCE(SUM(ca.outstanding_balance), 0)
    INTO v_total_customers, v_total_outstanding
    FROM public.customers c
    LEFT JOIN public.customer_accounts ca ON c.id = ca.customer_id
    WHERE (p_customer_id IS NULL OR c.id = p_customer_id)
      AND (p_customer_type_id IS NULL OR c.customer_type_id = p_customer_type_id);

    -- Summary transactions totals
    SELECT 
        COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type IN ('credit', 'opening_balance')), 0),
        COALESCE(SUM(le.amount) FILTER (WHERE le.entry_type = 'debit'), 0),
        COUNT(*)
    INTO v_total_credit, v_total_debit, v_total_transactions
    FROM public.ledger_entries le
    WHERE le.is_deleted IS NOT TRUE
      AND (p_customer_id IS NULL OR le.customer_id = p_customer_id)
      AND (p_customer_type_id IS NULL OR EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.id = le.customer_id AND c.customer_type_id = p_customer_type_id
      ));

    -- Top outstanding customers
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_top_outstanding
    FROM (
        SELECT c.id, c.name, c.phone, ca.outstanding_balance, ca.account_number
        FROM public.customers c
        JOIN public.customer_accounts ca ON c.id = ca.customer_id
        WHERE (p_customer_id IS NULL OR c.id = p_customer_id)
          AND (p_customer_type_id IS NULL OR c.customer_type_id = p_customer_type_id)
        ORDER BY ca.outstanding_balance DESC NULLS LAST
        LIMIT 5
    ) t;

    -- Top paying customers
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_top_paying
    FROM (
        SELECT c.id, c.name, c.phone, ca.total_paid, ca.account_number
        FROM public.customers c
        JOIN public.customer_accounts ca ON c.id = ca.customer_id
        WHERE (p_customer_id IS NULL OR c.id = p_customer_id)
          AND (p_customer_type_id IS NULL OR c.customer_type_id = p_customer_type_id)
        ORDER BY ca.total_paid DESC NULLS LAST
        LIMIT 5
    ) t;

    -- Amount Given (Credit) by Payment Method
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_credit_method_distribution
    FROM (
        SELECT COALESCE(le.payment_method, 'Cash') as method, COUNT(*) as count, SUM(le.amount) as total
        FROM public.ledger_entries le
        WHERE le.is_deleted IS NOT TRUE 
          AND le.entry_type IN ('credit', 'opening_balance')
          AND (p_customer_id IS NULL OR le.customer_id = p_customer_id)
          AND (p_customer_type_id IS NULL OR EXISTS (
              SELECT 1 FROM public.customers c
              WHERE c.id = le.customer_id AND c.customer_type_id = p_customer_type_id
          ))
        GROUP BY COALESCE(le.payment_method, 'Cash')
        ORDER BY total DESC
    ) t;

    -- Payments Received (Debit) by Payment Method
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_debit_method_distribution
    FROM (
        SELECT COALESCE(le.payment_method, 'Cash') as method, COUNT(*) as count, SUM(le.amount) as total
        FROM public.ledger_entries le
        WHERE le.is_deleted IS NOT TRUE 
          AND le.entry_type = 'debit'
          AND (p_customer_id IS NULL OR le.customer_id = p_customer_id)
          AND (p_customer_type_id IS NULL OR EXISTS (
              SELECT 1 FROM public.customers c
              WHERE c.id = le.customer_id AND c.customer_type_id = p_customer_type_id
          ))
        GROUP BY COALESCE(le.payment_method, 'Cash')
        ORDER BY total DESC
    ) t;

    v_result := json_build_object(
        'top_outstanding', v_top_outstanding,
        'top_paying', v_top_paying,
        'credit_method_distribution', v_credit_method_distribution,
        'debit_method_distribution', v_debit_method_distribution,
        'payment_method_distribution', v_debit_method_distribution,
        'total_customers', v_total_customers,
        'total_outstanding', v_total_outstanding,
        'total_credit', v_total_credit,
        'total_debit', v_total_debit,
        'total_transactions', v_total_transactions
    );

    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. RPC: get_savings_analytics
-- Returns savings metrics, monthly flow trend, top savers, and recent withdrawals
-- filtered by customer and/or customer_type.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_savings_analytics(
    p_months INT DEFAULT 6,
    p_customer_id UUID DEFAULT NULL,
    p_customer_type_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_months_trend JSONB := '[]'::jsonb;
  v_top_savers JSONB := '[]'::jsonb;
  v_recent_withdrawals JSONB := '[]'::jsonb;
  v_total_savings NUMERIC(12, 2) := 0.00;
  v_active_savers INT := 0;
  v_total_bills_paid_savings NUMERIC(12, 2) := 0.00;
BEGIN
  -- Total savings and active savers
  SELECT 
    COALESCE(SUM(sa.savings_balance), 0.00),
    COUNT(*) FILTER (WHERE sa.savings_balance > 0)
  INTO v_total_savings, v_active_savers
  FROM public.customer_savings_accounts sa
  JOIN public.customers c ON sa.customer_id = c.id
  WHERE sa.status = 'active'
    AND (p_customer_id IS NULL OR sa.customer_id = p_customer_id)
    AND (p_customer_type_id IS NULL OR c.customer_type_id = p_customer_type_id);

  -- Total bills paid via savings ever
  SELECT COALESCE(SUM(t.amount), 0.00)
  INTO v_total_bills_paid_savings
  FROM public.customer_savings_transactions t
  JOIN public.customers c ON t.customer_id = c.id
  WHERE t.is_deleted = false 
    AND t.transaction_type = 'BILL_PAYMENT'
    AND (p_customer_id IS NULL OR t.customer_id = p_customer_id)
    AND (p_customer_type_id IS NULL OR c.customer_type_id = p_customer_type_id);

  -- Monthly Trend for savings (deposits strictly exclude OPENING)
  SELECT COALESCE(jsonb_agg(m ORDER BY m.month_start ASC), '[]'::jsonb)
  INTO v_months_trend
  FROM (
    SELECT
      to_char(date_trunc('month', d), 'Mon YYYY') AS month,
      date_trunc('month', d) AS month_start,
      COALESCE(SUM(CASE WHEN t.transaction_type IN ('CREDIT', 'DEPOSIT') THEN t.amount ELSE 0 END), 0.00) AS deposits,
      COALESCE(SUM(CASE WHEN t.transaction_type IN ('DEBIT', 'WITHDRAWAL') THEN t.amount ELSE 0 END), 0.00) AS withdrawals,
      COALESCE(SUM(CASE WHEN t.transaction_type = 'BILL_PAYMENT' THEN t.amount ELSE 0 END), 0.00) AS bill_payments,
      COALESCE(SUM(CASE 
        WHEN t.transaction_type IN ('CREDIT', 'DEPOSIT', 'OPENING') THEN t.amount 
        WHEN t.transaction_type IN ('DEBIT', 'WITHDRAWAL', 'BILL_PAYMENT') THEN -t.amount 
        ELSE 0 
      END), 0.00) AS net_movement
    FROM generate_series(
      date_trunc('month', now()) - ((p_months - 1) || ' months')::interval,
      date_trunc('month', now()),
      '1 month'::interval
    ) d
    LEFT JOIN public.customer_savings_transactions t
      ON date_trunc('month', t.created_at) = date_trunc('month', d)
      AND t.is_deleted = false
      AND (p_customer_id IS NULL OR t.customer_id = p_customer_id)
      AND (p_customer_type_id IS NULL OR EXISTS (
          SELECT 1 FROM public.customers c
          WHERE c.id = t.customer_id AND c.customer_type_id = p_customer_type_id
      ))
    GROUP BY date_trunc('month', d)
  ) m;

  -- Top 5 customers by savings balance
  SELECT COALESCE(jsonb_agg(ts), '[]'::jsonb)
  INTO v_top_savers
  FROM (
    SELECT
      c.id,
      c.name,
      c.phone,
      sa.savings_balance,
      sa.total_deposited,
      sa.total_withdrawn
    FROM public.customer_savings_accounts sa
    JOIN public.customers c ON sa.customer_id = c.id
    WHERE sa.savings_balance > 0 
      AND sa.status = 'active'
      AND (p_customer_id IS NULL OR c.id = p_customer_id)
      AND (p_customer_type_id IS NULL OR c.customer_type_id = p_customer_type_id)
    ORDER BY sa.savings_balance DESC
    LIMIT 5
  ) ts;

  -- Recent 5 withdrawals / bill payments
  SELECT COALESCE(jsonb_agg(rw), '[]'::jsonb)
  INTO v_recent_withdrawals
  FROM (
    SELECT
      t.id,
      t.customer_id,
      c.name AS customer_name,
      c.phone AS customer_phone,
      t.transaction_type,
      t.amount,
      t.balance_after,
      t.description,
      t.created_at
    FROM public.customer_savings_transactions t
    JOIN public.customers c ON t.customer_id = c.id
    WHERE t.is_deleted = false
      AND t.transaction_type IN ('WITHDRAWAL', 'DEBIT', 'BILL_PAYMENT')
      AND (p_customer_id IS NULL OR c.id = p_customer_id)
      AND (p_customer_type_id IS NULL OR c.customer_type_id = p_customer_type_id)
    ORDER BY t.created_at DESC
    LIMIT 5
  ) rw;

  RETURN jsonb_build_object(
    'total_savings', v_total_savings,
    'active_savers', v_active_savers,
    'total_bills_paid_savings', v_total_bills_paid_savings,
    'monthly_trend', v_months_trend,
    'top_savers', v_top_savers,
    'recent_withdrawals', v_recent_withdrawals
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Permission Grants
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_monthly_ledger_summary(INT, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_customer_statistics(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_savings_analytics(INT, UUID, UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_monthly_ledger_summary(INT, UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_statistics(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_savings_analytics(INT, UUID, UUID) FROM anon;
