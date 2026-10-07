-- ==============================================================================
-- Migration: Update Canonical Company Information in Settings
-- ==============================================================================

INSERT INTO public.settings (key, value)
VALUES (
    'company_info',
    jsonb_build_object(
        'name', 'Shrishail Multi Services',
        'address', 'At. Post. Kasgi Taluka Omerga Dist. Dharashiv',
        'phone', '+91 98506 67573',
        'email', 'Smsuntnure123@gmail.com',
        'gstin', '27AAAAA0000A1Z5'
    )
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();
