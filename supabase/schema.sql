-- ============================================================
-- KOZKER ATS COMPLETE DATABASE SCHEMA
-- Production-Grade PostgreSQL for Supabase
-- Compatible with Kozker Recruiter AI Frontend
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing schema (if running fresh)
-- DROP VIEW IF EXISTS public.candidate_rankings_view;
-- DROP VIEW IF EXISTS public.recruiter_dashboard_view;
-- DROP TABLE IF EXISTS public.activity_log CASCADE;
-- DROP TABLE IF EXISTS public.interview_stages CASCADE;
-- DROP TABLE IF EXISTS public.screening_questions CASCADE;
-- DROP TABLE IF EXISTS public.job_candidates CASCADE;
-- DROP TABLE IF EXISTS public.applications CASCADE;
-- DROP TABLE IF EXISTS public.candidates CASCADE;
-- DROP TABLE IF EXISTS public.job_opening_skills CASCADE;
-- DROP TABLE IF EXISTS public.job_openings CASCADE;
-- DROP TABLE IF EXISTS public.requirements CASCADE;
-- DROP TABLE IF EXISTS public.clients CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- 1. PROFILES TABLE (Supabase Auth Link)
-- ============================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'manager', 'client')),
    is_active BOOLEAN DEFAULT TRUE,
    is_onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 2. CLIENTS TABLE
-- ============================================================
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 3. REQUIREMENTS TABLE
-- ============================================================
CREATE TABLE public.requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    skills TEXT[] DEFAULT '{}'::TEXT[],
    experience_min INT DEFAULT 0,
    experience_max INT DEFAULT 30,
    budget_min NUMERIC DEFAULT 0,
    budget_max NUMERIC DEFAULT 1000,
    seniority TEXT CHECK (seniority IN ('junior', 'mid', 'senior', 'lead', 'any')),
    notes TEXT,
    num_posts_requested INT DEFAULT 1 CHECK (num_posts_requested BETWEEN 1 AND 5),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'archived')),
    created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 4. JOB OPENINGS TABLE
-- ============================================================
CREATE TABLE public.job_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.requirements(id) ON DELETE CASCADE,
    post_index INT DEFAULT 1,
    title TEXT,
    description TEXT,
    responsibilities TEXT[] DEFAULT '{}'::TEXT[],
    qualifications TEXT[] DEFAULT '{}'::TEXT[],
    keywords TEXT[] DEFAULT '{}'::TEXT[],
    salary_range TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'published', 'closed')),
    processing_status TEXT DEFAULT 'idle' CHECK (processing_status IN ('idle', 'generating', 'skill_approval', 'matching', 'questions_ready', 'ready', 'error')),
    error_message TEXT,
    ai_generated BOOLEAN DEFAULT TRUE,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- 5. JOB OPENING SKILLS TABLE
-- ============================================================
CREATE TABLE public.job_opening_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_opening_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    weight NUMERIC NOT NULL CHECK (weight >= 0 AND weight <= 100), -- Decimal or percentage supported
    skill_order INT DEFAULT 1,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 6. CANDIDATES TABLE
-- ============================================================
CREATE TABLE public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    skills TEXT[] DEFAULT '{}'::TEXT[],
    experience_years INT DEFAULT 0,
    current_company TEXT,
    resume_url TEXT,
    parsed_resume_json JSONB,
    education TEXT,
    working_or_not BOOLEAN DEFAULT TRUE,
    academic_details TEXT,
    achievements TEXT,
    source TEXT CHECK (source IN ('csv', 'pdf', 'docx', 'manual')),
    uploaded_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Deduplication constraint (email is primary unique identifier)
    CONSTRAINT uq_candidate_email UNIQUE (email)
);

