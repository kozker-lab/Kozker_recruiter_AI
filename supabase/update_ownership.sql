-- ============================================================
-- UPDATE OWNERSHIP/CREATOR COLUMNS TO SPECIFIC USER PROFILE
-- Run this directly in the Supabase SQL Editor
-- Mapped to User ID: f3dcea71-25c3-431b-8f51-7f8699421cfd
-- ============================================================

-- 1. Update Clients
UPDATE public.clients 
SET created_by = 'f3dcea71-25c3-431b-8f51-7f8699421cfd' 
WHERE created_by IS DISTINCT FROM 'f3dcea71-25c3-431b-8f51-7f8699421cfd';

-- 2. Update Requirements
UPDATE public.requirements 
SET created_by = 'f3dcea71-25c3-431b-8f51-7f8699421cfd' 
WHERE created_by IS DISTINCT FROM 'f3dcea71-25c3-431b-8f51-7f8699421cfd';

-- Temporarily disable the job skills validation trigger to prevent updates from failing 
-- if existing database jobs have incomplete skills setup.
ALTER TABLE public.job_openings DISABLE TRIGGER trigger_job_skills_weight_check;

-- 3. Update Job Openings
UPDATE public.job_openings 
SET approved_by = 'f3dcea71-25c3-431b-8f51-7f8699421cfd' 
WHERE approved_by IS DISTINCT FROM 'f3dcea71-25c3-431b-8f51-7f8699421cfd';

ALTER TABLE public.job_openings ENABLE TRIGGER trigger_job_skills_weight_check;

-- 4. Update Candidates
UPDATE public.candidates 
SET uploaded_by = 'f3dcea71-25c3-431b-8f51-7f8699421cfd' 
WHERE uploaded_by IS DISTINCT FROM 'f3dcea71-25c3-431b-8f51-7f8699421cfd';

-- 5. Update Applications
UPDATE public.applications 
SET reviewed_by = 'f3dcea71-25c3-431b-8f51-7f8699421cfd' 
WHERE reviewed_by IS DISTINCT FROM 'f3dcea71-25c3-431b-8f51-7f8699421cfd';

-- 6. Update Screening Questions
UPDATE public.screening_questions 
SET modified_by = 'f3dcea71-25c3-431b-8f51-7f8699421cfd' 
WHERE modified_by IS DISTINCT FROM 'f3dcea71-25c3-431b-8f51-7f8699421cfd';

-- 7. Update Interview Stages
UPDATE public.interview_stages 
SET updated_by = 'f3dcea71-25c3-431b-8f51-7f8699421cfd' 
WHERE updated_by IS DISTINCT FROM 'f3dcea71-25c3-431b-8f51-7f8699421cfd';

-- 8. Update Activity Log / Audit Log
UPDATE public.activity_log 
SET actor_id = 'f3dcea71-25c3-431b-8f51-7f8699421cfd' 
WHERE actor_id IS DISTINCT FROM 'f3dcea71-25c3-431b-8f51-7f8699421cfd';
