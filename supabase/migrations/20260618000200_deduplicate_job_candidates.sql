-- ============================================================
-- MIGRATION: REVERT UNIQUE CONSTRAINT ON JOB CANDIDATES
-- ============================================================

ALTER TABLE public.job_candidates DROP CONSTRAINT IF EXISTS uq_job_opening_candidate;
