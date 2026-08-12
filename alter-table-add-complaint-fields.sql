-- Run this SQL in your Supabase SQL Editor to ensure the complaints table has all official F-AQA-CSF-004 Rev. 2 fields:

ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS office_of TEXT,
ADD COLUMN IF NOT EXISTS person_complained_of TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS sex TEXT,
ADD COLUMN IF NOT EXISTS age INT,
ADD COLUMN IF NOT EXISTS civil_status TEXT,
ADD COLUMN IF NOT EXISTS time_of_incident TEXT,
ADD COLUMN IF NOT EXISTS proof_of_complaint TEXT,
ADD COLUMN IF NOT EXISTS attachment JSONB,
ADD COLUMN IF NOT EXISTS signature_name TEXT;
