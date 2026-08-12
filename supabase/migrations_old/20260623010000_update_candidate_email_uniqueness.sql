-- 1. Drop the old global unique constraint on email
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS uq_candidate_email;

-- 2. Create unique index for email + job_id combinations (when job_id is present)
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidates_email_job_id 
ON public.candidates (email, job_id) 
WHERE job_id IS NOT NULL;

-- 3. Create unique index for email (when job_id is null/general pool)
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidates_email_no_job 
ON public.candidates (email) 
WHERE job_id IS NULL;
