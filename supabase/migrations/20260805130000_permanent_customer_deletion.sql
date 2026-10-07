-- ==============================================================================
-- Migration: Permanent Customer Deletion RPC Function
-- Description:
-- Provides an atomic, transactional hard-delete operation for customers.
-- Permanently removes:
-- 1. Customer record
-- 2. Customer lending account (customer_accounts)
-- 3. Lending ledger entries (ledger_entries)
-- 4. Customer savings account (customer_savings_accounts)
-- 5. Customer savings transactions (customer_savings_transactions)
-- 6. Payments
-- 7. Disassociates SMS logs (customer_id = NULL)
-- Records an authoritative CUSTOMER_PERMANENT_DELETE audit log before deletion.
-- Strictly Admin-only: validates caller role in profiles.
-- Shared master records (customer_types, settings, other customers) are NOT touched.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_customer_permanently(p_customer_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_caller_name TEXT;
    v_customer RECORD;
    v_account RECORD;
    v_ledger_count INT := 0;
    v_savings_tx_count INT := 0;
    v_payments_count INT := 0;
BEGIN
    v_caller_id := auth.uid();

    -- 1. Validate Caller Authorization (Must be an Admin in public.profiles)
    IF v_caller_id IS NOT NULL THEN
        SELECT role, name INTO v_caller_role, v_caller_name 
        FROM public.profiles 
        WHERE id = v_caller_id;

        IF v_caller_role IS DISTINCT FROM 'admin' THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators are authorized to permanently delete customers.';
        END IF;
    ELSE
        -- Allow backend service_role or superuser
        IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') AND auth.role() != 'service_role' THEN
            RAISE EXCEPTION 'Unauthorized: Missing administrative credentials.';
        END IF;
        v_caller_name := 'System Administrator';
    END IF;

    -- 2. Verify the requested customer exists
    SELECT * INTO v_customer FROM public.customers WHERE id = p_customer_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found with ID %', p_customer_id;
    END IF;

    -- 3. Fetch customer account info for audit and confirmation
    SELECT * INTO v_account FROM public.customer_accounts WHERE customer_id = p_customer_id;

    -- Count dependent records before deletion for the audit trail
    SELECT COUNT(*) INTO v_ledger_count FROM public.ledger_entries WHERE customer_id = p_customer_id;
    SELECT COUNT(*) INTO v_savings_tx_count FROM public.customer_savings_transactions WHERE customer_id = p_customer_id;
    SELECT COUNT(*) INTO v_payments_count FROM public.payments WHERE customer_id = p_customer_id;

    -- 4. Record Audit Log before hard deletion
    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        user_name,
        reason,
        before_state,
        created_at
    ) VALUES (
        'CUSTOMER_PERMANENT_DELETE',
        'customer',
        p_customer_id,
        v_caller_id,
        COALESCE(v_caller_name, 'Admin'),
        'Permanent hard deletion of customer and all customer-owned financial records',
        jsonb_build_object(
            'customer_id', v_customer.id,
            'name', v_customer.name,
            'phone', v_customer.phone,
            'email', v_customer.email,
            'customer_type_id', v_customer.customer_type_id,
            'account_number', v_account.account_number,
            'outstanding_balance', v_account.outstanding_balance,
            'advance_balance', v_account.advance_balance,
            'ledger_entries_deleted', v_ledger_count,
            'savings_transactions_deleted', v_savings_tx_count,
            'payments_deleted', v_payments_count
        ),
        now()
    );

    -- 5. Child-first explicit transactional deletion
    -- a. Lending Ledger Entries
    DELETE FROM public.ledger_entries WHERE customer_id = p_customer_id;

    -- b. Customer Savings Transactions
    DELETE FROM public.customer_savings_transactions WHERE customer_id = p_customer_id;

    -- c. Payments
    DELETE FROM public.payments WHERE customer_id = p_customer_id;

    -- d. Customer Savings Account
    DELETE FROM public.customer_savings_accounts WHERE customer_id = p_customer_id;

    -- e. Customer Lending Account
    DELETE FROM public.customer_accounts WHERE customer_id = p_customer_id;

    -- f. Disassociate SMS logs
    UPDATE public.sms_logs SET customer_id = NULL WHERE customer_id = p_customer_id;

    -- g. Delete Customer Record
    DELETE FROM public.customers WHERE id = p_customer_id;

    -- Return JSON summary
    RETURN json_build_object(
        'success', true,
        'deleted_customer_id', p_customer_id,
        'customer_name', v_customer.name,
        'account_number', v_account.account_number,
        'ledger_entries_deleted', v_ledger_count,
        'savings_transactions_deleted', v_savings_tx_count,
        'payments_deleted', v_payments_count
    );
END;
$$;

-- Explicit Permission Grants
GRANT EXECUTE ON FUNCTION public.delete_customer_permanently(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_customer_permanently(UUID) TO service_role;
REVOKE EXECUTE ON FUNCTION public.delete_customer_permanently(UUID) FROM anon;
