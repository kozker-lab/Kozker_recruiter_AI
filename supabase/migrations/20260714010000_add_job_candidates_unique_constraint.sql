-- Migration: Add unique constraint to job_candidates table
-- Date: 2026-07-14
-- Purpose: Resolves the "no unique or exclusion constraint matching the ON CONFLICT specification" error during candidate link/upsert.

ALTER TABLE public.job_candidates 
ADD CONSTRAINT uq_job_candidates_opening_candidate UNIQUE (job_opening_id, candidate_id);
