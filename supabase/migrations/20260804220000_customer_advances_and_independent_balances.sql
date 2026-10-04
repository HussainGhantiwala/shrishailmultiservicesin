-- ==============================================================================
-- Migration: 20260804220000_customer_advances_and_independent_balances.sql
-- Description: Independent Customer Outstanding & Customer Credits/Advances Accounting
--
-- ACCOUNTING RULES & SYSTEM DESIGN:
-- 1. For each customer individually:
--    Raw Balance = Total Amount Given (Credit + Opening + Adjustment) - Total Payments Received (Debit)
-- 2. If Raw Balance > 0:
--    Outstanding Dues = Raw Balance
--    Customer Advance = 0.00
-- 3. If Raw Balance < 0:
--    Outstanding Dues = 0.00 (Customer has no pending dues!)
--    Customer Credit / Advance = ABS(Raw Balance) (Customer paid in advance)
-- 4. Global Aggregations:
--    Total Outstanding Dues = SUM(outstanding_balance) across all customers
--    Total Customer Credits/Advances = SUM(advance_balance) across all customers
--    Net Receivable = Total Outstanding Dues - Total Customer Credits/Advances
-- 5. Complete Independence:
--    Customer A's advance/credit MUST NEVER reduce Customer B's outstanding dues.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA UPDATE: Add advance_balance column to customer_accounts
-- ------------------------------------------------------------------------------
ALTER TABLE public.customer_accounts
ADD COLUMN IF NOT EXISTS advance_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN public.customer_accounts.advance_balance IS 'Customer credit / advance paid by customer in excess of dues. Kept strictly independent from outstanding dues.';

-- ------------------------------------------------------------------------------
-- 2. FUNCTION: recalculate_customer_account_balance
-- Authoritative recalculation of an individual customer account
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_customer_account_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_credit NUMERIC(12, 2) := 0.00;
    v_total_debit NUMERIC(12, 2) := 0.00;
    v_total_paid NUMERIC(12, 2) := 0.00;
    v_total_adjustment NUMERIC(12, 2) := 0.00;
    v_raw_balance NUMERIC(12, 2) := 0.00;
    v_outstanding NUMERIC(12, 2) := 0.00;
    v_advance NUMERIC(12, 2) := 0.00;
BEGIN
    SELECT
        COALESCE(SUM(CASE WHEN entry_type IN ('credit', 'opening_balance') THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0.00),
        -- total_paid: ONLY cash/bank payments, STRICTLY EXCLUDES 'Customer Savings'
        COALESCE(SUM(CASE WHEN entry_type = 'debit' AND (payment_method IS NULL OR payment_method != 'Customer Savings') THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN entry_type = 'adjustment' THEN amount ELSE 0 END), 0.00)
    INTO v_total_credit, v_total_debit, v_total_paid, v_total_adjustment
    FROM public.ledger_entries
    WHERE customer_id = p_customer_id AND is_deleted = false;

    -- Raw Balance = Total Amount Given - Total Payments Received
    v_raw_balance := (v_total_credit + v_total_adjustment) - v_total_debit;

    IF v_raw_balance > 0 THEN
        -- Customer owes money to the business
        v_outstanding := v_raw_balance;
        v_advance := 0.00;
    ELSIF v_raw_balance < 0 THEN
        -- Customer has paid in advance / has excess credit on account
        v_outstanding := 0.00;
        v_advance := ABS(v_raw_balance);
    ELSE
        -- Account is completely settled
        v_outstanding := 0.00;
        v_advance := 0.00;
    END IF;

    UPDATE public.customer_accounts
    SET
        total_credit = v_total_credit,
        total_debit = v_total_debit,
        total_paid = v_total_paid,
        outstanding_balance = v_outstanding,
        advance_balance = v_advance,
        updated_at = now()
    WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 3. RPC: get_dashboard_summary
-- Independent aggregation of Total Outstanding Dues, Customer Advances, and Net Receivable
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', now());
  v_today_credit NUMERIC(12, 2) := 0.00;
  v_today_debit NUMERIC(12, 2) := 0.00;
  v_today_profit NUMERIC(12, 2) := 0.00;
  v_total_outstanding NUMERIC(12, 2) := 0.00;
  v_total_advance NUMERIC(12, 2) := 0.00;
  v_net_receivable NUMERIC(12, 2) := 0.00;
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
  -- Today's credit (Amount Given)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_credit
  FROM public.ledger_entries
  WHERE is_deleted = false
    AND entry_type IN ('credit', 'opening_balance')
    AND created_at >= v_today_start;

  -- Today's debit: ACTUAL cash / bank / UPI payments received ONLY!
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_debit
  FROM public.ledger_entries
  WHERE is_deleted = false
    AND entry_type = 'debit'
    AND (payment_method IS NULL OR payment_method != 'Customer Savings')
    AND created_at >= v_today_start;

  -- Total outstanding across all customer accounts:
  -- Sum of only positive dues. Customer A's credit NEVER reduces Customer B's outstanding!
  SELECT COALESCE(SUM(GREATEST(outstanding_balance, 0.00)), 0.00)
  INTO v_total_outstanding
  FROM public.customer_accounts;

  -- Total customer credits/advances across all customer accounts:
  -- Sum of customer excess payments/advances.
  SELECT COALESCE(SUM(COALESCE(advance_balance, 0.00)), 0.00)
  INTO v_total_advance
  FROM public.customer_accounts;

  -- Net Receivable: Total Outstanding Dues - Total Customer Advances
  v_net_receivable := v_total_outstanding - v_total_advance;

  -- Total savings held across all active customer savings accounts
  SELECT COALESCE(SUM(savings_balance), 0.00)
  INTO v_total_savings
  FROM public.customer_savings_accounts
  WHERE status = 'active';

  -- Today's savings deposits (strictly excludes OPENING savings)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_savings_deposits
  FROM public.customer_savings_transactions
  WHERE is_deleted = false
    AND transaction_type IN ('CREDIT', 'DEPOSIT')
    AND created_at >= v_today_start;

  -- Today's savings withdrawals (pure cash withdrawals)
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

  -- Net Change Today: Net change in customer outstanding dues today
  v_today_profit := v_today_credit - (v_today_debit + v_today_savings_bill_payments);

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
      le.payment_method,
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
    'total_advance', v_total_advance,
    'net_receivable', v_net_receivable,
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
-- 4. RECOMPUTE ALL EXISTING CUSTOMER BALANCES
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.customers LOOP
    PERFORM public.recalculate_customer_account_balance(r.id);
  END LOOP;
END;
$$;
