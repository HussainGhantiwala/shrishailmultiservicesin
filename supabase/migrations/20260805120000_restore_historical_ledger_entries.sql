-- ==============================================================================
-- Migration: Restore Verified Historical Ledger Entries & Running Balances
-- Description:
-- 1. Updates trg_ledger_sync_balance with pg_trigger_depth recursion guard.
-- 2. Restores the 5 verified legitimate historical ledger entries for Manjunath and
--    Dr Jamadar that were accidentally soft-deleted on 2026-10-06.
--    (Note: 35076221-4553-431c-99e3-46ab5b8745d9 remains soft-deleted as it was an
--    intentionally deleted typo entry from 2026-10-03).
-- 3. Implements recalculate_customer_running_balances to accurately compute
--    chronological running balances per customer on active transactions.
-- 4. Updates recalculate_customer_account_balance to keep running balances and
--    account cache (outstanding_balance and advance_balance) synchronized.
-- 5. Recalculates all customer balances and running balances.
-- 6. Enhances get_ledger_report to support unbounded All Time reporting (safe NULL date handling).
-- ==============================================================================

-- 1. TRIGGER GUARD: Update trg_ledger_sync_balance to prevent trigger recursion
CREATE OR REPLACE FUNCTION public.trg_ledger_sync_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.amount IS NOT DISTINCT FROM NEW.amount AND
            OLD.entry_type IS NOT DISTINCT FROM NEW.entry_type AND
            OLD.is_deleted IS NOT DISTINCT FROM NEW.is_deleted AND
            OLD.customer_id IS NOT DISTINCT FROM NEW.customer_id AND
            OLD.payment_method IS NOT DISTINCT FROM NEW.payment_method) THEN
            RETURN NEW;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        PERFORM public.recalculate_customer_account_balance(OLD.customer_id);
    ELSE
        PERFORM public.recalculate_customer_account_balance(NEW.customer_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. RESTORE VERIFIED HISTORICAL LEDGER ENTRIES
UPDATE public.ledger_entries
SET is_deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = now()
WHERE id IN (
    '974775ad-1e15-4a67-b84d-5abe712cc62f', -- Dr Jamadar: Debit 600.00 (Cash)
    '2f7e6a65-defa-4853-bb5a-3206f7cb887f', -- Manjunath: Credit 1000.00 (Medical emergency)
    'd752747f-688c-44b2-a526-82dcf20faa5f', -- Manjunath: Credit 4300.00 (Urgent for medical)
    'f2485aff-ed90-42a4-a19e-8ccba136ce38', -- Manjunath: Credit 100.00 (Paid light bill as requested by manju)
    '8273ac93-3a6d-451e-9883-ef56cbddef72'  -- Manjunath: Debit 4200.00 (Usane)
);

-- 3. FUNCTION: recalculate_customer_running_balances
-- Computes and stores the chronological running balance for active entries of a customer
CREATE OR REPLACE FUNCTION public.recalculate_customer_running_balances(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
    r RECORD;
    v_running NUMERIC(12, 2) := 0.00;
BEGIN
    FOR r IN (
        SELECT id, entry_type, amount 
        FROM public.ledger_entries 
        WHERE customer_id = p_customer_id AND is_deleted = false 
        ORDER BY created_at ASC, id ASC
    ) LOOP
        IF r.entry_type IN ('credit', 'opening_balance') THEN
            v_running := v_running + r.amount;
        ELSIF r.entry_type = 'debit' THEN
            v_running := v_running - r.amount;
        ELSIF r.entry_type = 'adjustment' THEN
            v_running := v_running + r.amount;
        END IF;

        UPDATE public.ledger_entries
        SET running_balance = v_running
        WHERE id = r.id AND running_balance IS DISTINCT FROM v_running;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. FUNCTION: recalculate_customer_account_balance
-- Authoritative recalculation of customer account and running balances
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
    -- Synchronize running balances on active ledger entries
    PERFORM public.recalculate_customer_running_balances(p_customer_id);

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

-- 5. RECALCULATE ALL EXISTING CUSTOMER ACCOUNTS
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT id FROM public.customers) LOOP
        PERFORM public.recalculate_customer_account_balance(r.id);
    END LOOP;
END;
$$;

-- 6. FUNCTION: get_ledger_report (CANONICAL with robust NULL/All-Time date support)
CREATE OR REPLACE FUNCTION public.get_ledger_report(
    p_start_date DATE DEFAULT NULL, 
    p_end_date DATE DEFAULT NULL,
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
    -- Timestamps boundaries for full-day inclusive filtering.
    -- If p_start_date is NULL, defaults to beginning of time ('1970-01-01').
    -- If p_end_date is NULL, defaults to future ('2099-12-31').
    v_start_ts := CASE 
        WHEN p_start_date IS NOT NULL THEN p_start_date::TIMESTAMPTZ 
        ELSE '1970-01-01 00:00:00+00'::TIMESTAMPTZ 
    END;

    v_end_ts := CASE 
        WHEN p_end_date IS NOT NULL THEN (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ 
        ELSE '2099-12-31 23:59:59+00'::TIMESTAMPTZ 
    END;

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

-- Grant permissions explicitly
GRANT EXECUTE ON FUNCTION public.get_ledger_report(DATE, DATE, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ledger_report(DATE, DATE, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ledger_report(DATE, DATE, UUID, UUID) TO anon;

-- 7. RECORD AUDIT LOG ENTRY
INSERT INTO public.audit_logs (
    action,
    entity_type,
    reason,
    user_name,
    created_at
) VALUES (
    'RESTORE_HISTORICAL_LEDGER_ENTRIES',
    'ledger',
    'Restored 5 verified legitimate historical ledger entries accidentally soft-deleted on 2026-10-06. Recalculated running balances and customer account balances.',
    'System Admin / Restoration Task',
    now()
);
