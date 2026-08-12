-- ============================================================
-- MIGRATION: ADD FORM MANAGEMENT CONTROLS
-- Run this directly in the Supabase SQL Editor
-- ============================================================

-- 1. Add form availability control columns to job_openings
ALTER TABLE public.job_openings ADD COLUMN IF NOT EXISTS form_timer INTEGER DEFAULT NULL;
ALTER TABLE public.job_openings ADD COLUMN IF NOT EXISTS form_threshold INTEGER DEFAULT NULL;
ALTER TABLE public.job_openings ADD COLUMN IF NOT EXISTS form_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.job_openings ADD COLUMN IF NOT EXISTS form_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.job_openings ADD COLUMN IF NOT EXISTS form_fields JSONB DEFAULT NULL;
ALTER TABLE public.job_openings ADD COLUMN IF NOT EXISTS form_theme TEXT DEFAULT NULL;
ALTER TABLE public.job_openings ADD COLUMN IF NOT EXISTS form_bg_mode TEXT DEFAULT NULL;

-- 2. Re-create active_job_openings view to include the new columns
CREATE OR REPLACE VIEW public.active_job_openings AS 
SELECT * FROM public.job_openings WHERE is_deleted = FALSE;
