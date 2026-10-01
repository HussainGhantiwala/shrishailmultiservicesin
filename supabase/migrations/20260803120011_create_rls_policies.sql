-- Migration: Create RLS Policies
-- Description: Enable Row Level Security and define access policies for Admin, Staff, and Customer roles

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------
CREATE POLICY "Profiles viewable by self or admin/staff" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        (SELECT auth.uid()) = id
        OR public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    );

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

-- ------------------------------------------------------------
-- CUSTOMERS POLICIES
-- ------------------------------------------------------------
CREATE POLICY "Customers viewable by staff/admin or self" ON public.customers
    FOR SELECT TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
        OR user_id = (SELECT auth.uid())
    );

CREATE POLICY "Customers insertable by staff/admin" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    );

CREATE POLICY "Customers updateable by staff/admin" ON public.customers
    FOR UPDATE TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    )
    WITH CHECK (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    );

CREATE POLICY "Customers deleteable by admin only" ON public.customers
    FOR DELETE TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) = 'admin'
    );

-- ------------------------------------------------------------
-- CUSTOMER ACCOUNTS POLICIES
-- ------------------------------------------------------------
CREATE POLICY "Customer Accounts viewable by staff/admin or owner" ON public.customer_accounts
    FOR SELECT TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
        OR customer_id IN (SELECT id FROM public.customers WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "Customer Accounts updateable by staff/admin" ON public.customer_accounts
    FOR UPDATE TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    )
    WITH CHECK (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    );

-- ------------------------------------------------------------
-- LEDGER ENTRIES POLICIES
-- ------------------------------------------------------------
CREATE POLICY "Ledger entries viewable by staff/admin or customer owner" ON public.ledger_entries
    FOR SELECT TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
        OR customer_id IN (SELECT id FROM public.customers WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "Ledger entries insertable by staff/admin" ON public.ledger_entries
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    );

CREATE POLICY "Ledger entries updateable by staff/admin" ON public.ledger_entries
    FOR UPDATE TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    )
    WITH CHECK (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    );

CREATE POLICY "Ledger entries deleteable by admin only" ON public.ledger_entries
    FOR DELETE TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) = 'admin'
    );

-- ------------------------------------------------------------
-- PAYMENTS POLICIES
-- ------------------------------------------------------------
CREATE POLICY "Payments viewable by staff/admin or owner" ON public.payments
    FOR SELECT TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
        OR customer_id IN (SELECT id FROM public.customers WHERE user_id = (SELECT auth.uid()))
    );

CREATE POLICY "Payments insertable by staff/admin" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    );

-- ------------------------------------------------------------
-- SMS LOGS & NOTIFICATIONS POLICIES
-- ------------------------------------------------------------
CREATE POLICY "SMS logs viewable by staff/admin" ON public.sms_logs
    FOR SELECT TO authenticated
    USING (
        public.get_user_role((SELECT auth.uid())) IN ('admin', 'staff')
    );

CREATE POLICY "Notifications viewable by recipient" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid())
    );

-- ------------------------------------------------------------
-- SETTINGS & AUDIT LOGS POLICIES (Admin Only)
-- ------------------------------------------------------------
CREATE POLICY "Settings manageable by admin" ON public.settings
    FOR ALL TO authenticated
    USING (public.get_user_role((SELECT auth.uid())) = 'admin');

CREATE POLICY "Audit logs manageable by admin" ON public.audit_logs
    FOR ALL TO authenticated
    USING (public.get_user_role((SELECT auth.uid())) = 'admin');
