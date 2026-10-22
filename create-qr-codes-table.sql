-- Create QR Codes Table with public access policies
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query)

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id TEXT PRIMARY KEY,
  office TEXT NOT NULL,
  station TEXT,
  kiosk BOOLEAN DEFAULT true,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'qr_codes' AND policyname = 'Allow public read qr codes'
  ) THEN
    CREATE POLICY "Allow public read qr codes" ON public.qr_codes
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'qr_codes' AND policyname = 'Allow public manage qr codes'
  ) THEN
    CREATE POLICY "Allow public manage qr codes" ON public.qr_codes
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