-- ============================================================
-- 7. APPLICATIONS TABLE
-- ============================================================
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_opening_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
    candidate_cv TEXT,
    fuzzy_score NUMERIC CHECK (fuzzy_score >= 0 AND fuzzy_score <= 100),
    match_score NUMERIC CHECK (match_score >= 0 AND match_score <= 100),
    match_reason TEXT,
    strengths TEXT[] DEFAULT '{}'::TEXT[],
    skill_gaps TEXT[] DEFAULT '{}'::TEXT[],
    screening_status TEXT DEFAULT 'pending' CHECK (screening_status IN ('pending', 'accepted', 'rejected', 'shortlisted')),
    stage TEXT DEFAULT 'screening' CHECK (stage IN ('screening', 'technical', 'hr', 'final', 'hired', 'rejected')),
    stage_status TEXT DEFAULT 'pending' CHECK (stage_status IN ('pending', 'in_progress', 'passed', 'failed', 'on_hold')),
    stage_notes TEXT,
    priority INT DEFAULT 0,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Prevent duplicate applications for the same candidate to the same job
    CONSTRAINT uq_candidate_job_application UNIQUE (candidate_id, job_opening_id)
);

-- ============================================================
-- 8. JOB CANDIDATES TABLE (AI Ranking & Scoring)
-- ============================================================
CREATE TABLE public.job_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_opening_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    fuzzy_score NUMERIC NOT NULL CHECK (fuzzy_score >= 0 AND fuzzy_score <= 100),
    rank_order INT NOT NULL,
    strengths TEXT[] DEFAULT '{}'::TEXT[],
    skill_gaps TEXT[] DEFAULT '{}'::TEXT[],
    ai_reasoning TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 9. SCREENING QUESTIONS TABLE
-- ============================================================
CREATE TABLE public.screening_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    job_candidate_id UUID REFERENCES public.job_candidates(id) ON DELETE SET NULL,
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE SET NULL,
    job_opening_id UUID REFERENCES public.job_openings(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_order INT DEFAULT 1,
    ai_generated BOOLEAN DEFAULT TRUE,
    modified BOOLEAN DEFAULT FALSE,
    modified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    modified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 10. INTERVIEW STAGES TABLE
-- ============================================================
CREATE TABLE public.interview_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    job_candidate_id UUID REFERENCES public.job_candidates(id) ON DELETE SET NULL,
    stage_name TEXT NOT NULL CHECK (stage_name IN ('screening', 'technical', 'hr', 'final')),
    stage_order INT DEFAULT 1,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    outcome TEXT DEFAULT 'pending' CHECK (outcome IN ('pending', 'passed', 'failed', 'on_hold')),
    notes TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 11. AUDIT LOGGING / ACTIVITY LOG TABLE
-- ============================================================
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- 12. SOFT DELETES IMPLEMENTATION
-- Add is_deleted field to tables needing soft deletes
-- ============================================================
ALTER TABLE public.clients ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.requirements ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.job_openings ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.candidates ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.applications ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- Create views that filter out soft-deleted records for normal consumption
CREATE OR REPLACE VIEW public.active_clients AS 
SELECT * FROM public.clients WHERE is_deleted = FALSE;

CREATE OR REPLACE VIEW public.active_requirements AS 
SELECT * FROM public.requirements WHERE is_deleted = FALSE;

CREATE OR REPLACE VIEW public.active_job_openings AS 
SELECT * FROM public.job_openings WHERE is_deleted = FALSE;

CREATE OR REPLACE VIEW public.active_candidates AS 
SELECT * FROM public.candidates WHERE is_deleted = FALSE;

CREATE OR REPLACE VIEW public.active_applications AS 
SELECT * FROM public.applications WHERE is_deleted = FALSE;

-- ============================================================
-- FUNCTIONS & HELPERS
-- ============================================================

-- Helper: Auto-updating updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: Check user permissions in RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_recruiter()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'recruiter'),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: Auto-profile creation trigger function for auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_active, is_onboarded)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'recruiter',
        TRUE,
        FALSE
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Candidate deduplication function
CREATE OR REPLACE FUNCTION public.handle_candidate_deduplication()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.candidates WHERE email = NEW.email AND is_deleted = FALSE) THEN
        UPDATE public.candidates
        SET 
            full_name = NEW.full_name,
            phone = COALESCE(NEW.phone, phone),
            skills = COALESCE(NEW.skills, skills),
            experience_years = COALESCE(NEW.experience_years, experience_years),
            current_company = COALESCE(NEW.current_company, current_company),
            resume_url = COALESCE(NEW.resume_url, resume_url),
            parsed_resume_json = COALESCE(NEW.parsed_resume_json, parsed_resume_json),
            source = COALESCE(NEW.source, source),
            updated_at = timezone('utc'::text, now())
        WHERE email = NEW.email AND is_deleted = FALSE;
        
        RETURN NULL; -- Block insertion since we updated the existing row
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: Stage Failure Notes check
CREATE OR REPLACE FUNCTION public.check_stage_notes_on_failure()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.outcome = 'failed' AND (NEW.notes IS NULL OR TRIM(NEW.notes) = '') THEN
        RAISE EXCEPTION 'Failure notes are required when setting interview stage outcome to failed.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper: Skill weights sum validation
