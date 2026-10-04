-- ==============================================================================
-- Migration: 20260804180000_customer_savings_system.sql
-- Description: Independent Customer Savings System
--
-- CORE PRINCIPLES:
-- 1. SAVINGS and LENDING are two completely separate financial systems.
-- 2. Customer savings balance is strictly isolated per customer and NEVER combined
--    with outstanding dues.
-- 3. Savings balance can NEVER be negative (enforced by CHECK constraints and RPCs).
-- 4. Bill payments are atomic database transactions supporting:
--    - Full payment from customer savings (savings deducted, dues unchanged)
--    - Partial payment from customer savings + remainder to outstanding dues
--    - Full payment from owner's pocket (savings untouched, dues increased)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE TABLE: customer_savings_accounts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE UNIQUE,
  savings_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (savings_balance >= 0),
  total_deposited NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_deposited >= 0),
  total_withdrawn NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_withdrawn >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast customer lookups
CREATE INDEX IF NOT EXISTS idx_customer_savings_accounts_customer_id 
  ON public.customer_savings_accounts(customer_id);

-- ------------------------------------------------------------------------------
-- 2. CREATE TABLE: customer_savings_transactions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_savings_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  savings_account_id UUID REFERENCES public.customer_savings_accounts(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('OPENING', 'CREDIT', 'DEBIT', 'ADJUSTMENT')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  balance_after NUMERIC(12, 2) NOT NULL CHECK (balance_after >= 0),
  description TEXT NOT NULL,
  reference_number TEXT,
  payment_method TEXT DEFAULT 'Cash',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for querying transactions
CREATE INDEX IF NOT EXISTS idx_savings_tx_customer_id 
  ON public.customer_savings_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_savings_tx_created_at 
  ON public.customer_savings_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_savings_tx_account_id 
  ON public.customer_savings_transactions(savings_account_id);

-- ------------------------------------------------------------------------------
-- 3. PROVISION SAVINGS ACCOUNTS FOR ALL EXISTING CUSTOMERS
-- ------------------------------------------------------------------------------
INSERT INTO public.customer_savings_accounts (customer_id, savings_balance, total_deposited, total_withdrawn, status)
SELECT id, 0.00, 0.00, 0.00, 'active'
FROM public.customers
ON CONFLICT (customer_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 4. TRIGGER: AUTO-CREATE SAVINGS ACCOUNT ON NEW CUSTOMER REGISTRATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_customer_savings_account()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customer_savings_accounts (customer_id, savings_balance, total_deposited, total_withdrawn, status)
  VALUES (NEW.id, 0.00, 0.00, 0.00, 'active')
  ON CONFLICT (customer_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_customer_created_savings ON public.customers;
CREATE TRIGGER on_customer_created_savings
  AFTER INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer_savings_account();

-- ------------------------------------------------------------------------------
-- 5. FUNCTION: recalculate_customer_savings_balance
-- Recalculates authoritative savings balance from active transactions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_customer_savings_balance(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_dep NUMERIC(12, 2) := 0.00;
  v_total_with NUMERIC(12, 2) := 0.00;
  v_total_adj NUMERIC(12, 2) := 0.00;
  v_final_bal NUMERIC(12, 2) := 0.00;
BEGIN
  -- Total Deposited (OPENING + CREDIT)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_total_dep
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND is_deleted = false
    AND transaction_type IN ('OPENING', 'CREDIT');

  -- Total Withdrawn (DEBIT)
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_total_with
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND is_deleted = false
    AND transaction_type = 'DEBIT';

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
-- 6. RPC: record_customer_opening_savings
-- Atomically creates an opening savings balance record for a new/existing customer
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
  v_user_name TEXT := 'Admin';
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Opening savings amount must be greater than zero');
  END IF;

  -- Ensure savings account exists
  SELECT * INTO v_savings_acc
  FROM public.customer_savings_accounts
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.customer_savings_accounts (customer_id, savings_balance, total_deposited, total_withdrawn, status)
    VALUES (p_customer_id, 0.00, 0.00, 0.00, 'active')
    RETURNING * INTO v_savings_acc;
  END IF;

  -- Check if opening savings already recorded
  SELECT COUNT(*) INTO v_existing_opening
  FROM public.customer_savings_transactions
  WHERE customer_id = p_customer_id
    AND transaction_type = 'OPENING'
    AND is_deleted = false;

  IF v_existing_opening > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Customer already has an active opening savings balance');
  END IF;

  -- Get user name for audit
  IF p_created_by IS NOT NULL THEN
    SELECT COALESCE(name, 'User') INTO v_user_name
    FROM public.profiles
    WHERE id = p_created_by;
  END IF;

  -- Insert OPENING savings transaction
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
    v_savings_acc.savings_balance + p_amount,
    'Initial Opening Savings Balance',
    'INIT/SAVINGS',
    'Cash',
    COALESCE(p_notes, 'Initial opening savings balance recorded at registration'),
    p_created_by
  ) RETURNING * INTO v_new_tx;

  -- Update savings account
  UPDATE public.customer_savings_accounts
  SET savings_balance = savings_balance + p_amount,
      total_deposited = total_deposited + p_amount,
      updated_at = now()
  WHERE id = v_savings_acc.id;

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
    'savings_balance', v_savings_acc.savings_balance + p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 7. RPC: record_savings_transaction
-- Atomically deposits or debits savings
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
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Amount must be greater than zero');
  END IF;

  IF p_transaction_type NOT IN ('CREDIT', 'DEBIT', 'ADJUSTMENT', 'OPENING') THEN
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

  -- Calculate new balance
  IF p_transaction_type IN ('CREDIT', 'OPENING') THEN
    v_new_bal := v_savings_acc.savings_balance + p_amount;
  ELSIF p_transaction_type = 'DEBIT' THEN
    IF v_savings_acc.savings_balance < p_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Insufficient savings balance. Available: ₹' || v_savings_acc.savings_balance || ', Requested: ₹' || p_amount
      );
    END IF;
    v_new_bal := v_savings_acc.savings_balance - p_amount;
  ELSIF p_transaction_type = 'ADJUSTMENT' THEN
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
    p_transaction_type,
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
        WHEN p_transaction_type IN ('CREDIT', 'OPENING') THEN total_deposited + p_amount 
        ELSE total_deposited 
      END,
      total_withdrawn = CASE 
        WHEN p_transaction_type = 'DEBIT' THEN total_withdrawn + p_amount 
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
    'RECORD_SAVINGS_' || p_transaction_type,
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
-- 8. RPC: pay_customer_bill (THE CRITICAL ATOMIC BILL PAYMENT OPERATION)
-- Supports:
--   Option 1 & 2: Full payment from customer savings (savings >= bill)
--   Option 3: Partial payment from customer savings (savings < bill) -> split!
--   Option 4: Payment from owner's pocket -> savings untouched, full amount to dues
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
      -- Pay 100% from savings. Outstanding remains UNCHANGED.
      v_savings_used := p_bill_amount;
      v_remaining_bill := 0.00;
      v_final_savings := v_savings_bal - p_bill_amount;

      -- Insert Savings DEBIT
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
        'DEBIT',
        v_savings_used,
        v_final_savings,
        p_description,
        p_reference_number,
        'Savings Deduction',
        COALESCE(p_notes, 'Customer bill paid from savings'),
        p_created_by
      ) RETURNING * INTO v_savings_tx;

      -- Update savings account
      UPDATE public.customer_savings_accounts
      SET savings_balance = v_final_savings,
          total_withdrawn = total_withdrawn + v_savings_used,
          updated_at = now()
      WHERE id = v_savings_acc.id;

      -- Outstanding remains unchanged
      v_final_outstanding := COALESCE(v_cust_acc.outstanding_balance, 0.00);

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
          'description', p_description
        ),
        'Bill paid entirely from customer savings',
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
        'ledger_entry_id', null,
        'message', 'Bill paid in full from customer savings'
      );

    ELSE
      -- Subcase A2: Savings is LESS THAN bill amount
      -- SPLIT: Use all available savings -> savings becomes 0.
      -- The remaining bill is added to customer's outstanding dues via existing lending system!
      v_savings_used := v_savings_bal;
      v_remaining_bill := p_bill_amount - v_savings_used;
      v_final_savings := 0.00;

      -- If any savings was available, record savings DEBIT
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
          'DEBIT',
          v_savings_used,
          0.00,
          p_description || ' (Paid from savings)',
          p_reference_number,
          'Savings Deduction',
          COALESCE(p_notes, 'Partial bill paid from savings; remainder added to dues'),
          p_created_by
        ) RETURNING * INTO v_savings_tx;

        -- Update savings account to 0
        UPDATE public.customer_savings_accounts
        SET savings_balance = 0.00,
            total_withdrawn = total_withdrawn + v_savings_used,
            updated_at = now()
        WHERE id = v_savings_acc.id;
      END IF;

      -- Add remaining bill to existing lending ledger entries ('credit' increases customer dues)
      INSERT INTO public.ledger_entries (
        customer_id,
        account_id,
        entry_type,
        amount,
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
        p_description || ' (Remaining bill after savings)',
        p_reference_number,
        'Other',
        'Bill Payment Remainder',
        COALESCE(p_notes, 'Remaining bill amount added to dues after exhausting savings balance'),
        p_created_by
      ) RETURNING * INTO v_ledger_tx;

      -- The existing trg_ledger_sync_balance trigger will recalculate customer_accounts,
      -- but let's query the updated outstanding balance directly to be 100% authoritative:
      SELECT outstanding_balance INTO v_final_outstanding
      FROM public.customer_accounts
      WHERE customer_id = p_customer_id;

      -- Fallback if trigger didn't fire synchronously
      IF v_final_outstanding IS NULL THEN
        v_final_outstanding := COALESCE(v_cust_acc.outstanding_balance, 0.00) + v_remaining_bill;
      END IF;

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
        'bill_payment',
        COALESCE(v_ledger_tx.id, v_savings_tx.id),
        jsonb_build_object(
          'bill_amount', p_bill_amount,
          'paid_from_savings', v_savings_used,
          'remaining_bill', v_remaining_bill,
          'savings_balance', 0.00,
          'outstanding_balance', v_final_outstanding,
          'description', p_description
        ),
        'Bill partially paid from savings; remainder added to outstanding dues',
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
        'message', 'Bill partially paid from savings; remainder added to outstanding dues'
      );
    END IF;

  -- ----------------------------------------------------------------------------
  -- CASE B: PAY FROM OWNER'S POCKET
  -- ----------------------------------------------------------------------------
  ELSIF p_payment_source = 'owner_pocket' THEN
    -- Savings remains COMPLETELY UNTOUCHED!
    -- Full bill amount added to existing lending ledger entries as 'credit' (increased dues)
    v_savings_used := 0.00;
    v_remaining_bill := p_bill_amount;
    v_final_savings := v_savings_bal;

    INSERT INTO public.ledger_entries (
      customer_id,
      account_id,
      entry_type,
      amount,
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
      p_description || ' (Paid from Owner Pocket)',
      p_reference_number,
      'Other',
      'Owner Pocket',
      COALESCE(p_notes, 'Bill paid from owner pocket on behalf of customer'),
      p_created_by
    ) RETURNING * INTO v_ledger_tx;

    -- Query authoritative updated balance from customer_accounts
    SELECT outstanding_balance INTO v_final_outstanding
    FROM public.customer_accounts
    WHERE customer_id = p_customer_id;

    IF v_final_outstanding IS NULL THEN
      v_final_outstanding := COALESCE(v_cust_acc.outstanding_balance, 0.00) + p_bill_amount;
    END IF;

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
        'remaining_bill', p_bill_amount,
        'savings_balance', v_final_savings,
        'outstanding_balance', v_final_outstanding,
        'description', p_description
      ),
      'Bill paid from owner pocket; amount added to outstanding dues',
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
      'message', 'Bill paid from owner pocket; full amount added to customer outstanding dues'
    );
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 9. RPC: get_total_savings
-- Returns the global sum of active customer savings balances
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_total_savings()
RETURNS NUMERIC(12, 2) AS $$
DECLARE
  v_total NUMERIC(12, 2);
