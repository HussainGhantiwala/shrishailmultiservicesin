-- ==============================================================================
-- Migration: 20260804210000_fix_savings_bill_payment_accounting.sql
-- Description: Fix Savings Bill Payment Accounting, Outstanding Non-Negative Enforcement,
--              and Strict Separation of Cash Payments from Savings Settlements.
--
-- ACCOUNTING LAWS & SPECIFICATIONS:
-- 1. "Savings Used for Bill Payment" is a settlement of customer outstanding dues using
--    their pre-deposited savings vault funds. It is NOT cash received by the business.
-- 2. Today's Payments Received must STRICTLY count cash/bank/UPI payments received today
--    and MUST NEVER include savings bill payments.
-- 3. Bill payment from savings must be capped:
--    Amount <= Customer Savings Balance AND Amount <= Customer Outstanding Balance.
-- 4. Customer outstanding balance can NEVER be negative (minimum 0.00).
-- 5. Exactly ONE savings transaction and ONE corresponding ledger entry (tagged
--    payment_method = 'Customer Savings') are created per atomic settlement.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FUNCTION: recalculate_customer_account_balance
-- Authoritative calculation of lending account balances:
-- - total_paid: ONLY actual cash / bank / UPI payments (excludes 'Customer Savings')
-- - outstanding_balance: strictly non-negative (min 0.00)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_customer_account_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_credit NUMERIC(12, 2) := 0.00;
    v_total_debit NUMERIC(12, 2) := 0.00;
    v_total_paid NUMERIC(12, 2) := 0.00;
    v_total_adjustment NUMERIC(12, 2) := 0.00;
    v_outstanding NUMERIC(12, 2) := 0.00;
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

    v_outstanding := (v_total_credit + v_total_adjustment) - v_total_debit;
    IF v_outstanding < 0 THEN
      v_outstanding := 0.00;
    END IF;

    UPDATE public.customer_accounts
    SET
        total_credit = v_total_credit,
        total_debit = v_total_debit,
        total_paid = v_total_paid,
        outstanding_balance = v_outstanding,
        updated_at = now()
    WHERE customer_id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 2. RPC: pay_customer_bill (ATOMIC BILL PAYMENT & DUES SETTLEMENT)