CREATE OR REPLACE FUNCTION public.validate_job_skills_weight()
RETURNS TRIGGER AS $$
DECLARE
    v_total_weight NUMERIC;
BEGIN
    -- Only run validation when a job opening's status is changed to 'confirmed' or 'published'
    -- OR when a check is triggered manually.
    -- This prevents blocking incremental additions of skills during drafting.
    IF NEW.status IN ('confirmed', 'published') THEN
        SELECT COALESCE(SUM(weight), 0) INTO v_total_weight
        FROM public.job_opening_skills
        WHERE job_opening_id = NEW.id;
        
        -- Accept 1.0 (decimal) or 100 (percentage)
        IF v_total_weight != 1.0 AND v_total_weight != 100 THEN
            RAISE EXCEPTION 'Total skill weights for confirmed/published job opening must equal 100%% (current sum: %)', v_total_weight;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Profile creation on Auth signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto updated_at timestamps
CREATE TRIGGER set_timestamp_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER set_timestamp_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER set_timestamp_requirements BEFORE UPDATE ON public.requirements FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER set_timestamp_job_openings BEFORE UPDATE ON public.job_openings FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER set_timestamp_candidates BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER set_timestamp_applications BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();
CREATE TRIGGER set_timestamp_interview_stages BEFORE UPDATE ON public.interview_stages FOR EACH ROW EXECUTE FUNCTION public.handle_update_timestamp();

-- Candidate deduplication
CREATE TRIGGER trigger_candidate_deduplication
    BEFORE INSERT ON public.candidates
    FOR EACH ROW EXECUTE FUNCTION public.handle_candidate_deduplication();

-- Interview stage fail note check
CREATE TRIGGER trigger_interview_stage_failure_check
    BEFORE INSERT OR UPDATE ON public.interview_stages
    FOR EACH ROW EXECUTE FUNCTION public.check_stage_notes_on_failure();

-- Validate job skill weights on confirmation/publication
CREATE TRIGGER trigger_job_skills_weight_check
    BEFORE UPDATE ON public.job_openings
    FOR EACH ROW EXECUTE FUNCTION public.validate_job_skills_weight();

-- ============================================================
-- VIEWS
-- ============================================================

-- View: candidate_rankings_view
CREATE OR REPLACE VIEW public.candidate_rankings_view AS
SELECT 
    jc.id as job_candidate_id,
    jc.rank_order as candidate_rank,
    jc.fuzzy_score,
    c.id as candidate_id,
    c.full_name as candidate_name,
    c.email as candidate_email,
    c.phone as candidate_phone,
    c.experience_years,
    c.current_company,
    c.skills as candidate_skills,
    j.id as job_opening_id,
    j.title as job_title,
    j.status as job_status,
    jc.strengths,
    jc.skill_gaps,
    jc.ai_reasoning,
    jc.status as candidate_job_status
