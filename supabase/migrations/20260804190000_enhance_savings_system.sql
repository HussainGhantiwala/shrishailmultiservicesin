-- ==============================================================================
-- Migration: 20260804190000_enhance_savings_system.sql
-- Description: Complete Customer Savings System Enhancements
-- 
-- KEY DELIVERABLES:
-- 1. Support explicit savings transaction types: 'DEPOSIT', 'WITHDRAWAL', 'BILL_PAYMENT'
--    alongside backward-compatible 'OPENING', 'CREDIT', 'DEBIT', 'ADJUSTMENT'.
-- 2. Enhance pay_customer_bill RPC: Atomically record both savings deduction AND
--    the corresponding ledger entry (debit) to reduce outstanding dues by the exact
--    bill payment amount without affecting Cash/Bank.
-- 3. Enhance record_savings_transaction RPC: Standalone savings deposits & withdrawals
--    with strict validation (withdrawal <= savings balance, non-negative enforcement).
-- 4. Automatic balance recalculation trigger on customer_savings_transactions mutations.
-- 5. Comprehensive dashboard summary including today's savings metrics.
-- 6. Dedicated savings analytics RPC (monthly trend, top savers, bill usage).
-- 7. Soft delete RPC for savings transactions with automatic cascade to ledger entries.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. UPDATE CHECK CONSTRAINT ON customer_savings_transactions.transaction_type
-- ------------------------------------------------------------------------------
ALTER TABLE public.customer_savings_transactions
  DROP CONSTRAINT IF EXISTS customer_savings_transactions_transaction_type_check;

ALTER TABLE public.customer_savings_transactions
  ADD CONSTRAINT customer_savings_transactions_transaction_type_check
  CHECK (transaction_type IN ('OPENING', 'CREDIT', 'DEPOSIT', 'DEBIT', 'WITHDRAWAL', 'BILL_PAYMENT', 'ADJUSTMENT'));

-- Helpful partial index for fast reports & analytics
CREATE INDEX IF NOT EXISTS idx_savings_tx_type_active 
  ON public.customer_savings_transactions (transaction_type, created_at DESC) 
  WHERE is_deleted = false;

-- ------------------------------------------------------------------------------
-- 2. FUNCTION: recalculate_customer_savings_balance
-- Authoritative calculation of customer savings balance from active transactions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_customer_savings_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_dep NUMERIC(12, 2) := 0.00;
  v_total_with NUMERIC(12, 2) := 0.00;
  v_total_adj NUMERIC(12, 2) := 0.00;
  v_final_bal NUMERIC(12, 2) := 0.00;
