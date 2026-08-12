-- Migration: Add Category and Sub-category Tags to Job Openings
-- Date: 2026-Jul-09

-- 1. Alter job_openings table to add category and sub_category columns
ALTER TABLE public.job_openings 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('technical', 'non-technical')),
ADD COLUMN IF NOT EXISTS sub_category TEXT;