-- Enforces:
-- - Non-negative outstanding (p_bill_amount <= outstanding_balance)
-- - Non-negative savings (p_bill_amount <= savings_balance)
-- - payment_method = 'Customer Savings' (does not increase cash payments received)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_customer_bill(
  p_customer_id UUID,
  p_bill_amount NUMERIC(12, 2),
  p_description TEXT,
  p_payment_source TEXT, -- 'customer_savings' or 'owner_pocket'
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_savings_acc RECORD;
  v_cust_acc RECORD;
  v_savings_bal NUMERIC(12, 2) := 0.00;
  v_out_bal NUMERIC(12, 2) := 0.00;
  v_final_savings NUMERIC(12, 2) := 0.00;
  v_final_outstanding NUMERIC(12, 2) := 0.00;
  v_savings_tx RECORD;
  v_ledger_tx RECORD;
  v_user_name TEXT := 'Admin';
BEGIN
  IF p_bill_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bill payment amount must be greater than zero');
  END IF;

  IF p_payment_source NOT IN ('customer_savings', 'owner_pocket') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid payment source. Must be customer_savings or owner_pocket');
  END IF;

  -- 1. Ensure and lock customer savings account
  SELECT * INTO v_savings_acc
  FROM public.customer_savings_accounts
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.customer_savings_accounts (customer_id, savings_balance, total_deposited, total_withdrawn, status)
    VALUES (p_customer_id, 0.00, 0.00, 0.00, 'active')
    RETURNING * INTO v_savings_acc;
  END IF;

  v_savings_bal := COALESCE(v_savings_acc.savings_balance, 0.00);

  -- 2. Lock customer lending account
  SELECT * INTO v_cust_acc
  FROM public.customer_accounts
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Customer lending account not found');
  END IF;

  v_out_bal := COALESCE(v_cust_acc.outstanding_balance, 0.00);

  -- Get user name for audit log
  IF p_created_by IS NOT NULL THEN
    SELECT COALESCE(name, 'User') INTO v_user_name
    FROM public.profiles
    WHERE id = p_created_by;
  END IF;

  -- ----------------------------------------------------------------------------
  -- CASE A: PAY FROM CUSTOMER SAVINGS (Settles Outstanding Dues using Savings)
  -- ----------------------------------------------------------------------------
  IF p_payment_source = 'customer_savings' THEN
    -- Rule 1: Customer must have outstanding dues to settle
    IF v_out_bal <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Customer has no pending outstanding dues (₹0.00). There are no dues to pay from savings.'
      );
    END IF;

    -- Rule 2: Cannot pay more than customer's current outstanding dues (TEST E)
    IF p_bill_amount > v_out_bal THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Payment amount of ₹' || p_bill_amount || ' exceeds customer''s current outstanding dues of ₹' || v_out_bal || '. Outstanding balance cannot become negative.'
      );
    END IF;

    -- Rule 3: Cannot pay more than customer's available savings
    IF p_bill_amount > v_savings_bal THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Insufficient savings balance. Available savings: ₹' || v_savings_bal || ', Requested: ₹' || p_bill_amount
      );
    END IF;

    -- Calculate updated balances
    v_final_savings := v_savings_bal - p_bill_amount;
    v_final_outstanding := v_out_bal - p_bill_amount;

    -- Insert EXACTLY ONE savings transaction: BILL_PAYMENT
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
      'BILL_PAYMENT',
      p_bill_amount,
      v_final_savings,
      'Savings Used for Bill Payment: ' || p_description,
      p_reference_number,
      'Customer Savings',
      COALESCE(p_notes, 'Bill paid from customer savings account'),
      p_created_by
    ) RETURNING * INTO v_savings_tx;

    -- Update savings account balance
    UPDATE public.customer_savings_accounts
    SET savings_balance = v_final_savings,
        total_withdrawn = total_withdrawn + p_bill_amount,
        updated_at = now()
    WHERE id = v_savings_acc.id;

    -- Insert EXACTLY ONE ledger entry to reduce customer's outstanding dues
    -- payment_method is STRICTLY 'Customer Savings' (so it is excluded from cash payments received)
    INSERT INTO public.ledger_entries (
      customer_id,
      account_id,
      entry_type,
      amount,
      running_balance,
      description,
      reference_no,
      payment_method,
      notes,
      created_by
    ) VALUES (
      p_customer_id,
      v_cust_acc.id,
      'debit',
      p_bill_amount,
      0.00,
      'Savings Used for Bill Payment: ' || p_description,
      p_reference_number,
      'Customer Savings',
      '[SAVINGS_PAYMENT] Paid using Customer Savings. (Savings: ₹' || v_savings_bal || ' -> ₹' || v_final_savings || ')',
      p_created_by
    ) RETURNING * INTO v_ledger_tx;

    -- Explicitly synchronize lending account balance
    PERFORM public.recalculate_customer_account_balance(p_customer_id);

    SELECT outstanding_balance INTO v_final_outstanding
    FROM public.customer_accounts
    WHERE id = v_cust_acc.id;

    -- Audit Log
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
      'BILL_PAID_FROM_SAVINGS',
      'savings',
      v_savings_tx.id,
      jsonb_build_object(
        'bill_amount', p_bill_amount,
        'paid_from_savings', p_bill_amount,
        'savings_balance', v_final_savings,
        'outstanding_balance', v_final_outstanding,
        'savings_transaction_id', v_savings_tx.id,
        'ledger_entry_id', v_ledger_tx.id,
        'description', p_description
      ),
      'Bill paid using customer savings; outstanding dues settled',
      now()
    );

    RETURN jsonb_build_object(
      'success', true,
      'payment_source', 'customer_savings',
      'bill_amount', p_bill_amount,
      'paid_from_savings', p_bill_amount,
      'remaining_bill', 0.00,
      'savings_balance', v_final_savings,
      'outstanding_balance', v_final_outstanding,
      'savings_transaction_id', v_savings_tx.id,
      'ledger_entry_id', v_ledger_tx.id,
      'transaction_type', 'Savings Used for Bill Payment',
      'message', 'Bill of ₹' || p_bill_amount || ' settled using customer savings'
    );

  -- ----------------------------------------------------------------------------
  -- CASE B: PAY FROM OWNER'S POCKET (Creates New Amount Given / Dues)
  -- ----------------------------------------------------------------------------
  ELSE
    v_final_savings := v_savings_bal;

    -- Add full bill amount to customer's outstanding dues
    INSERT INTO public.ledger_entries (
      customer_id,
      account_id,
      entry_type,
      amount,
      running_balance,
      description,
      reference_no,
      payment_method,
      other_payment_method,
      notes,
      created_by
    ) VALUES (
      p_customer_id,
      v_cust_acc.id,
      'credit',
      p_bill_amount,
      0.00,
      'Bill Paid on Behalf of Customer: ' || p_description,
      p_reference_number,
      'Other',
      'Owner Pocket',
      '[OWNER_POCKET] Full bill ₹' || p_bill_amount || ' paid from owner pocket. Added to outstanding dues.',
      p_created_by
    ) RETURNING * INTO v_ledger_tx;

    PERFORM public.recalculate_customer_account_balance(p_customer_id);

    SELECT outstanding_balance INTO v_final_outstanding
    FROM public.customer_accounts
    WHERE id = v_cust_acc.id;

    -- Audit Log
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
      'BILL_PAID_FROM_OWNER_POCKET',
      'ledger',
      v_ledger_tx.id,
      jsonb_build_object(
        'bill_amount', p_bill_amount,
        'paid_from_savings', 0.00,
        'added_to_dues', p_bill_amount,
        'savings_balance', v_final_savings,
        'outstanding_balance', v_final_outstanding,
        'description', p_description
      ),
      'Bill paid on customer behalf by owner; added to outstanding dues',
      now()
    );

    RETURN jsonb_build_object(
      'success', true,
      'payment_source', 'owner_pocket',
      'bill_amount', p_bill_amount,
      'paid_from_savings', 0.00,
      'remaining_bill', p_bill_amount,
      'savings_balance', v_final_savings,
      'outstanding_balance', v_final_outstanding,
      'savings_transaction_id', null,
      'ledger_entry_id', v_ledger_tx.id,
      'message', 'Bill paid from owner pocket; ₹' || p_bill_amount || ' added to outstanding dues'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 3. RPC: get_dashboard_summary
-- Updated:
-- - today_debit: ONLY cash / bank payments received (excludes 'Customer Savings')
-- - today_savings_bill_payments: strictly tracks savings bill payments
-- - today_profit (Net Change Today): Amount Given - (Cash Payments + Savings Used for Bills)
-- - total_outstanding: non-negative sum
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
  -- Today's credit (Amount Given)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_credit
  FROM public.ledger_entries
  WHERE is_deleted = false
    AND entry_type IN ('credit', 'opening_balance')
    AND created_at >= v_today_start;

  -- Today's debit: ACTUAL cash / bank / UPI payments received ONLY!
  -- STRICTLY EXCLUDES 'Customer Savings' bill settlements!
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_debit
  FROM public.ledger_entries
  WHERE is_deleted = false
    AND entry_type = 'debit'
    AND (payment_method IS NULL OR payment_method != 'Customer Savings')
    AND created_at >= v_today_start;

  -- Total outstanding across all customer accounts (guaranteed non-negative)
  SELECT COALESCE(SUM(GREATEST(outstanding_balance, 0.00)), 0.00)
  INTO v_total_outstanding
  FROM public.customer_accounts;

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
  -- (Amount Given - Cash Payments - Savings Bill Payments)
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
-- 4. DATA REPAIR & CORRECTION BLOCK
-- Cleanse test records and restore all account balances to authoritative non-negative values
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Ensure any ledger entries tagged with savings description have payment_method = 'Customer Savings'
  UPDATE public.ledger_entries
  SET payment_method = 'Customer Savings'
  WHERE is_deleted = false
    AND (
      description ILIKE '%Savings Used for Bill Payment%'
      OR notes ILIKE '%[SAVINGS_PAYMENT]%'
    )
    AND (payment_method IS NULL OR payment_method != 'Customer Savings');

  -- 2. Soft-delete the invalid test entries for customer 'Testing' created during the failed test runs
  UPDATE public.ledger_entries
  SET is_deleted = true,
      deleted_at = now()
  WHERE customer_id = '34f4d964-b8d8-406f-adbf-a1a4814e489d'
    AND is_deleted = false
    AND (
      id IN ('dd2901e4-9836-4c68-b9fd-49b8a583e70f', 'eada52f0-2da7-4318-b1f2-a3953c2e349d', '04f1e018-da7a-4d11-b293-fbe5127d6bec')
      OR description ILIKE '%New Bill%'
    );

  UPDATE public.customer_savings_transactions
  SET is_deleted = true,
      deleted_at = now()
  WHERE customer_id = '34f4d964-b8d8-406f-adbf-a1a4814e489d'
    AND is_deleted = false
    AND id IN ('1f82de84-ab46-473c-b8c5-b9d342b12ddf', '8654de55-5eed-416b-80c2-177349a251f1', '9109eb31-a219-4eef-be72-c3c0104f99f7');

  -- 3. Recalculate ALL customer accounts and savings accounts across the entire system
  FOR r IN SELECT id FROM public.customers LOOP
    PERFORM public.recalculate_customer_account_balance(r.id);
    PERFORM public.recalculate_customer_savings_balance(r.id);
  END LOOP;
END;
$$;
