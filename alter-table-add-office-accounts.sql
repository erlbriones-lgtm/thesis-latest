-- Create / Update Office Accounts Table with public access policies
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

CREATE TABLE IF NOT EXISTS public.office_accounts (
  id BIGSERIAL PRIMARY KEY,
  office_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table already existed
ALTER TABLE public.office_accounts ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.office_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

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

-- Also ensure admin_settings table is present
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id TEXT PRIMARY KEY,
  config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_settings' AND policyname = 'Allow public read admin settings'
  ) THEN
    CREATE POLICY "Allow public read admin settings" ON public.admin_settings
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_settings' AND policyname = 'Allow public manage admin settings'
  ) THEN
    CREATE POLICY "Allow public manage admin settings" ON public.admin_settings
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
