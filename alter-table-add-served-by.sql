-- Run this SQL query in your Supabase SQL Editor to add the "served_by" column to your existing "feedbacks" table:

ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS served_by TEXT;
