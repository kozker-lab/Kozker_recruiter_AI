-- ============================================================
-- KOZKER ATS RECRUITER DATA ISOLATION MIGRATION
-- Sets up column defaults and isolated RLS policies
-- ============================================================

-- 1. Set column default values to auth.uid()
ALTER TABLE public.clients ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.requirements ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.candidates ALTER COLUMN uploaded_by SET DEFAULT auth.uid();
ALTER TABLE public.activity_log ALTER COLUMN actor_id SET DEFAULT auth.uid();

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow public read of profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow recruiters to view clients" ON public.clients;
DROP POLICY IF EXISTS "Allow recruiters to modify clients" ON public.clients;
DROP POLICY IF EXISTS "Allow recruiters to update clients" ON public.clients;
DROP POLICY IF EXISTS "Allow recruiters to view requirements" ON public.requirements;
DROP POLICY IF EXISTS "Allow recruiters to modify requirements" ON public.requirements;
DROP POLICY IF EXISTS "Allow recruiters to update requirements" ON public.requirements;
DROP POLICY IF EXISTS "Allow recruiters to view jobs" ON public.job_openings;
DROP POLICY IF EXISTS "Allow recruiters to modify jobs" ON public.job_openings;
DROP POLICY IF EXISTS "Allow recruiters to update jobs" ON public.job_openings;
DROP POLICY IF EXISTS "Allow view skills" ON public.job_opening_skills;
DROP POLICY IF EXISTS "Allow modify skills" ON public.job_opening_skills;
DROP POLICY IF EXISTS "Allow view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow modify candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow view applications" ON public.applications;
DROP POLICY IF EXISTS "Allow modify applications" ON public.applications;
DROP POLICY IF EXISTS "Allow view job candidates" ON public.job_candidates;
DROP POLICY IF EXISTS "Allow modify job candidates" ON public.job_candidates;
DROP POLICY IF EXISTS "Allow view questions" ON public.screening_questions;
DROP POLICY IF EXISTS "Allow modify questions" ON public.screening_questions;
DROP POLICY IF EXISTS "Allow view stages" ON public.interview_stages;
DROP POLICY IF EXISTS "Allow modify stages" ON public.interview_stages;
DROP POLICY IF EXISTS "Allow view log" ON public.activity_log;

-- 3. Create isolated RLS policies
-- Profiles: Users can select their own profile or if they are admin
CREATE POLICY "Allow public read of profiles" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_admin());

-- Clients: Isolated by created_by
CREATE POLICY "Allow recruiters to view clients" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "Allow recruiters to modify clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = created_by OR is_admin());
CREATE POLICY "Allow recruiters to update clients" ON public.clients FOR UPDATE USING (auth.uid() = created_by OR is_admin());

-- Requirements: Isolated by created_by
CREATE POLICY "Allow recruiters to view requirements" ON public.requirements FOR SELECT TO authenticated USING (auth.uid() = created_by OR is_admin());
CREATE POLICY "Allow recruiters to modify requirements" ON public.requirements FOR INSERT WITH CHECK (auth.uid() = created_by OR is_admin());
CREATE POLICY "Allow recruiters to update requirements" ON public.requirements FOR UPDATE USING (auth.uid() = created_by OR is_admin());

-- Job Openings: Isolated by requirement creator
CREATE POLICY "Allow recruiters to view jobs" ON public.job_openings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.requirements r WHERE r.id = requirement_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow recruiters to modify jobs" ON public.job_openings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.requirements r WHERE r.id = requirement_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow recruiters to update jobs" ON public.job_openings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.requirements r WHERE r.id = requirement_id AND r.created_by = auth.uid()) OR is_admin());

-- Job Opening Skills: Isolated by requirement creator
CREATE POLICY "Allow view skills" ON public.job_opening_skills FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow modify skills" ON public.job_opening_skills FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());

-- Candidates: Isolated by uploaded_by
CREATE POLICY "Allow view candidates" ON public.candidates FOR SELECT TO authenticated USING (auth.uid() = uploaded_by OR is_admin());
CREATE POLICY "Allow modify candidates" ON public.candidates FOR ALL TO authenticated USING (auth.uid() = uploaded_by OR is_admin());

-- Applications: Isolated by job opening requirement creator or candidate uploader
CREATE POLICY "Allow view applications" ON public.applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR EXISTS (SELECT 1 FROM public.candidates c WHERE c.id = candidate_id AND c.uploaded_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow modify applications" ON public.applications FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());

-- Job Candidates: Isolated by job opening requirement creator
CREATE POLICY "Allow view job candidates" ON public.job_candidates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow modify job candidates" ON public.job_candidates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());

-- Screening Questions: Isolated by job opening requirement creator
CREATE POLICY "Allow view questions" ON public.screening_questions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow modify questions" ON public.screening_questions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.job_openings j JOIN public.requirements r ON j.requirement_id = r.id WHERE j.id = job_opening_id AND r.created_by = auth.uid()) OR is_admin());

-- Interview Stages: Isolated by application's job opening requirement creator
CREATE POLICY "Allow view stages" ON public.interview_stages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.applications a JOIN public.job_openings j ON a.job_opening_id = j.id JOIN public.requirements r ON j.requirement_id = r.id WHERE a.id = application_id AND r.created_by = auth.uid()) OR is_admin());
CREATE POLICY "Allow modify stages" ON public.interview_stages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.applications a JOIN public.job_openings j ON a.job_opening_id = j.id JOIN public.requirements r ON j.requirement_id = r.id WHERE a.id = application_id AND r.created_by = auth.uid()) OR is_admin());

-- Activity Log: Isolated by actor_id
CREATE POLICY "Allow view log" ON public.activity_log FOR SELECT TO authenticated USING (auth.uid() = actor_id OR is_admin());
