-- ============================================================
-- MIGRATION: ADD PARSED RESUME COLUMN TO JOB CANDIDATES
-- ============================================================

ALTER TABLE public.job_candidates ADD COLUMN parsed_resume JSONB;
