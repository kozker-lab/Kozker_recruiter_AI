-- =========================================================================
-- KOZKER RECRUITER AI & ADMIN CONSOLE: COMPLETE MASTER SQL SCHEMA & RLS
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TENANT ORGANIZATIONS & QUOTAS
CREATE TABLE IF NOT EXISTS public.organizations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    operating_mode VARCHAR(50) NOT NULL DEFAULT 'agency',
    default_landing_portal VARCHAR(50) NOT NULL DEFAULT 'admin',
    max_members_limit INT DEFAULT 10,
    max_roles_limit INT DEFAULT 10,
    can_manage_pipelines BOOLEAN DEFAULT TRUE,
    can_view_audit_logs BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ORGANIZATIONAL BRANCHES
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) DEFAULT 'MAIN',
    location VARCHAR(200) DEFAULT 'HQ',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branches_org_id ON public.branches(organization_id);

-- 3. MASTER ROLES & RBAC PERMISSIONS MATRIX
CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id VARCHAR(36) REFERENCES public.organizations(id) ON DELETE CASCADE,
    parent_id VARCHAR(36) REFERENCES public.roles(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) NOT NULL DEFAULT 'position',
    color_hex VARCHAR(7) NOT NULL DEFAULT '#ff6e30',
    scope_type VARCHAR(50) DEFAULT 'organization',
    branch_name VARCHAR(100) DEFAULT 'Main Branch',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_org_id ON public.roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_branch_id ON public.roles(branch_id);
CREATE INDEX IF NOT EXISTS idx_roles_scope_type ON public.roles(scope_type);
CREATE INDEX IF NOT EXISTS idx_roles_branch_name ON public.roles(branch_name);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id VARCHAR(36) PRIMARY KEY REFERENCES public.roles(id) ON DELETE CASCADE,
    administrator BOOLEAN DEFAULT FALSE,
    audit_logs BOOLEAN DEFAULT FALSE,
    manage_server BOOLEAN DEFAULT FALSE,
    access_recruitment BOOLEAN DEFAULT TRUE,
    recruiter_dashboard BOOLEAN DEFAULT TRUE,
    recruiter_mandates BOOLEAN DEFAULT TRUE,
    recruiter_jobs BOOLEAN DEFAULT TRUE,
    recruiter_sourcing BOOLEAN DEFAULT TRUE,
    recruiter_reports BOOLEAN DEFAULT TRUE,
    recruiter_qna BOOLEAN DEFAULT TRUE,
    recruiter_resumes BOOLEAN DEFAULT TRUE,
    recruiter_stage_move BOOLEAN DEFAULT TRUE,
    access_client BOOLEAN DEFAULT FALSE,
    client_contracts BOOLEAN DEFAULT FALSE,
    client_mandates BOOLEAN DEFAULT FALSE,
    client_shortlists BOOLEAN DEFAULT FALSE,
    access_employee BOOLEAN DEFAULT FALSE,
    employee_directory BOOLEAN DEFAULT FALSE,
    employee_org_chart BOOLEAN DEFAULT FALSE,
    manage_jobs BOOLEAN DEFAULT TRUE,
    view_resumes BOOLEAN DEFAULT TRUE,
    edit_status BOOLEAN DEFAULT TRUE,
    schedule_interviews BOOLEAN DEFAULT TRUE
);

-- 4. ORGANIZATION MEMBERS DIRECTORY & USER ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.members (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id VARCHAR(36) REFERENCES public.organizations(id) ON DELETE CASCADE,
    supabase_user_id UUID,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_initials VARCHAR(4) NOT NULL,
    must_change_password BOOLEAN DEFAULT TRUE,
    is_primary_admin BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_org_id ON public.members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_is_primary_admin ON public.members(is_primary_admin);

CREATE TABLE IF NOT EXISTS public.member_roles (
    member_id VARCHAR(36) REFERENCES public.members(id) ON DELETE CASCADE,
    role_id VARCHAR(36) REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (member_id, role_id)
);

-- 5. RECRUITER PROFILES & ISOLATION
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'recruiter',
    avatar_url TEXT,
    is_onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CLIENTS & MANDATES
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. JOB VACANCIES & CANDIDATES
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_tag VARCHAR(100),
    skills JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id VARCHAR(36) REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    resume_url TEXT,
    parsed_skills JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    stage VARCHAR(50) DEFAULT 'applied',
    match_score NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, candidate_id)
);

-- 8. APPROVAL PIPELINES & STAGES
CREATE TABLE IF NOT EXISTS public.approval_pipelines (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id VARCHAR(36) REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pipeline_id VARCHAR(36) REFERENCES public.approval_pipelines(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    stage_title VARCHAR(255) NOT NULL,
    required_role_id VARCHAR(36) REFERENCES public.roles(id) ON DELETE CASCADE,
    sla_hours INT DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pending_approvals (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    pipeline_id VARCHAR(36) REFERENCES public.approval_pipelines(id) ON DELETE CASCADE,
    item_title VARCHAR(255) NOT NULL,
    requestor_id VARCHAR(36) REFERENCES public.members(id) ON DELETE CASCADE,
    current_stage_step INT NOT NULL,
    current_stage_title VARCHAR(255) NOT NULL,
    required_role_id VARCHAR(36) REFERENCES public.roles(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Pending Review',
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS & NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id VARCHAR(36) REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id VARCHAR(36) REFERENCES public.members(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL,
    action_description VARCHAR(255) NOT NULL,
    target_name VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Recruiters view own clients" ON public.clients;
CREATE POLICY "Recruiters view own clients" ON public.clients FOR SELECT USING (recruiter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Recruiters manage own clients" ON public.clients;
CREATE POLICY "Recruiters manage own clients" ON public.clients FOR ALL USING (recruiter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Recruiters view own jobs" ON public.jobs;
CREATE POLICY "Recruiters view own jobs" ON public.jobs FOR SELECT USING (recruiter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Recruiters manage own jobs" ON public.jobs;
CREATE POLICY "Recruiters manage own jobs" ON public.jobs FOR ALL USING (recruiter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Recruiters view own candidates" ON public.candidates;
CREATE POLICY "Recruiters view own candidates" ON public.candidates FOR SELECT USING (recruiter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Recruiters manage own candidates" ON public.candidates;
CREATE POLICY "Recruiters manage own candidates" ON public.candidates FOR ALL USING (recruiter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Recruiters view own notifications" ON public.notifications;
CREATE POLICY "Recruiters view own notifications" ON public.notifications FOR SELECT USING (recruiter_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Allow notification inserts" ON public.notifications;
CREATE POLICY "Allow notification inserts" ON public.notifications FOR INSERT WITH CHECK (TRUE);

-- Mark Primary Admin
UPDATE public.members 
SET is_primary_admin = TRUE 
WHERE email IN ('aderhamsk@gmail.com');
