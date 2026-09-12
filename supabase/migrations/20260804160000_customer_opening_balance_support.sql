-- Migration: Customer Opening Balance Support & Idempotency
-- Description: Enforces at database level that each customer can have at most one active opening balance entry,
-- and provides an atomic RPC function record_customer_opening_balance.

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_opening_balance 
ON public.ledger_entries(customer_id) 
WHERE entry_type = 'opening_balance' AND is_deleted = false;

CREATE OR REPLACE FUNCTION public.record_customer_opening_balance(
    p_customer_id UUID,
    p_amount NUMERIC(12, 2),
    p_notes TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_account_id UUID;
    v_entry_id UUID;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opening balance amount must be greater than zero');
    END IF;

    -- Ensure customer exists
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_customer_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Customer does not exist');
    END IF;

    -- Prevent duplicate active opening balance
    IF EXISTS (
        SELECT 1 FROM public.ledger_entries 
        WHERE customer_id = p_customer_id 
          AND entry_type = 'opening_balance' 
          AND is_deleted = false
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Opening balance already exists for this customer');
    END IF;

    -- Fetch customer account ID
    SELECT id INTO v_account_id FROM public.customer_accounts WHERE customer_id = p_customer_id;

    -- Insert opening balance ledger entry
    -- Triggers on ledger_entries (trg_ledger_sync_balance & trg_notify_ledger_change) will automatically:
    -- 1. Recalculate customer_accounts.outstanding_balance and total_credit
    -- 2. Broadcast notification to admin and customer
    INSERT INTO public.ledger_entries (
        customer_id,
        account_id,
        entry_type,
        amount,
        description,
        reference_no,
        notes,
        created_by
    )
    VALUES (
        p_customer_id,
        v_account_id,
        'opening_balance',
        p_amount,
        'Initial Opening Balance',
        'INIT/OPENING',
        COALESCE(p_notes, 'Initial opening balance recorded at customer registration'),
        p_created_by
    )
    RETURNING id INTO v_entry_id;

    -- Record audit log
    INSERT INTO public.audit_logs (
        user_id,
        user_name,
        action,
        entity_type,
        entity_id,
        reason,
        created_at
    )
    VALUES (
        p_created_by,
        'Administrator',
        'CREATE_LEDGER_ENTRY',
        'ledger',
        v_entry_id,
        'Customer registration opening balance',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true, 
        'entry_id', v_entry_id,
        'customer_id', p_customer_id,
        'amount', p_amount
    );
END;
$$;
