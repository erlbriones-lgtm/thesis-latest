-- Connect admin dashboard to live Supabase data
-- Run this in Supabase SQL Editor (Dashboard > SQL > New query)

-- 1) Helper: check if current auth user is listed as admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 2) Admin can update / delete feedbacks & complaints (reads already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedbacks' AND policyname = 'Allow admin update feedbacks'
  ) THEN
    CREATE POLICY "Allow admin update feedbacks" ON public.feedbacks
      FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedbacks' AND policyname = 'Allow admin delete feedbacks'
  ) THEN
    CREATE POLICY "Allow admin delete feedbacks" ON public.feedbacks
      FOR DELETE USING (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'complaints' AND policyname = 'Allow admin update complaints'
  ) THEN
    CREATE POLICY "Allow admin update complaints" ON public.complaints
      FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'complaints' AND policyname = 'Allow admin delete complaints'
  ) THEN
    CREATE POLICY "Allow admin delete complaints" ON public.complaints
      FOR DELETE USING (public.is_admin());
  END IF;
END $$;

-- 3) Office accounts table used by Admin > Office Accounts
CREATE TABLE IF NOT EXISTS public.office_accounts (
  id BIGSERIAL PRIMARY KEY,
  office_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.office_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'office_accounts' AND policyname = 'Allow public read office accounts'
  ) THEN
    CREATE POLICY "Allow public read office accounts" ON public.office_accounts
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'office_accounts' AND policyname = 'Allow public manage office accounts'
  ) THEN
    CREATE POLICY "Allow public manage office accounts" ON public.office_accounts
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4) Ensure admin_settings row exists
INSERT INTO public.admin_settings (id, config)
VALUES ('global_config', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5) Register an Auth user as admin (CHANGE THE EMAIL):
-- INSERT INTO public.admin_users (user_id, email)
-- SELECT id, email FROM auth.users WHERE email = 'your-admin@bisu.edu.ph'
-- ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
