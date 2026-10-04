-- ==============================================================================
-- Migration: 20260804200000_fix_opening_savings_double_count.sql
-- Description: Fix Customer Opening Savings Balance Double Count Bug
--
-- ACCOUNTING RULES & CORE PRINCIPLES:
-- 1. Opening Savings Balance is an INITIAL BASELINE BALANCE, NOT a new deposit.
-- 2. Formula: Savings Balance = Opening Savings + Savings Deposits - Savings Withdrawals - Bill Payments ± Adjustments
-- 3. Total Deposited strictly tracks new savings deposits (DEPOSIT, CREDIT), NOT the opening balance.
-- 4. Today's Savings Deposits strictly excludes initial opening balances.
-- 5. Establish initial balance once and never double-count.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FUNCTION: recalculate_customer_savings_balance
-- Authoritative calculation: Opening is baseline, total_deposited only counts actual deposits
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_customer_savings_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_opening NUMERIC(12, 2) := 0.00;
  v_total_dep NUMERIC(12, 2) := 0.00;
  v_total_with NUMERIC(12, 2) := 0.00;
  v_total_adj NUMERIC(12, 2) := 0.00;
  v_final_bal NUMERIC(12, 2) := 0.00;
BEGIN
  -- Opening Savings Baseline
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_opening
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND is_deleted = false
    AND transaction_type = 'OPENING';

  -- Total Actual Deposits (DEPOSIT, CREDIT) - strictly excludes OPENING!
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_total_dep
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND is_deleted = false
    AND transaction_type IN ('DEPOSIT', 'CREDIT');

  -- Total Withdrawn / Used (DEBIT, WITHDRAWAL, BILL_PAYMENT)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_total_with
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND is_deleted = false
    AND transaction_type IN ('DEBIT', 'WITHDRAWAL', 'BILL_PAYMENT');

  -- Total Adjustments
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_total_adj
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND is_deleted = false
    AND transaction_type = 'ADJUSTMENT';

  -- True authoritative balance
  v_final_bal := (v_opening + v_total_dep + v_total_adj) - v_total_with;
  IF v_final_bal < 0 THEN
    v_final_bal := 0.00;
  END IF;

  UPDATE public.customer_savings_accounts
  SET savings_balance = v_final_bal,
      total_deposited = v_total_dep,
      total_withdrawn = v_total_with,
      updated_at = now()
  WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 2. RPC: record_customer_opening_savings
