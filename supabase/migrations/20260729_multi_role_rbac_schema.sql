-- =========================================================================
-- MIGRATION SCRIPT: Multi-Role Structure & RBAC Permissions Matrix
-- =========================================================================

-- 1. Add manager_member_id to public.members for organizational reporting tree
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS manager_member_id VARCHAR(36) REFERENCES public.members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_manager_id ON public.members(manager_member_id);

-- 2. Add fine-grained panel access flags to public.role_permissions
ALTER TABLE public.role_permissions 
ADD COLUMN IF NOT EXISTS recruiter_dashboard BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recruiter_mandates BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recruiter_jobs BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recruiter_sourcing BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recruiter_stages BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recruiter_pipelines BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recruiter_qna BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS recruiter_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS team_monitoring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS interviewer_workspace BOOLEAN DEFAULT FALSE;

-- 3. Create Interview Assignments & Scorecards Table
CREATE TABLE IF NOT EXISTS public.interview_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_candidate_id UUID REFERENCES public.job_candidates(id) ON DELETE CASCADE,
    interviewer_id VARCHAR(36) REFERENCES public.members(id) ON DELETE CASCADE,
    round_name VARCHAR(150) NOT NULL DEFAULT 'Technical Round',
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.interview_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.interview_assignments(id) ON DELETE CASCADE,
    interviewer_id VARCHAR(36) REFERENCES public.members(id) ON DELETE CASCADE,
    recommendation VARCHAR(50) NOT NULL, -- 'Strong Hire', 'Hire', 'No Hire', 'Strong No Hire'
    ratings JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    locked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Set Primary Admin Status for Specified Admin Accounts
UPDATE public.members 
SET is_primary_admin = TRUE 
WHERE email IN ('smaranlm10@gmail.com', 'adithyacherian24@gmail.com', 'aderhamsk@gmail.com');