BEGIN
  SELECT COALESCE(SUM(savings_balance), 0.00)
  INTO v_total
  FROM public.customer_savings_accounts
  WHERE status = 'active';

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 10. RPC: get_savings_report
-- Dedicated report for customer savings
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
  v_cust_count INT := 0;
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
  INTO v_cust_count
  FROM public.customer_savings_accounts
  WHERE savings_balance > 0 AND status = 'active';

  -- Total deposited in date range
  SELECT COALESCE(SUM(t.amount), 0.00)
  INTO v_total_dep
  FROM public.customer_savings_transactions t
  WHERE t.is_deleted = false
    AND t.transaction_type IN ('CREDIT', 'OPENING')
    AND t.created_at >= v_start_ts
    AND t.created_at <= v_end_ts
    AND (p_customer_id IS NULL OR t.customer_id = p_customer_id);

  -- Total withdrawn/debited in date range
  SELECT COALESCE(SUM(t.amount), 0.00)
  INTO v_total_with
  FROM public.customer_savings_transactions t
  WHERE t.is_deleted = false
    AND t.transaction_type = 'DEBIT'
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
      'created_at', t.created_at
    ) ORDER BY t.created_at DESC
  ), '[]'::jsonb)
  INTO v_entries
  FROM public.customer_savings_transactions t
  JOIN public.customers c ON c.id = t.customer_id
  WHERE t.is_deleted = false
    AND t.created_at >= v_start_ts
    AND t.created_at <= v_end_ts
    AND (p_customer_id IS NULL OR t.customer_id = p_customer_id);

  v_tx_count := jsonb_array_length(v_entries);

  RETURN jsonb_build_object(
    'total_savings_held', v_total_held,
    'total_deposited', v_total_dep,
    'total_withdrawn', v_total_with,
    'customers_with_savings', v_cust_count,
    'transaction_count', v_tx_count,
    'transactions', v_entries
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 11. UPDATE get_dashboard_summary to include total_savings
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', now());
  v_today_end TIMESTAMPTZ := date_trunc('day', now()) + INTERVAL '1 day';
  v_today_credit NUMERIC(12, 2) := 0;
  v_today_debit NUMERIC(12, 2) := 0;
  v_today_profit NUMERIC(12, 2) := 0;
  v_total_outstanding NUMERIC(12, 2) := 0;
  v_total_savings NUMERIC(12, 2) := 0;
  v_total_customers INT := 0;
  v_active_customers INT := 0;
  v_pending_customers INT := 0;
  v_blocked_customers INT := 0;
  v_today_new_registrations INT := 0;
  v_recent_entries JSON := '[]'::JSON;
BEGIN
  -- Today's credit (goods/credit given)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_today_credit
  FROM public.ledger_entries
  WHERE is_deleted = false
    AND entry_type IN ('credit', 'opening_balance')
    AND created_at >= v_today_start
    AND created_at < v_today_end;

  -- Today's debit (payments received)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_today_debit
  FROM public.ledger_entries
  WHERE is_deleted = false
    AND entry_type = 'debit'
    AND created_at >= v_today_start
    AND created_at < v_today_end;

  v_today_profit := v_today_credit - v_today_debit;

  -- Total outstanding balance from all accounts
  SELECT COALESCE(SUM(outstanding_balance), 0)
  INTO v_total_outstanding
  FROM public.customer_accounts;

  -- NEW: Total savings from all active customer savings accounts
  SELECT COALESCE(SUM(savings_balance), 0)
  INTO v_total_savings
  FROM public.customer_savings_accounts
  WHERE status = 'active';

  -- Customer counts
  SELECT COUNT(*) INTO v_total_customers FROM public.customers;
  SELECT COUNT(*) INTO v_active_customers FROM public.customers WHERE status = 'active';
  SELECT COUNT(*) INTO v_pending_customers FROM public.customers WHERE status = 'pending_approval';
  SELECT COUNT(*) INTO v_blocked_customers FROM public.customers WHERE status = 'blocked';

  -- Registrations today
  SELECT COUNT(*)
  INTO v_today_new_registrations
  FROM public.customers
  WHERE created_at >= v_today_start
    AND created_at < v_today_end;

  -- Last 10 ledger entries
  SELECT json_agg(t)
  INTO v_recent_entries
  FROM (
    SELECT
      l.id,
      l.customer_id,
      l.entry_type,
      l.amount,
      l.description,
      l.reference_no,
      l.created_at,
      c.name AS customer_name
    FROM public.ledger_entries l
    LEFT JOIN public.customers c ON l.customer_id = c.id
    WHERE l.is_deleted = false
    ORDER BY l.created_at DESC
    LIMIT 10
  ) t;

  RETURN json_build_object(
    'today_credit', v_today_credit,
    'today_debit', v_today_debit,
    'today_profit', v_today_profit,
    'total_outstanding', v_total_outstanding,
    'total_savings', v_total_savings,
    'total_customers', v_total_customers,
    'active_customers', v_active_customers,
    'pending_customers', v_pending_customers,
    'blocked_customers', v_blocked_customers,
    'today_new_registrations', v_today_new_registrations,
    'recent_entries', COALESCE(v_recent_entries, '[]'::JSON)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.customer_savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_savings_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for customer_savings_accounts
DROP POLICY IF EXISTS "savings_acc_select_policy" ON public.customer_savings_accounts;
CREATE POLICY "savings_acc_select_policy" ON public.customer_savings_accounts
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    OR customer_id IN (SELECT id FROM public.customers WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "savings_acc_insert_policy" ON public.customer_savings_accounts;
CREATE POLICY "savings_acc_insert_policy" ON public.customer_savings_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff'));

DROP POLICY IF EXISTS "savings_acc_update_policy" ON public.customer_savings_accounts;
CREATE POLICY "savings_acc_update_policy" ON public.customer_savings_accounts
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff'))
  WITH CHECK (public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff'));

DROP POLICY IF EXISTS "savings_acc_delete_policy" ON public.customer_savings_accounts;
CREATE POLICY "savings_acc_delete_policy" ON public.customer_savings_accounts
  FOR DELETE
  TO authenticated
  USING (public.get_user_role((SELECT auth.uid())) = 'admin');

-- Policies for customer_savings_transactions
DROP POLICY IF EXISTS "savings_tx_select_policy" ON public.customer_savings_transactions;
CREATE POLICY "savings_tx_select_policy" ON public.customer_savings_transactions
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    OR customer_id IN (SELECT id FROM public.customers WHERE user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "savings_tx_insert_policy" ON public.customer_savings_transactions;
CREATE POLICY "savings_tx_insert_policy" ON public.customer_savings_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff'));

DROP POLICY IF EXISTS "savings_tx_update_policy" ON public.customer_savings_transactions;
CREATE POLICY "savings_tx_update_policy" ON public.customer_savings_transactions
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff'))
  WITH CHECK (public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff'));

DROP POLICY IF EXISTS "savings_tx_delete_policy" ON public.customer_savings_transactions;
CREATE POLICY "savings_tx_delete_policy" ON public.customer_savings_transactions
  FOR DELETE
  TO authenticated
  USING (public.get_user_role((SELECT auth.uid())) = 'admin');

-- ------------------------------------------------------------------------------
-- 13. ENABLE SUPABASE REALTIME ON SAVINGS TABLES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'customer_savings_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_savings_accounts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'customer_savings_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_savings_transactions;
  END IF;
END $$;