FROM public.job_candidates jc
JOIN public.candidates c ON jc.candidate_id = c.id
JOIN public.job_openings j ON jc.job_opening_id = j.id
WHERE c.is_deleted = FALSE AND j.is_deleted = FALSE;

-- View: recruiter_dashboard_view
CREATE OR REPLACE VIEW public.recruiter_dashboard_view AS
SELECT
    (SELECT COUNT(*) FROM public.job_openings WHERE status = 'published' AND is_deleted = FALSE) as open_jobs,
    (SELECT COUNT(*) FROM public.requirements WHERE status = 'active' AND is_deleted = FALSE) as active_requirements,
    (SELECT COUNT(*) FROM public.candidates WHERE is_deleted = FALSE) as candidates_uploaded,
    (SELECT COUNT(*) FROM public.applications WHERE screening_status = 'pending' AND is_deleted = FALSE) as pending_reviews,
    (SELECT COUNT(*) FROM public.applications WHERE stage_status = 'in_progress' AND is_deleted = FALSE) as stages_in_progress;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_clients_is_deleted ON public.clients(is_deleted);
CREATE INDEX idx_requirements_client ON public.requirements(client_id);
CREATE INDEX idx_requirements_is_deleted ON public.requirements(is_deleted);
CREATE INDEX idx_job_openings_req ON public.job_openings(requirement_id);
CREATE INDEX idx_job_openings_status ON public.job_openings(status);
CREATE INDEX idx_job_openings_is_deleted ON public.job_openings(is_deleted);
CREATE INDEX idx_skills_job_opening ON public.job_opening_skills(job_opening_id);
CREATE INDEX idx_candidates_email ON public.candidates(email);
CREATE INDEX idx_candidates_skills ON public.candidates USING gin(skills);
CREATE INDEX idx_candidates_is_deleted ON public.candidates(is_deleted);
CREATE INDEX idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX idx_applications_job ON public.applications(job_opening_id);
CREATE INDEX idx_applications_screening_status ON public.applications(screening_status);
CREATE INDEX idx_applications_stage ON public.applications(stage);
CREATE INDEX idx_applications_is_deleted ON public.applications(is_deleted);
CREATE INDEX idx_job_candidates_opening ON public.job_candidates(job_opening_id);
CREATE INDEX idx_job_candidates_fuzzy_score ON public.job_candidates(fuzzy_score DESC);
CREATE INDEX idx_job_candidates_rank ON public.job_candidates(rank_order ASC);
CREATE INDEX idx_questions_application ON public.screening_questions(application_id);
CREATE INDEX idx_interview_stages_application ON public.interview_stages(application_id);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON public.activity_log(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_opening_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Allow public read of profiles" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Allow self-update profiles" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow admin full access profiles" ON public.profiles FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Allow self-insert profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Clients Policies
CREATE POLICY "Allow recruiters to view clients" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "Allow recruiters to modify clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = created_by OR is_admin());
CREATE POLICY "Allow recruiters to update clients" ON public.clients FOR UPDATE USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "Allow admin to delete clients" ON public.clients FOR DELETE USING (is_admin());

-- 3. Requirements Policies
CREATE POLICY "Allow recruiters to view requirements" ON public.requirements FOR SELECT TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "Allow recruiters to modify requirements" ON public.requirements FOR INSERT WITH CHECK (auth.uid() = created_by OR is_admin());
CREATE POLICY "Allow recruiters to update requirements" ON public.requirements FOR UPDATE USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "Allow admin to delete requirements" ON public.requirements FOR DELETE USING (is_admin());

-- 4. Job Openings Policies
CREATE POLICY "Allow recruiters to view jobs" ON public.job_openings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.requirements r WHERE r.id = requirement_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow recruiters to modify jobs" ON public.job_openings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.requirements r WHERE r.id = requirement_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow recruiters to update jobs" ON public.job_openings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.requirements r WHERE r.id = requirement_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow admin to delete jobs" ON public.job_openings FOR DELETE USING (is_admin());

-- 5. Job Opening Skills Policies
CREATE POLICY "Allow view skills" ON public.job_opening_skills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow modify skills" ON public.job_opening_skills FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());

-- 6. Candidates Policies
CREATE POLICY "Allow view candidates" ON public.candidates FOR SELECT TO authenticated USING (auth.uid() = uploaded_by OR is_admin());
CREATE POLICY "Allow modify candidates" ON public.candidates FOR ALL TO authenticated USING (auth.uid() = uploaded_by OR is_admin());

-- 7. Applications Policies
CREATE POLICY "Allow view applications" ON public.applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND c.uploaded_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow modify applications" ON public.applications FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());

-- 8. Job Candidates Policies
CREATE POLICY "Allow view job candidates" ON public.job_candidates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow modify job candidates" ON public.job_candidates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());

-- 9. Screening Questions Policies
CREATE POLICY "Allow view questions" ON public.screening_questions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow modify questions" ON public.screening_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());

-- 10. Interview Stages Policies
CREATE POLICY "Allow view stages" ON public.interview_stages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.applications a JOIN public.job_openings j ON a.job_opening_id = j.id JOIN public.requirements r ON j.requirement_id = r.id WHERE a.id = application_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow modify stages" ON public.interview_stages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.applications a JOIN public.job_openings j ON a.job_opening_id = j.id JOIN public.requirements r ON j.requirement_id = r.id WHERE a.id = application_id AND r.created_by = auth.uid()) OR is_admin());

-- 11. Activity Log Policies
CREATE POLICY "Allow view log" ON public.activity_log FOR SELECT TO authenticated USING (auth.uid() = actor_id OR is_admin());
CREATE POLICY "Allow insert log" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- REALTIME SETUP
-- ============================================================
-- Add tables to the supabase_realtime publication to enable subscriptions
alter publication supabase_realtime add table public.job_openings;
alter publication supabase_realtime add table public.job_candidates;
alter publication supabase_realtime add table public.screening_questions;
alter publication supabase_realtime add table public.interview_stages;
alter publication supabase_realtime add table public.activity_log;

-- ============================================================
-- STORAGE BUCKETS SETUP
-- Note: Supabase structures buckets under the storage schema.
-- These SQL queries prepare metadata and RLS policies for storage.
-- ============================================================

-- Ensure buckets exist (inserts metadata if buckets do not already exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('resumes', 'resumes', false),
    ('candidate_documents', 'candidate_documents', false),
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies

-- Resumes Bucket (Private, read access to authenticated recruiters/admins)
CREATE POLICY "Allow recruiter read resumes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resumes' AND (public.is_recruiter() OR public.is_admin() OR public.is_manager()));
CREATE POLICY "Allow recruiter upload resumes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes' AND (public.is_recruiter() OR public.is_admin()));
CREATE POLICY "Allow recruiter delete resumes" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resumes' AND (public.is_recruiter() OR public.is_admin()));

-- Candidate Documents Bucket (Private)
CREATE POLICY "Allow recruiter read docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'candidate_documents' AND (public.is_recruiter() OR public.is_admin() OR public.is_manager()));
CREATE POLICY "Allow recruiter upload docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'candidate_documents' AND (public.is_recruiter() OR public.is_admin()));
CREATE POLICY "Allow recruiter delete docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'candidate_documents' AND (public.is_recruiter() OR public.is_admin()));

-- Avatars Bucket (Publicly readable, writable by user for self or admin)
CREATE POLICY "Allow public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Allow authenticated user upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Allow user delete own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (owner::text = auth.uid()::text OR public.is_admin()));
