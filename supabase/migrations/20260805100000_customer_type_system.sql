-- ==============================================================================
-- Migration: 20260805100000_customer_type_system.sql
-- Description:
-- 1. Creates public.customer_types master table for categorization of customers
--    (e.g., Farmer, Employee, Business, Regular Customer, Student).
-- 2. Enforces case-insensitive uniqueness and non-empty validation on names.
-- 3. Adds customer_type_id foreign key to public.customers.
-- 4. Enables RLS with Admin-only management and Authenticated read permissions.
-- 5. Enables Supabase Realtime publication on customer_types.
-- 6. Seeds initial canonical customer types safely (ON CONFLICT DO NOTHING).
-- 7. Updates public.get_ledger_report RPC to support optional p_customer_type_id
--    filter for accurate server-side aggregation and reporting.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CREATE MASTER TABLE: customer_types
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT customer_types_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Case-insensitive uniqueness index on trimmed customer type name
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_types_name_unique_lower 
    ON public.customer_types (lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_customer_types_is_active 
    ON public.customer_types (is_active);

CREATE INDEX IF NOT EXISTS idx_customer_types_created_at 
    ON public.customer_types (created_at DESC);

COMMENT ON TABLE public.customer_types IS 'Master table for business customer classifications (e.g. Farmer, Employee, Business)';

-- ------------------------------------------------------------------------------
-- 2. ALTER TABLE: customers (Add customer_type_id foreign key)
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS customer_type_id UUID REFERENCES public.customer_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_customer_type_id
    ON public.customers (customer_type_id);

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) FOR customer_types
-- ------------------------------------------------------------------------------
ALTER TABLE public.customer_types ENABLE ROW LEVEL SECURITY;

-- Drop prior policies if they exist for clean rerun safety
DROP POLICY IF EXISTS "Customer types viewable by authenticated users" ON public.customer_types;
DROP POLICY IF EXISTS "Customer types insertable by admin" ON public.customer_types;
DROP POLICY IF EXISTS "Customer types updateable by admin" ON public.customer_types;
DROP POLICY IF EXISTS "Customer types deleteable by admin" ON public.customer_types;

-- Viewable by authenticated users (admin, staff, customer) for dropdowns and filtering
CREATE POLICY "Customer types viewable by authenticated users"
    ON public.customer_types
    FOR SELECT TO authenticated
    USING (true);

-- Insertable by Admin only
CREATE POLICY "Customer types insertable by admin"
    ON public.customer_types
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_user_role((SELECT auth.uid())) = 'admin'
    );

-- Updateable by Admin only (edit name, description, activate/deactivate)
CREATE POLICY "Customer types updateable by admin"
    ON public.customer_types
    FOR UPDATE TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) = 'admin'
    )
    WITH CHECK (
        public.get_user_role((SELECT auth.uid())) = 'admin'
    );

-- Deleteable by Admin only (soft-deactivation via is_active is preferred in UI)
CREATE POLICY "Customer types deleteable by admin"
    ON public.customer_types
    FOR DELETE TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) = 'admin'
    );

-- ------------------------------------------------------------------------------
-- 4. REALTIME PUBLICATION
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'customer_types'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_types;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. SEED INITIAL CANONICAL CUSTOMER TYPES
-- ------------------------------------------------------------------------------
INSERT INTO public.customer_types (name, description, is_active)
VALUES 
    ('Farmer', 'Agricultural producers, farmers, and farming families', true),
    ('Business', 'Commercial enterprises, local merchants, and contractors', true),
    ('Employee', 'Salaried employees and service professionals', true),
    ('Regular Customer', 'Frequent local walk-in customers and residents', true),
    ('Student', 'Students and educational scheme beneficiaries', true)
ON CONFLICT (lower(trim(name))) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. EXTEND get_ledger_report RPC WITH OPTIONAL p_customer_type_id FILTER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ledger_report(
    p_start_date DATE, 
    p_end_date DATE,
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
    -- Timestamps boundaries for full-day inclusive filtering
    v_start_ts := p_start_date::TIMESTAMPTZ;
    v_end_ts := (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ;

    -- Aggregate totals strictly filtered by customer type when specified
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
    JOIN public.customers c ON c.id = le.customer_id
    WHERE le.is_deleted IS NOT TRUE
      AND le.created_at >= v_start_ts AND le.created_at < v_end_ts
      AND (p_customer_id IS NULL OR le.customer_id = p_customer_id)
      AND (p_customer_type_id IS NULL OR c.customer_type_id = p_customer_type_id);

    v_net_balance := v_total_credit + v_total_adjustment - v_total_debit;

    -- Detailed entries list with customer type joined
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_entries
    FROM (
        SELECT 
            le.*, 
            c.name as customer_name,
            c.phone as customer_phone,
            c.customer_type_id,
            ct.name as customer_type_name,
            ca.account_number
        FROM public.ledger_entries le
        JOIN public.customers c ON c.id = le.customer_id
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
