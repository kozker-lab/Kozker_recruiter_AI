-- ============================================================
-- MIGRATION: ADD CANDIDATE VIEW SETTINGS
-- Run this directly in the Supabase SQL Editor
-- ============================================================

-- Add candidate view settings column to job_openings
ALTER TABLE public.job_openings ADD COLUMN IF NOT EXISTS candidate_view_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.job_openings ADD COLUMN IF NOT EXISTS stage_notifications JSONB DEFAULT '{}'::jsonb;

-- Re-create active_job_openings view to ensure the new column is included
CREATE OR REPLACE VIEW public.active_job_openings AS 
SELECT * FROM public.job_openings WHERE is_deleted = FALSE;

-- Notify PostgREST to reload the schema cache so new columns are immediately available
NOTIFY pgrst, 'reload schema';
