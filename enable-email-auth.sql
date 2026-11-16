-- Enable Email Authentication for Password Reset
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

-- 1. Enable Email Auth for your project
-- Note: This also needs to be configured in Supabase Dashboard > Authentication > Providers > Email
-- You need to:
-- - Enable the Email provider
-- - Configure SMTP settings or use Supabase's built-in email service
-- - Enable "Confirm email" and "Secure email change" in Email Templates

-- 2. Create a function to allow password updates (if needed)
CREATE OR REPLACE FUNCTION admin_change_user_password(target_email TEXT, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function can be used to update passwords via RPC
    -- Useful for office account password management
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf'))
    WHERE email = target_email;
END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_change_user_password TO authenticated;
