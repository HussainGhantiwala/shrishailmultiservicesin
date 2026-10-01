-- Migration: Fix Ledger Notification Trigger Column Mismatch
-- Description: Fix INSERT statement in trg_notify_ledger_change() where created_at expression was missing in SELECT query.

CREATE OR REPLACE FUNCTION public.trg_notify_ledger_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cust_name TEXT;
    v_action_title TEXT;
    v_msg TEXT;
    v_type_label TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT name INTO v_cust_name FROM public.customers WHERE id = NEW.customer_id;
        v_type_label := CASE 
            WHEN NEW.entry_type IN ('credit', 'opening_balance') THEN 'Amount Given (+)'
            WHEN NEW.entry_type = 'debit' THEN 'Payment Received (-)'
            ELSE 'Adjustment'
        END;
        
        v_action_title := 'New Ledger Entry Recorded';
        v_msg := format('%s of ₹%s for %s (%s)', v_type_label, NEW.amount, COALESCE(v_cust_name, 'Customer'), COALESCE(NEW.description, ''));
        
        PERFORM public.broadcast_notification(v_action_title, v_msg, 'ledger', 'info', NEW.id);

        -- Also notify customer if user_id exists (9 target columns, 9 SELECT expressions including NOW())
        IF EXISTS (SELECT 1 FROM public.customers WHERE id = NEW.customer_id AND user_id IS NOT NULL) THEN
            INSERT INTO public.notifications (id, user_id, title, message, is_read, type, severity, reference_id, created_at)
            SELECT gen_random_uuid(), user_id, v_action_title, v_msg, FALSE, 'ledger', 'info', NEW.id, NOW()
            FROM public.customers WHERE id = NEW.customer_id AND user_id IS NOT NULL;
        END IF;

    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) THEN
            SELECT name INTO v_cust_name FROM public.customers WHERE id = NEW.customer_id;
            v_action_title := 'Ledger Entry Deleted';
            v_msg := format('Entry #%s for %s of ₹%s was deleted', substring(NEW.id::text from 1 for 8), COALESCE(v_cust_name, 'Customer'), NEW.amount);
            PERFORM public.broadcast_notification(v_action_title, v_msg, 'ledger', 'warning', NEW.id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ledger_notify ON public.ledger_entries;
CREATE TRIGGER trg_ledger_notify
    AFTER INSERT OR UPDATE ON public.ledger_entries
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_ledger_change();
