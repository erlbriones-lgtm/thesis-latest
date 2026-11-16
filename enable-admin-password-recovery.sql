-- Admin Password Recovery with Verification Code & Row Level Security (RLS)
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Create table to store password recovery verification codes
CREATE TABLE IF NOT EXISTS public.admin_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.admin_recovery_codes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Allow public insert of recovery requests
DROP POLICY IF EXISTS "Allow public insert recovery codes" ON public.admin_recovery_codes;
CREATE POLICY "Allow public insert recovery codes"
    ON public.admin_recovery_codes
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow public read of active, unexpired, unused recovery codes for verification
DROP POLICY IF EXISTS "Allow verification of active recovery codes" ON public.admin_recovery_codes;
CREATE POLICY "Allow verification of active recovery codes"
    ON public.admin_recovery_codes
    FOR SELECT
    TO public
    USING (used = false AND expires_at > NOW());

-- Allow updating code to used upon successful verification
DROP POLICY IF EXISTS "Allow marking recovery code as used" ON public.admin_recovery_codes;
CREATE POLICY "Allow marking recovery code as used"
    ON public.admin_recovery_codes
    FOR UPDATE
    TO public
    USING (used = false AND expires_at > NOW())
    WITH CHECK (used = true);

-- 4. Secure RPC function to verify code and change password in auth.users & office_accounts
CREATE OR REPLACE FUNCTION public.verify_recovery_code_and_reset_password(
    target_email TEXT,
    recovery_code TEXT,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    matched_record RECORD;
BEGIN
    -- Check if valid unused recovery code exists and hasn't expired
    SELECT * INTO matched_record
    FROM public.admin_recovery_codes
    WHERE LOWER(email) = LOWER(target_email)
      AND code = recovery_code
      AND used = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF matched_record.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired recovery code. Please check your code or request a new one.');
    END IF;

    -- Mark the code as used immediately
    UPDATE public.admin_recovery_codes
    SET used = TRUE
    WHERE id = matched_record.id;

    -- Update password in auth.users if user exists
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(target_email);

    -- Also update in office_accounts if registered there
    UPDATE public.office_accounts
    SET password = new_password,
        updated_at = NOW()
    WHERE LOWER(email) = LOWER(target_email);

    RETURN jsonb_build_object('success', true, 'message', 'Password has been successfully updated.');
END;
$$;

-- 5. Grant execute permission on the RPC function to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.verify_recovery_code_and_reset_password(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
