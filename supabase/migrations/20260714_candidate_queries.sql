-- Migration: Add fields for tracking portal chat channels and segregation
-- Run this script in the Supabase SQL Editor.

ALTER TABLE public.candidate_queries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'apply_form' CHECK (source IN ('apply_form', 'tracking_portal'));
ALTER TABLE public.candidate_queries ADD COLUMN IF NOT EXISTS sender TEXT DEFAULT 'candidate' CHECK (sender IN ('candidate', 'recruiter', 'ai'));
ALTER TABLE public.candidate_queries ADD COLUMN IF NOT EXISTS is_ended BOOLEAN DEFAULT FALSE;

-- Index for optimized sorting and grouping in QnaView conversation threads
CREATE INDEX IF NOT EXISTS idx_candidate_queries_convo ON public.candidate_queries(candidate_email, job_id, is_ended);
