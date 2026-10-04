-- ==============================================================================
-- Migration: 20260804230000_update_pay_customer_bill_flow.sql
-- Description:
-- 1. Updates pay_customer_bill to support paying new customer bills/expenses directly
--    using customer savings, even when customer has ₹0.00 existing outstanding dues.
-- 2. Financial Rule:
--    - Savings Used = LEAST(Bill Amount, Available Savings)
--    - Remaining Bill = Bill Amount - Savings Used
--    - New Savings = Available Savings - Savings Used
--    - New Outstanding = Existing Outstanding + Remaining Bill
--    - The savings portion is STRICTLY NOT counted as cash received.
--    - The remainder (if any) is an Amount Given (credit) added to Outstanding Dues.
-- 3. Updates get_dashboard_summary to reflect exact Net Change Today:
--    Amount Given (credits) - Cash Payments Received (debits).
-- 4. Updates soft_delete_savings_transaction to handle linked remainder entries.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FUNCTION: pay_customer_bill
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
  v_savings_used NUMERIC(12, 2) := 0.00;
  v_remaining_bill NUMERIC(12, 2) := 0.00;
  v_final_savings NUMERIC(12, 2) := 0.00;
  v_final_outstanding NUMERIC(12, 2) := 0.00;
  v_final_advance NUMERIC(12, 2) := 0.00;
  v_savings_tx RECORD;
  v_ledger_tx RECORD;
  v_user_name TEXT := 'Admin';
  v_savings_tx_id UUID := NULL;
  v_ledger_tx_id UUID := NULL;
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

  -- 2. Ensure and lock customer lending account
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
  -- CASE A: PAY USING CUSTOMER SAVINGS
  -- ----------------------------------------------------------------------------
  IF p_payment_source = 'customer_savings' THEN
    -- Calculate savings used up to available savings
    v_savings_used := LEAST(p_bill_amount, v_savings_bal);
    v_remaining_bill := p_bill_amount - v_savings_used;
    v_final_savings := v_savings_bal - v_savings_used;

    -- 1. Deduct savings_used from customer savings account if > 0
    IF v_savings_used > 0 THEN
      UPDATE public.customer_savings_accounts
      SET savings_balance = v_final_savings,
          total_withdrawn = total_withdrawn + v_savings_used,
          updated_at = now()
      WHERE id = v_savings_acc.id;

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
        v_savings_used,
        v_final_savings,
        'Savings Used for Bill Payment: ' || p_description,
        p_reference_number,
        'Customer Savings',
        COALESCE(p_notes || ' ', '') || '[BILL_PAYMENT] Total Bill: ₹' || p_bill_amount || '. Paid from Savings: ₹' || v_savings_used || '. Remaining added to dues: ₹' || v_remaining_bill || '.',
        p_created_by
      ) RETURNING * INTO v_savings_tx;

      v_savings_tx_id := v_savings_tx.id;
    END IF;

    -- 2. If there is a remaining bill, it was paid from owner's pocket and added to customer outstanding dues
    IF v_remaining_bill > 0 THEN
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
        v_remaining_bill,
        0.00,
        'Bill Payment (Remainder): ' || p_description,
        p_reference_number,
        'Other',
        'Owner Pocket',
        COALESCE(p_notes || ' ', '') || '[BILL_PAYMENT] Total Bill: ₹' || p_bill_amount || '. Paid from Savings: ₹' || v_savings_used || '. Remaining ₹' || v_remaining_bill || ' added to outstanding dues.',
        p_created_by
      ) RETURNING * INTO v_ledger_tx;

      v_ledger_tx_id := v_ledger_tx.id;
    END IF;

    -- Recalculate customer lending balance
    PERFORM public.recalculate_customer_account_balance(p_customer_id);

    SELECT outstanding_balance, COALESCE(advance_balance, 0.00)
    INTO v_final_outstanding, v_final_advance
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
      'PAY_CUSTOMER_BILL_SAVINGS',
      'savings',
      COALESCE(v_savings_tx_id, v_ledger_tx_id, p_customer_id),
      jsonb_build_object(
        'bill_amount', p_bill_amount,
        'paid_from_savings', v_savings_used,
        'remaining_bill', v_remaining_bill,
        'savings_balance', v_final_savings,
        'outstanding_balance', v_final_outstanding,
        'advance_balance', v_final_advance,
        'savings_transaction_id', v_savings_tx_id,
        'ledger_entry_id', v_ledger_tx_id,
        'description', p_description,
        'reference_number', p_reference_number
      ),
      'Customer bill paid: ₹' || v_savings_used || ' from savings, ₹' || v_remaining_bill || ' added to dues',
      now()
    );

    RETURN jsonb_build_object(
      'success', true,
      'payment_source', 'customer_savings',
      'bill_amount', p_bill_amount,
      'paid_from_savings', v_savings_used,
      'remaining_bill', v_remaining_bill,
      'savings_balance', v_final_savings,
      'outstanding_balance', v_final_outstanding,
      'advance_balance', v_final_advance,
      'savings_transaction_id', v_savings_tx_id,
      'ledger_entry_id', v_ledger_tx_id,
      'description', p_description,
      'reference_number', p_reference_number,
      'transaction_type', 'Savings Used for Bill Payment',
      'message', CASE
        WHEN v_remaining_bill = 0.00 THEN
          'Bill of ₹' || p_bill_amount || ' fully covered by customer savings.'
        WHEN v_savings_used > 0.00 THEN
          '₹' || v_savings_used || ' deducted from savings. Remaining ₹' || v_remaining_bill || ' added to customer outstanding dues.'
        ELSE
          'Customer has no savings. Full bill of ₹' || p_bill_amount || ' added to customer outstanding dues.'
      END
    );

  -- ----------------------------------------------------------------------------
  -- CASE B: PAY FROM OWNER'S POCKET (Savings Untouched, Full Bill Added to Dues)
  -- ----------------------------------------------------------------------------
  ELSE
    v_savings_used := 0.00;
    v_remaining_bill := p_bill_amount;
    v_final_savings := v_savings_bal;

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
      COALESCE(p_notes || ' ', '') || '[OWNER_POCKET] Full bill ₹' || p_bill_amount || ' paid from owner pocket. Added to outstanding dues.',
      p_created_by
    ) RETURNING * INTO v_ledger_tx;

    v_ledger_tx_id := v_ledger_tx.id;

    PERFORM public.recalculate_customer_account_balance(p_customer_id);

    SELECT outstanding_balance, COALESCE(advance_balance, 0.00)
    INTO v_final_outstanding, v_final_advance
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
      'PAY_CUSTOMER_BILL_OWNER_POCKET',
      'ledger',
      v_ledger_tx.id,
      jsonb_build_object(
        'bill_amount', p_bill_amount,
        'paid_from_savings', 0.00,
        'remaining_bill', p_bill_amount,
        'savings_balance', v_final_savings,
        'outstanding_balance', v_final_outstanding,
        'advance_balance', v_final_advance,
        'ledger_entry_id', v_ledger_tx.id,
        'description', p_description,
        'reference_number', p_reference_number
      ),
      'Bill paid from owner pocket; full amount added to customer outstanding dues',
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
      'advance_balance', v_final_advance,
      'savings_transaction_id', NULL,
      'ledger_entry_id', v_ledger_tx.id,
      'description', p_description,
      'reference_number', p_reference_number,
      'transaction_type', 'Bill Paid (Owner Pocket)',
      'message', 'Full bill of ₹' || p_bill_amount || ' paid from owner pocket and added to customer outstanding dues.'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 2. FUNCTION: soft_delete_savings_transaction