-- Fixed: Inserts OPENING transaction and relies on recalculate_customer_savings_balance.
-- DOES NOT manually run UPDATE customer_savings_accounts SET savings_balance = savings_balance + p_amount!
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_customer_opening_savings(
  p_customer_id UUID,
  p_amount NUMERIC(12, 2),
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_savings_acc RECORD;
  v_existing_opening INT;
  v_new_tx RECORD;
  v_final_bal NUMERIC(12, 2) := 0.00;
  v_user_name TEXT := 'Admin';
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Opening savings amount must be greater than zero');
  END IF;

  -- Ensure savings account exists and lock row
  SELECT * INTO v_savings_acc
  FROM public.customer_savings_accounts
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.customer_savings_accounts (customer_id, savings_balance, total_deposited, total_withdrawn, status)
    VALUES (p_customer_id, 0.00, 0.00, 0.00, 'active')
    RETURNING * INTO v_savings_acc;
  END IF;

  -- Check if opening savings already recorded for this customer
  SELECT COUNT(*) INTO v_existing_opening
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND transaction_type = 'OPENING'
    AND is_deleted = false;

  IF v_existing_opening > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Customer already has an active opening savings balance');
  END IF;

  -- Insert OPENING savings transaction (balance_after is initial baseline)
  INSERT INTO public.customer_savings_transactions (
    customer_id,
    savings_account_id,
    transaction_type,
    amount,
    balance_after,
    description,
    reference_number,
    payment_method,
    notes,
    created_by
  ) VALUES (
    p_customer_id,
    v_savings_acc.id,
    'OPENING',
    p_amount,
    p_amount,
    'Initial Opening Savings Balance',
    'INIT/SAVINGS',
    'Cash',
    COALESCE(p_notes, 'Initial opening savings balance recorded at registration'),
    p_created_by
  ) RETURNING * INTO v_new_tx;

  -- Explicitly recalculate authoritative customer savings balance
  PERFORM public.recalculate_customer_savings_balance(p_customer_id);

  -- Fetch updated authoritative balance from customer_savings_accounts
  SELECT savings_balance INTO v_final_bal
  FROM public.customer_savings_accounts
  WHERE id = v_savings_acc.id;

  -- Get user name for audit log
  IF p_created_by IS NOT NULL THEN
    SELECT COALESCE(name, 'User') INTO v_user_name
    FROM public.profiles
    WHERE id = p_created_by;
  END IF;

  -- Record in audit logs
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_type,
    entity_id,
    after_state,
    reason,
    created_at
  ) VALUES (
    p_created_by,
    v_user_name,
    'CREATE_SAVINGS_OPENING_BALANCE',
    'savings',
    v_new_tx.id,
    to_jsonb(v_new_tx),
    'Opening savings balance initialized',
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'savings_account_id', v_savings_acc.id,
    'transaction_id', v_new_tx.id,
    'amount', p_amount,
    'savings_balance', v_final_bal
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 3. RPC: record_savings_transaction
-- Updated: Delegates balance recalculation to recalculate_customer_savings_balance
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_savings_transaction(
  p_customer_id UUID,
  p_transaction_type TEXT,
  p_amount NUMERIC(12, 2),
  p_description TEXT,
  p_reference_number TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'Cash',
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_savings_acc RECORD;
  v_new_bal NUMERIC(12, 2);
  v_new_tx RECORD;
  v_user_name TEXT := 'Admin';
  v_tx_type TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Amount must be greater than zero');
  END IF;

  v_tx_type := UPPER(TRIM(p_transaction_type));

  IF v_tx_type NOT IN ('CREDIT', 'DEPOSIT', 'DEBIT', 'WITHDRAWAL', 'BILL_PAYMENT', 'ADJUSTMENT', 'OPENING') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid transaction type');
  END IF;

  -- Ensure savings account exists and lock row
  SELECT * INTO v_savings_acc
  FROM public.customer_savings_accounts
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.customer_savings_accounts (customer_id, savings_balance, total_deposited, total_withdrawn, status)
    VALUES (p_customer_id, 0.00, 0.00, 0.00, 'active')
    RETURNING * INTO v_savings_acc;
  END IF;

  -- Validate balances
  IF v_tx_type IN ('CREDIT', 'DEPOSIT', 'OPENING') THEN
    v_new_bal := v_savings_acc.savings_balance + p_amount;
  ELSIF v_tx_type IN ('DEBIT', 'WITHDRAWAL') THEN
    IF v_savings_acc.savings_balance < p_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Withdrawal amount cannot exceed available savings of ₹' || v_savings_acc.savings_balance
      );
    END IF;
    v_new_bal := v_savings_acc.savings_balance - p_amount;
  ELSIF v_tx_type = 'BILL_PAYMENT' THEN
    IF v_savings_acc.savings_balance < p_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Insufficient savings balance. Available: ₹' || v_savings_acc.savings_balance || ', Requested: ₹' || p_amount
      );
    END IF;
    v_new_bal := v_savings_acc.savings_balance - p_amount;
  ELSIF v_tx_type = 'ADJUSTMENT' THEN
    v_new_bal := v_savings_acc.savings_balance + p_amount;
    IF v_new_bal < 0 THEN
      RETURN jsonb_build_object('success', false, 'message', 'Savings balance cannot become negative from adjustment');
    END IF;
  END IF;

  -- Insert savings transaction
  INSERT INTO public.customer_savings_transactions (
    customer_id,
    savings_account_id,
    transaction_type,
    amount,
    balance_after,
    description,
    reference_number,
    payment_method,
    notes,
    created_by
  ) VALUES (
    p_customer_id,
    v_savings_acc.id,
    v_tx_type,
    p_amount,
    v_new_bal,
    p_description,
    p_reference_number,
    COALESCE(p_payment_method, 'Cash'),
    p_notes,
    p_created_by
  ) RETURNING * INTO v_new_tx;

  -- Explicitly recalculate authoritative balance from all transactions
  PERFORM public.recalculate_customer_savings_balance(p_customer_id);

  SELECT savings_balance INTO v_new_bal
  FROM public.customer_savings_accounts
  WHERE id = v_savings_acc.id;

  -- Get user name for audit log
  IF p_created_by IS NOT NULL THEN
    SELECT COALESCE(name, 'User') INTO v_user_name
    FROM public.profiles
    WHERE id = p_created_by;
  END IF;

  -- Insert audit log
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_type,
    entity_id,
    after_state,
    reason,
    created_at
  ) VALUES (
    p_created_by,
    v_user_name,
    'RECORD_SAVINGS_' || v_tx_type,
    'savings',
    v_new_tx.id,
    to_jsonb(v_new_tx),
    p_notes,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction', to_jsonb(v_new_tx),
    'savings_balance', v_new_bal,
    'savings_account_id', v_savings_acc.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 4. RPC: get_dashboard_summary
-- Fixed: Today's savings deposits strictly excludes OPENING savings!
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', now());
  v_today_credit NUMERIC(12, 2) := 0.00;
  v_today_debit NUMERIC(12, 2) := 0.00;
  v_today_profit NUMERIC(12, 2) := 0.00;
  v_total_outstanding NUMERIC(12, 2) := 0.00;
  v_total_savings NUMERIC(12, 2) := 0.00;
  v_today_savings_deposits NUMERIC(12, 2) := 0.00;
  v_today_savings_withdrawals NUMERIC(12, 2) := 0.00;
  v_today_savings_bill_payments NUMERIC(12, 2) := 0.00;
  v_active_savings_customers INT := 0;
  v_total_customers INT := 0;
  v_active_customers INT := 0;
  v_pending_customers INT := 0;
  v_blocked_customers INT := 0;
  v_today_registrations INT := 0;
  v_recent_entries JSON := '[]'::json;
BEGIN
  -- Today's credit (lending given)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_credit
  FROM public.ledger_entries
  WHERE is_deleted = false
    AND entry_type IN ('credit', 'opening_balance')
    AND created_at >= v_today_start;

  -- Today's debit (lending payments received)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_debit
  FROM public.ledger_entries
  WHERE is_deleted = false
    AND entry_type = 'debit'
    AND created_at >= v_today_start;

  v_today_profit := v_today_credit - v_today_debit;

  -- Total outstanding across all customer accounts
  SELECT COALESCE(SUM(outstanding_balance), 0.00)
  INTO v_total_outstanding
  FROM public.customer_accounts;

  -- Total savings held across all active customer savings accounts
  SELECT COALESCE(SUM(savings_balance), 0.00)
  INTO v_total_savings
  FROM public.customer_savings_accounts
  WHERE status = 'active';

  -- Today's savings deposits (STRICTLY EXCLUDES OPENING SAVINGS!)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_savings_deposits
  FROM public.customer_savings_transactions
  WHERE is_deleted = false
    AND transaction_type IN ('CREDIT', 'DEPOSIT')
    AND created_at >= v_today_start;

  -- Today's savings withdrawals
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_savings_withdrawals
  FROM public.customer_savings_transactions
  WHERE is_deleted = false
    AND transaction_type IN ('DEBIT', 'WITHDRAWAL')
    AND created_at >= v_today_start;

  -- Today's savings used for bill payments
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_savings_bill_payments
  FROM public.customer_savings_transactions
  WHERE is_deleted = false
    AND transaction_type = 'BILL_PAYMENT'
    AND created_at >= v_today_start;

  -- Customers with active savings balance > 0
  SELECT COUNT(*)
  INTO v_active_savings_customers
  FROM public.customer_savings_accounts
  WHERE status = 'active' AND savings_balance > 0;

  -- Customer counts
  SELECT COUNT(*) INTO v_total_customers FROM public.customers;
  SELECT COUNT(*) INTO v_active_customers FROM public.customers WHERE status = 'active';
  SELECT COUNT(*) INTO v_pending_customers FROM public.customers WHERE status = 'pending_approval';
  SELECT COUNT(*) INTO v_blocked_customers FROM public.customers WHERE status = 'blocked';

  -- Today's new registrations
  SELECT COUNT(*)
  INTO v_today_registrations
  FROM public.customers
  WHERE created_at >= v_today_start;

  -- Recent 10 entries with customer details
  SELECT COALESCE(json_agg(t), '[]'::json)
  INTO v_recent_entries
  FROM (
    SELECT
      le.id,
      le.customer_id,
      le.entry_type,
      le.amount,
      le.description,
      le.reference_no,
      le.created_at,
      c.name AS customer_name
    FROM public.ledger_entries le
    LEFT JOIN public.customers c ON le.customer_id = c.id
    WHERE le.is_deleted = false
    ORDER BY le.created_at DESC
    LIMIT 10
  ) t;

  RETURN json_build_object(
    'today_credit', v_today_credit,
    'today_debit', v_today_debit,
    'today_profit', v_today_profit,
    'total_outstanding', v_total_outstanding,
    'total_savings', v_total_savings,
    'today_savings_deposits', v_today_savings_deposits,
    'today_savings_withdrawals', v_today_savings_withdrawals,
    'today_savings_bill_payments', v_today_savings_bill_payments,
    'active_savings_customers', v_active_savings_customers,
    'total_customers', v_total_customers,
    'active_customers', v_active_customers,
    'pending_customers', v_pending_customers,
    'blocked_customers', v_blocked_customers,
    'today_new_registrations', v_today_registrations,
    'recent_entries', v_recent_entries
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 5. RPC: get_savings_report
-- Fixed: total_deposited strictly excludes OPENING savings; total_opening_savings separated
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_savings_report(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_start_ts TIMESTAMPTZ;
  v_end_ts TIMESTAMPTZ;
  v_total_held NUMERIC(12, 2) := 0.00;
  v_total_dep NUMERIC(12, 2) := 0.00;
  v_total_opening NUMERIC(12, 2) := 0.00;
  v_total_with NUMERIC(12, 2) := 0.00;
  v_total_bill NUMERIC(12, 2) := 0.00;
  v_cust_with_savings INT := 0;
  v_cust_without_savings INT := 0;
  v_tx_count INT := 0;
  v_entries JSONB := '[]'::jsonb;
BEGIN
  IF p_start_date IS NOT NULL THEN
    v_start_ts := p_start_date::TIMESTAMPTZ;
  ELSE
    v_start_ts := '1970-01-01'::TIMESTAMPTZ;
  END IF;

  IF p_end_date IS NOT NULL THEN
    v_end_ts := (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ - INTERVAL '1 microsecond';
  ELSE
    v_end_ts := now() + INTERVAL '100 years';
  END IF;

  -- Total savings currently held across active accounts
  IF p_customer_id IS NOT NULL THEN
    SELECT COALESCE(savings_balance, 0.00)
    INTO v_total_held
    FROM public.customer_savings_accounts
    WHERE customer_id = p_customer_id;
  ELSE
    SELECT COALESCE(SUM(savings_balance), 0.00)
    INTO v_total_held
    FROM public.customer_savings_accounts
    WHERE status = 'active';
  END IF;

  -- Customers with active savings (> 0)
  SELECT COUNT(*)
  INTO v_cust_with_savings
  FROM public.customer_savings_accounts
  WHERE savings_balance > 0 AND status = 'active';

  -- Customers without savings (= 0)
  SELECT COUNT(*)
  INTO v_cust_without_savings
  FROM public.customer_savings_accounts
  WHERE savings_balance = 0 AND status = 'active';

  -- Total actual deposits in date range (strictly excludes OPENING)
  SELECT COALESCE(SUM(t.amount), 0.00)
  INTO v_total_dep
  FROM public.customer_savings_transactions t
  WHERE t.is_deleted = false
    AND t.transaction_type IN ('CREDIT', 'DEPOSIT')
    AND t.created_at >= v_start_ts
    AND t.created_at <= v_end_ts
    AND (p_customer_id IS NULL OR t.customer_id = p_customer_id);

  -- Total opening savings in date range
  SELECT COALESCE(SUM(t.amount), 0.00)
  INTO v_total_opening
  FROM public.customer_savings_transactions t
  WHERE t.is_deleted = false
    AND t.transaction_type = 'OPENING'
    AND t.created_at >= v_start_ts
    AND t.created_at <= v_end_ts
    AND (p_customer_id IS NULL OR t.customer_id = p_customer_id);

  -- Total withdrawn in date range (pure withdrawals)
  SELECT COALESCE(SUM(t.amount), 0.00)
  INTO v_total_with
  FROM public.customer_savings_transactions t
  WHERE t.is_deleted = false
    AND t.transaction_type IN ('DEBIT', 'WITHDRAWAL')
    AND t.created_at >= v_start_ts
    AND t.created_at <= v_end_ts
    AND (p_customer_id IS NULL OR t.customer_id = p_customer_id);

  -- Total used for bill payments in date range
  SELECT COALESCE(SUM(t.amount), 0.00)
  INTO v_total_bill
  FROM public.customer_savings_transactions t
  WHERE t.is_deleted = false
    AND t.transaction_type = 'BILL_PAYMENT'
    AND t.created_at >= v_start_ts
    AND t.created_at <= v_end_ts
    AND (p_customer_id IS NULL OR t.customer_id = p_customer_id);

  -- Transactions list
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'customer_id', t.customer_id,
      'customer_name', c.name,
      'customer_phone', c.phone,
      'transaction_type', t.transaction_type,
      'amount', t.amount,
      'balance_after', t.balance_after,
      'description', t.description,
      'reference_number', t.reference_number,
      'payment_method', t.payment_method,
      'notes', t.notes,
      'created_at', t.created_at,
      'is_deleted', t.is_deleted
    ) ORDER BY t.created_at DESC
  ), '[]'::jsonb)
  INTO v_entries
  FROM public.customer_savings_transactions t
  LEFT JOIN public.customers c ON t.customer_id = c.id
  WHERE t.is_deleted = false
    AND t.created_at >= v_start_ts
    AND t.created_at <= v_end_ts
    AND (p_customer_id IS NULL OR t.customer_id = p_customer_id);

  v_tx_count := jsonb_array_length(v_entries);

  RETURN jsonb_build_object(
    'total_savings_held', v_total_held,
    'total_deposited', v_total_dep,
    'total_opening_savings', v_total_opening,
    'total_withdrawn', v_total_with,
    'total_bill_payments', v_total_bill,
    'customers_with_savings', v_cust_with_savings,
    'customers_without_savings', v_cust_without_savings,
    'transaction_count', v_tx_count,
    'transactions', v_entries
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 6. RPC: get_savings_analytics
-- Fixed: Monthly trend deposits strictly excludes OPENING; net movement preserves total flow
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_savings_analytics(p_months INT DEFAULT 6)
RETURNS JSONB AS $$
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
    COALESCE(SUM(savings_balance), 0.00),
    COUNT(*) FILTER (WHERE savings_balance > 0)
  INTO v_total_savings, v_active_savers
  FROM public.customer_savings_accounts
  WHERE status = 'active';

  -- Total bills paid via savings ever
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_total_bills_paid_savings
  FROM public.customer_savings_transactions
  WHERE is_deleted = false AND transaction_type = 'BILL_PAYMENT';

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
    WHERE sa.savings_balance > 0 AND sa.status = 'active'
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 7. DATA REPAIR & CORRECTION BLOCK
-- Automatically cleanses duplicate transactions and recalculates all customer savings accounts
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Soft-delete duplicate DEPOSIT transactions created alongside OPENING for the same customer
  UPDATE public.customer_savings_transactions t_dep
  SET is_deleted = true,
      deleted_at = now()
  WHERE t_dep.transaction_type = 'DEPOSIT'
    AND t_dep.reference_number = 'INIT/SAVINGS'
    AND t_dep.is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.customer_savings_transactions t_op
      WHERE t_op.customer_id = t_dep.customer_id
        AND t_op.transaction_type = 'OPENING'
        AND t_op.is_deleted = false
        AND t_op.amount = t_dep.amount
    );

  -- 2. Recalculate authoritative savings balances for all existing customer savings accounts
  FOR r IN SELECT customer_id FROM public.customer_savings_accounts LOOP
    PERFORM public.recalculate_customer_savings_balance(r.customer_id);
  END LOOP;
END;
$$;
