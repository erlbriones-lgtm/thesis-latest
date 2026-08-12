-- Run this SQL query in your Supabase SQL Editor to add the "region_of_residence" column to your existing "feedbacks" table:

ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS region_of_residence TEXT;
