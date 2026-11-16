-- Admin Password Recovery with Verification Code & Row Level Security (RLS)
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 0. Ensure pgcrypto extension is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- ============================================================================
-- HOW TO SETUP AUTOMATIC OTP EMAIL SENDING IN SUPABASE
-- ============================================================================
-- Follow these 3 simple steps in your Supabase Project Dashboard:
--
-- ----------------------------------------------------------------------------
-- STEP 1: Enable Custom SMTP (Crucial for Gmail & @bisu.edu.ph delivery)
-- ----------------------------------------------------------------------------
-- Supabase's built-in default mail service is restricted to 3-4 emails/hour on 
-- free tier and is often filtered by university firewalls (@bisu.edu.ph).
-- To send real OTP emails reliably without limits:
--
-- 1. Go to: Supabase Dashboard > Project Settings (Gear icon) > Authentication
-- 2. Scroll to "SMTP Settings" and toggle ON "Enable Custom SMTP"
-- 3. Enter your SMTP details (e.g., using free Gmail SMTP or Resend):
--
--    [Option A: Using Google / Gmail SMTP]
--    - Sender Email: your_email@gmail.com (or your campus email)
--    - Sender Name: BISU Calape Portal
--    - Host: smtp.gmail.com
--    - Port: 587
--    - Encryption: TLS
--    - User: your_email@gmail.com
--    - Password: [16-character Google App Password]
--      (To generate an App Password: Go to your Google Account > Security > 
--       2-Step Verification > App passwords > Create one for "Supabase")
--
--    [Option B: Using Resend (Free 3,000 emails/month)]
--    - Sender Email: onboarding@resend.dev (or verified domain)
--    - Sender Name: BISU Calape Portal
--    - Host: smtp.resend.com
--    - Port: 587 (or 465)
--    - User: resend
--    - Password: your_resend_api_key (starts with "re_...")
--
-- ----------------------------------------------------------------------------
-- STEP 2: Configure the Reset Password Email Template to send the 6-Digit OTP
-- ----------------------------------------------------------------------------
-- By default, Supabase sends a confirmation link ({{ .ConfirmationURL }}).
-- To send the 6-digit OTP code directly to their inbox:
--
-- 1. Go to: Supabase Dashboard > Authentication > Email Templates
-- 2. Select the "Reset Password" template
-- 3. Change "Subject" to:
--    BISU Calape Portal - Password Reset OTP Code
-- 4. Replace the email body with:
--    <h2>Reset Your Password</h2>
--    <p>Hello,</p>
--    <p>You requested to reset your password for your BISU Calape Portal account.</p>
--    <p>Your 6-digit verification OTP code is:</p>
--    <p style="font-size: 26px; font-weight: bold; letter-spacing: 4px; color: #1E3A8A; background: #EEF2FF; padding: 12px 20px; border-radius: 8px; display: inline-block;">
--        {{ .Token }}
--    </p>
--    <p>This code will expire in 60 minutes. If you did not make this request, you can safely ignore this email.</p>
--    <br>
--    <p>Best regards,<br>BISU Calape Campus Portal System</p>
-- 5. Click "Save Changes"
--
-- ----------------------------------------------------------------------------
-- STEP 3: Multi-Channel Backup Built into the App
-- ----------------------------------------------------------------------------
-- In case custom SMTP is ever down or during local development:
-- 1. The portal displays "Send via Gmail" and "Default Mail App" buttons pre-filled
--    with the 6-digit OTP code, recipient, and instructions.
-- 2. A copy button and on-screen code prompt are provided for immediate access.
-- ============================================================================