-- Handles unlinking and restoring both savings account and any linked remainder
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.soft_delete_savings_transaction(
  p_transaction_id UUID,
  p_deleted_by UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_tx RECORD;
  v_user_name TEXT := 'Admin';
BEGIN
  SELECT * INTO v_tx
  FROM public.customer_savings_transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Savings transaction not found');
  END IF;

  IF v_tx.is_deleted = true THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transaction is already deleted');
  END IF;

  IF p_deleted_by IS NOT NULL THEN
    SELECT COALESCE(name, 'User') INTO v_user_name
    FROM public.profiles
    WHERE id = p_deleted_by;
  END IF;

  -- Mark transaction as deleted
  UPDATE public.customer_savings_transactions
  SET is_deleted = true,
      deleted_at = now(),
      deleted_by = p_deleted_by
  WHERE id = p_transaction_id;

  -- Rebalance customer savings account
  PERFORM public.recalculate_customer_savings_balance(v_tx.customer_id);

  -- If this was a BILL_PAYMENT, find any matching remainder ledger_entry created at the same time and soft-delete it too
  IF v_tx.transaction_type = 'BILL_PAYMENT' THEN
    UPDATE public.ledger_entries
    SET is_deleted = true,
        deleted_at = now(),
        deleted_by = p_deleted_by
    WHERE customer_id = v_tx.customer_id
      AND is_deleted = false
      AND (
        (reference_no IS NOT NULL AND reference_no = v_tx.reference_number)
        OR notes ILIKE '%[BILL_PAYMENT]%'
        OR notes ILIKE '%[SAVINGS_PAYMENT]%'
      )
      AND abs(extract(epoch from (created_at - v_tx.created_at))) < 10;

    PERFORM public.recalculate_customer_account_balance(v_tx.customer_id);
  END IF;

  -- Log audit
  INSERT INTO public.audit_logs (
    user_id,
    user_name,
    action,
    entity_type,
    entity_id,
    before_state,
    reason,
    created_at
  ) VALUES (
    p_deleted_by,
    v_user_name,
    'SOFT_DELETE_SAVINGS_TRANSACTION',
    'savings',
    p_transaction_id,
    to_jsonb(v_tx),
    COALESCE(p_reason, 'Savings transaction soft deleted'),
    now()
  );

  RETURN jsonb_build_object('success', true, 'message', 'Savings transaction soft deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 3. RPC: get_dashboard_summary
-- Ensures Net Change Today = Amount Given (credits) - Cash Payments Received (debits)
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
  -- Today's credit (Amount Given / New Lending Created)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_credit
  FROM public.ledger_entries
  WHERE is_deleted = false
    AND entry_type IN ('credit', 'opening_balance')
    AND created_at >= v_today_start;

  -- Today's debit: ACTUAL cash / bank / UPI payments received ONLY!
  -- Excludes customer savings settlements
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
  -- Amount Given - Payments Received
  v_today_profit := v_today_credit - v_today_debit;

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
