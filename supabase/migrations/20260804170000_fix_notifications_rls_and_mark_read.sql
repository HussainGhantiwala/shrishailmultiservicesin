-- Migration: Fix Notifications RLS and Mark Read Support
-- Description:
-- 1. Adds the missing RLS UPDATE policy on public.notifications allowing authenticated users to update their own notifications.
-- 2. Adds atomic RPC functions: mark_all_notifications_read, mark_notification_read, and get_unread_notification_count.

-- 1. Add missing UPDATE policy for public.notifications
-- Previously, only a SELECT policy existed ("Notifications viewable by recipient").
-- Without an UPDATE policy, PostgreSQL RLS silently prevented users from marking notifications as read (0 rows updated).

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

-- 2. Atomic RPC function: mark_all_notifications_read
-- Updates all unread notifications for the calling user to is_read = TRUE and returns the count of updated rows.
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_rows_updated INTEGER;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    IF v_user_id IS NULL THEN
        RETURN 0;
    END IF;

    UPDATE public.notifications
    SET is_read = TRUE
    WHERE user_id = v_user_id AND is_read = FALSE;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    RETURN COALESCE(v_rows_updated, 0);
END;
$$;

-- 3. Atomic RPC function: mark_notification_read
-- Marks a single notification as read if it belongs to the calling user.
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_rows_updated INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    UPDATE public.notifications
    SET is_read = TRUE
    WHERE id = p_id AND (user_id = v_user_id OR public.get_user_role(v_user_id) IN ('admin', 'staff'));

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    RETURN v_rows_updated > 0;
END;
$$;

-- 4. Atomic RPC function: get_unread_notification_count
-- Accurately calculates the exact unread count (COUNT(*) WHERE is_read = FALSE) for the user.
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_count INTEGER;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    IF v_user_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*)::INTEGER INTO v_count
    FROM public.notifications
    WHERE user_id = v_user_id AND is_read = FALSE;

    RETURN COALESCE(v_count, 0);
END;
$$;

-- 5. Grant execute permissions to authenticated role
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count(UUID) TO authenticated;
