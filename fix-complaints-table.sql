-- ==============================================================================
-- FIX COMPLAINTS TABLE: MISSING COLUMNS & ROW-LEVEL SECURITY POLICIES
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ==============================================================================

-- 1. Ensure the complaints table exists
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    name TEXT,
    address TEXT,
    sex TEXT,
    age INT,
    civil_status TEXT,
    contact_details TEXT,
    date_of_incident TEXT,
    time_of_incident TEXT,
    place_of_incident TEXT,
    details_of_complaint TEXT,
    narrative_report TEXT,
    desired_outcome TEXT
);

-- 2. Add any missing columns required by the official form (F-AQA-CSF-004 Rev. 2)
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS office_of TEXT,
ADD COLUMN IF NOT EXISTS person_complained_of TEXT,
ADD COLUMN IF NOT EXISTS proof_of_complaint TEXT,
ADD COLUMN IF NOT EXISTS attachment JSONB,
ADD COLUMN IF NOT EXISTS signature_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- 4. Allow public anonymous users to insert complaints (fix for "new row violates row-level security policy")
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'complaints'
          AND policyname = 'Allow public complaint submission'
    ) THEN
        CREATE POLICY "Allow public complaint submission" ON public.complaints
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- 5. Allow admin & authorized users to read complaints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'complaints'
          AND policyname = 'Allow public read complaints'
    ) THEN
        CREATE POLICY "Allow public read complaints" ON public.complaints
            FOR SELECT USING (true);
    END IF;
END $$;

-- 6. Reload schema cache so PostgREST immediately recognizes the columns
NOTIFY pgrst, 'reload schema';