BEGIN
  -- Total Deposited (OPENING, CREDIT, DEPOSIT)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_total_dep
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND is_deleted = false
    AND transaction_type IN ('OPENING', 'CREDIT', 'DEPOSIT');

  -- Total Withdrawn / Used (DEBIT, WITHDRAWAL, BILL_PAYMENT)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_total_with
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND is_deleted = false
    AND transaction_type IN ('DEBIT', 'WITHDRAWAL', 'BILL_PAYMENT');

  -- Total Adjustment
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_total_adj
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND is_deleted = false
    AND transaction_type = 'ADJUSTMENT';

  v_final_bal := (v_total_dep + v_total_adj) - v_total_with;
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
-- 3. TRIGGER FUNCTION: trg_savings_sync_balance
-- Keep customer_savings_accounts authoritative on any transaction mutation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_savings_sync_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recalculate_customer_savings_balance(OLD.customer_id);
  ELSE
    PERFORM public.recalculate_customer_savings_balance(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_savings_transaction_changed ON public.customer_savings_transactions;
CREATE TRIGGER on_savings_transaction_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_savings_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_savings_sync_balance();

-- ------------------------------------------------------------------------------
-- 4. RPC: record_savings_transaction
-- Supports DEPOSIT, WITHDRAWAL, CREDIT, DEBIT, OPENING, ADJUSTMENT
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

  -- Normalize type
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

  -- Calculate new balance and enforce rules
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

  -- Update savings account totals
  UPDATE public.customer_savings_accounts
  SET savings_balance = v_new_bal,
      total_deposited = CASE 
        WHEN v_tx_type IN ('CREDIT', 'DEPOSIT', 'OPENING') THEN total_deposited + p_amount 
        ELSE total_deposited 
      END,
      total_withdrawn = CASE 
        WHEN v_tx_type IN ('DEBIT', 'WITHDRAWAL', 'BILL_PAYMENT') THEN total_withdrawn + p_amount 
        ELSE total_withdrawn 
      END,
      updated_at = now()
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
-- 5. RPC: pay_customer_bill (ENHANCED ATOMIC BILL PAYMENT)
-- Accounting Effect when paid from savings:
--   Savings: -p_bill_amount
--   Outstanding Dues: -p_bill_amount (via ledger entry debit)
--   Cash/Bank: No change (Payment method: 'Customer Savings')
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
  v_savings_used NUMERIC(12, 2) := 0.00;
  v_remaining_bill NUMERIC(12, 2) := 0.00;
  v_final_savings NUMERIC(12, 2) := 0.00;
  v_final_outstanding NUMERIC(12, 2) := 0.00;
  v_savings_tx RECORD;
  v_ledger_tx RECORD;
  v_user_name TEXT := 'Admin';
BEGIN
  IF p_bill_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bill amount must be greater than zero');
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

  v_savings_bal := v_savings_acc.savings_balance;

  -- 2. Lock customer lending account
  SELECT * INTO v_cust_acc
  FROM public.customer_accounts
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Customer account not found');
  END IF;

  -- Get user name for audit log
  IF p_created_by IS NOT NULL THEN
    SELECT COALESCE(name, 'User') INTO v_user_name
    FROM public.profiles
    WHERE id = p_created_by;
  END IF;

  -- ----------------------------------------------------------------------------
  -- CASE A: PAY FROM CUSTOMER SAVINGS
  -- ----------------------------------------------------------------------------
  IF p_payment_source = 'customer_savings' THEN
    IF v_savings_bal >= p_bill_amount THEN
      -- Subcase A1: Savings is GREATER THAN OR EQUAL TO bill amount
      -- Pay 100% from savings.
      v_savings_used := p_bill_amount;
      v_remaining_bill := 0.00;
      v_final_savings := v_savings_bal - p_bill_amount;

      -- Insert Savings Transaction: BILL_PAYMENT
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
        COALESCE(p_notes, 'Bill paid from customer savings account'),
        p_created_by
      ) RETURNING * INTO v_savings_tx;

      -- Update savings account
      UPDATE public.customer_savings_accounts
      SET savings_balance = v_final_savings,
          total_withdrawn = total_withdrawn + v_savings_used,
          updated_at = now()
      WHERE id = v_savings_acc.id;

      -- Insert into ledger_entries as 'debit' to reduce customer's outstanding dues
      -- Accounting: Outstanding reduced by ₹p_bill_amount. Cash/Bank: NO CHANGE.
      INSERT INTO public.ledger_entries (
        customer_id,
        account_id,
        entry_type,
        amount,
        running_balance,
        description,
        reference_no,
        notes,
        created_by
      ) VALUES (
        p_customer_id,
        v_cust_acc.id,
        'debit',
        v_savings_used,
        0.00,
        'Savings Used for Bill Payment: ' || p_description,
        p_reference_number,
        '[SAVINGS_PAYMENT] Paid using Customer Savings Account. (Savings: ₹' || v_savings_bal || ' -> ₹' || v_final_savings || ')',
        p_created_by
      ) RETURNING * INTO v_ledger_tx;

      -- Query updated authoritative outstanding balance (recalculated by trg_ledger_sync_balance)
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
          'savings_used', v_savings_used,
          'savings_balance', v_final_savings,
          'outstanding_balance', v_final_outstanding,
          'savings_transaction_id', v_savings_tx.id,
          'ledger_entry_id', v_ledger_tx.id,
          'description', p_description
        ),
        'Bill paid in full from customer savings',
        now()
      );

      RETURN jsonb_build_object(
        'success', true,
        'payment_source', 'customer_savings',
        'bill_amount', p_bill_amount,
        'paid_from_savings', v_savings_used,
        'remaining_bill', 0.00,
        'savings_balance', v_final_savings,
        'outstanding_balance', v_final_outstanding,
        'savings_transaction_id', v_savings_tx.id,
        'ledger_entry_id', v_ledger_tx.id,
        'transaction_type', 'Savings Used for Bill Payment',
        'message', 'Bill paid in full from customer savings'
      );

    ELSE
      -- Subcase A2: Savings is LESS THAN bill amount
      -- SPLIT: Use all available savings -> savings becomes 0.
      -- The savings portion reduces dues (debit).
      -- The remaining portion is added to dues (credit).
      v_savings_used := v_savings_bal;
      v_remaining_bill := p_bill_amount - v_savings_used;
      v_final_savings := 0.00;

      -- If any savings was available, record savings BILL_PAYMENT
      IF v_savings_used > 0 THEN
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
          0.00,
          'Savings Used for Bill Payment (Partial): ' || p_description,
          p_reference_number,
          'Customer Savings',
          COALESCE(p_notes, 'Partial payment from savings. Remainder added to outstanding.'),
          p_created_by
        ) RETURNING * INTO v_savings_tx;

        UPDATE public.customer_savings_accounts
        SET savings_balance = 0.00,
            total_withdrawn = total_withdrawn + v_savings_used,
            updated_at = now()
        WHERE id = v_savings_acc.id;

        -- Record debit in ledger_entries for the savings portion
        INSERT INTO public.ledger_entries (
          customer_id,
          account_id,
          entry_type,
          amount,
          running_balance,
          description,
          reference_no,
          notes,
          created_by
        ) VALUES (
          p_customer_id,
          v_cust_acc.id,
          'debit',
          v_savings_used,
          0.00,
          'Savings Used for Bill Payment: ' || p_description,
          p_reference_number,
          '[SAVINGS_PAYMENT] Partial bill payment from customer savings account.',
          p_created_by
        );
      END IF;

      -- Remaining bill added to customer's outstanding dues via credit entry
      INSERT INTO public.ledger_entries (
        customer_id,
        account_id,
        entry_type,
        amount,
        running_balance,
        description,
        reference_no,
        notes,
        created_by
      ) VALUES (
        p_customer_id,
        v_cust_acc.id,
        'credit',
        v_remaining_bill,
        0.00,
        'Unpaid Bill Remainder: ' || p_description,
        p_reference_number,
        '[BILL_SPLIT] Total bill ₹' || p_bill_amount || '. ₹' || v_savings_used || ' paid from savings; ₹' || v_remaining_bill || ' added to outstanding dues.',
        p_created_by
      ) RETURNING * INTO v_ledger_tx;

      -- Read updated authoritative outstanding balance
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
        'BILL_PAID_PARTIAL_SAVINGS_AND_DUE',
        'savings',
        COALESCE(v_savings_tx.id, v_ledger_tx.id),
        jsonb_build_object(
          'bill_amount', p_bill_amount,
          'savings_used', v_savings_used,
          'remaining_bill', v_remaining_bill,
          'savings_balance', 0.00,
          'outstanding_balance', v_final_outstanding,
          'description', p_description
        ),
        'Partial bill payment from savings; remainder added to outstanding dues',
        now()
      );

      RETURN jsonb_build_object(
        'success', true,
        'payment_source', 'customer_savings',
        'bill_amount', p_bill_amount,
        'paid_from_savings', v_savings_used,
        'remaining_bill', v_remaining_bill,
        'savings_balance', 0.00,
        'outstanding_balance', v_final_outstanding,
        'savings_transaction_id', v_savings_tx.id,
        'ledger_entry_id', v_ledger_tx.id,
        'transaction_type', 'Savings Used for Bill Payment',
        'message', 'Paid ₹' || v_savings_used || ' from savings; remainder ₹' || v_remaining_bill || ' added to outstanding'
      );
    END IF;

  -- ----------------------------------------------------------------------------
  -- CASE B: PAY FROM OWNER'S POCKET
  -- ----------------------------------------------------------------------------
  ELSE
    -- Customer savings is untouched
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
      '[OWNER_POCKET] Full bill ₹' || p_bill_amount || ' paid from owner pocket. Added to outstanding dues.',
      p_created_by
    ) RETURNING * INTO v_ledger_tx;

    -- Read updated authoritative outstanding balance
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
-- 6. RPC: get_dashboard_summary (ENHANCED WITH TODAY'S SAVINGS METRICS)
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

  -- Today's savings deposits
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_today_savings_deposits
  FROM public.customer_savings_transactions
  WHERE is_deleted = false
    AND transaction_type IN ('CREDIT', 'DEPOSIT', 'OPENING')
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
-- 7. RPC: get_savings_report (ENHANCED REPORT WITH SPECIFIC SAVINGS TYPES)
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

  -- Total deposited in date range
  SELECT COALESCE(SUM(t.amount), 0.00)
  INTO v_total_dep
  FROM public.customer_savings_transactions t
  WHERE t.is_deleted = false
    AND t.transaction_type IN ('CREDIT', 'DEPOSIT', 'OPENING')
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
-- 8. RPC: get_savings_analytics
-- Dedicated analytics data for the business analytics & growth page
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

  -- Monthly Trend for savings
  SELECT COALESCE(jsonb_agg(m ORDER BY m.month_start ASC), '[]'::jsonb)
  INTO v_months_trend
  FROM (
    SELECT
      to_char(date_trunc('month', d), 'Mon YYYY') AS month,
      date_trunc('month', d) AS month_start,
      COALESCE(SUM(CASE WHEN t.transaction_type IN ('CREDIT', 'DEPOSIT', 'OPENING') THEN t.amount ELSE 0 END), 0.00) AS deposits,
      COALESCE(SUM(CASE WHEN t.transaction_type IN ('DEBIT', 'WITHDRAWAL') THEN t.amount ELSE 0 END), 0.00) AS withdrawals,
      COALESCE(SUM(CASE WHEN t.transaction_type = 'BILL_PAYMENT' THEN t.amount ELSE 0 END), 0.00) AS bill_payments,
      COALESCE(SUM(CASE WHEN t.transaction_type IN ('CREDIT', 'DEPOSIT', 'OPENING') THEN t.amount ELSE -t.amount END), 0.00) AS net_movement
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
-- 9. RPC: soft_delete_savings_transaction
-- Supports soft deletion of savings transactions and reverses balance effects
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

  -- If this was a BILL_PAYMENT, find any matching ledger_entry and soft-delete it too
  IF v_tx.transaction_type = 'BILL_PAYMENT' THEN
    UPDATE public.ledger_entries
    SET is_deleted = true,
        deleted_at = now(),
        deleted_by = p_deleted_by
    WHERE customer_id = v_tx.customer_id
      AND is_deleted = false
      AND (
        reference_no = v_tx.reference_number
        OR notes ILIKE '%[SAVINGS_PAYMENT]%'
      )
      AND amount = v_tx.amount
      AND abs(extract(epoch from (created_at - v_tx.created_at))) < 10;
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
    COALESCE(p_reason, 'Savings transaction soft-deleted'),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Savings transaction soft deleted and balances recalculated'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
