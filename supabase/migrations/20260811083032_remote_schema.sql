-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE FUNCTION public.check_stage_notes_on_failure()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    IF NEW.outcome = 'failed' AND (NEW.notes IS NULL OR TRIM(NEW.notes) = '') THEN
        RAISE EXCEPTION 'Failure notes are required when setting interview stage outcome to failed.';
    END IF;
    RETURN NEW;
END;
$function$;

GRANT ALL ON FUNCTION public.check_stage_notes_on_failure() TO anon;

GRANT ALL ON FUNCTION public.check_stage_notes_on_failure() TO authenticated;

GRANT ALL ON FUNCTION public.check_stage_notes_on_failure() TO service_role;

CREATE FUNCTION public.handle_candidate_deduplication()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
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
$function$;

GRANT ALL ON FUNCTION public.handle_candidate_deduplication() TO anon;

GRANT ALL ON FUNCTION public.handle_candidate_deduplication() TO authenticated;

GRANT ALL ON FUNCTION public.handle_candidate_deduplication() TO service_role;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
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
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;

GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;

GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

CREATE FUNCTION public.handle_update_timestamp()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$;

GRANT ALL ON FUNCTION public.handle_update_timestamp() TO anon;

GRANT ALL ON FUNCTION public.handle_update_timestamp() TO authenticated;

GRANT ALL ON FUNCTION public.handle_update_timestamp() TO service_role;

CREATE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  AS $function$
    SELECT COALESCE(
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'),
        FALSE
    );
$function$;

GRANT ALL ON FUNCTION public.is_admin() TO anon;

GRANT ALL ON FUNCTION public.is_admin() TO authenticated;

GRANT ALL ON FUNCTION public.is_admin() TO service_role;

CREATE FUNCTION public.is_manager()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  AS $function$
    SELECT COALESCE(
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'manager'),
        FALSE
    );
$function$;

GRANT ALL ON FUNCTION public.is_manager() TO anon;

GRANT ALL ON FUNCTION public.is_manager() TO authenticated;

GRANT ALL ON FUNCTION public.is_manager() TO service_role;

CREATE FUNCTION public.is_recruiter()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  AS $function$
    SELECT COALESCE(
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'recruiter'),
        FALSE
    );
$function$;

GRANT ALL ON FUNCTION public.is_recruiter() TO anon;

GRANT ALL ON FUNCTION public.is_recruiter() TO authenticated;

GRANT ALL ON FUNCTION public.is_recruiter() TO service_role;

CREATE FUNCTION public.upsert_linkedin_account (
  p_user_id                uuid,
  p_linkedin_member_id     text,
  p_linkedin_access_token  text,
  p_linkedin_refresh_token text,
  p_expires_at             timestamp with time zone
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    INSERT INTO public.linkedin_accounts (
        user_id,
        linkedin_member_id,
        linkedin_access_token,
        linkedin_refresh_token,
        expires_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_linkedin_member_id,
        p_linkedin_access_token,
        p_linkedin_refresh_token,
        p_expires_at,
        NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        linkedin_member_id = EXCLUDED.linkedin_member_id,
        linkedin_access_token = EXCLUDED.linkedin_access_token,
        linkedin_refresh_token = EXCLUDED.linkedin_refresh_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW();
END;
$function$;

GRANT ALL ON FUNCTION public.upsert_linkedin_account(uuid, text, text, text, timestamp WITH time zone) TO anon;

GRANT ALL ON FUNCTION public.upsert_linkedin_account(uuid, text, text, text, timestamp WITH time zone) TO authenticated;

GRANT ALL ON FUNCTION public.upsert_linkedin_account(uuid, text, text, text, timestamp WITH time zone) TO service_role;

CREATE FUNCTION public.validate_job_skills_weight()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_total_weight NUMERIC;
BEGIN
    -- Only run validation when a job opening's status is changed to 'confirmed' or 'published'
    IF NEW.status IN ('confirmed', 'published') THEN
        SELECT COALESCE(SUM((skill->>'weight')::NUMERIC), 0) INTO v_total_weight
        FROM public.job_opening_skills jos,
             jsonb_array_elements(jos.skills) AS skill
        WHERE jos.job_opening_id = NEW.id;
        
        -- Accept 1.0 (decimal) or 100 (percentage)
        IF v_total_weight != 1.0 AND v_total_weight != 100 THEN
            RAISE EXCEPTION 'Total skill weights for confirmed/published job opening must equal 100%% (current sum: %)', v_total_weight;
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;

GRANT ALL ON FUNCTION public.validate_job_skills_weight() TO anon;

GRANT ALL ON FUNCTION public.validate_job_skills_weight() TO authenticated;

GRANT ALL ON FUNCTION public.validate_job_skills_weight() TO service_role;

CREATE TABLE public.activity_log (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  actor_id    uuid                     DEFAULT auth.uid(),
  actor_name  text,
  action      text                     NOT NULL,
  entity_type text                     NOT NULL,
  entity_id   uuid,
  metadata    jsonb                    DEFAULT '{}'::jsonb,
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.activity_log
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.activity_log
  ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);

GRANT ALL ON public.activity_log TO anon;

GRANT ALL ON public.activity_log TO authenticated;

GRANT ALL ON public.activity_log TO service_role;

CREATE INDEX idx_activity_log_entity ON public.activity_log (entity_type, entity_id);

CREATE INDEX idx_activity_log_created ON public.activity_log (created_at DESC);

CREATE POLICY "Allow insert log" ON public.activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow view log" ON public.activity_log
  FOR SELECT
  TO authenticated
  USING (((auth.uid() = actor_id) OR public.is_admin()));

CREATE TABLE public.applications (
  id                  uuid                     DEFAULT gen_random_uuid() NOT NULL,
  candidate_id        uuid                     NOT NULL,
  job_opening_id      uuid                     NOT NULL,
  candidate_cv        text,
  fuzzy_score         numeric,
  match_score         numeric,
  match_reason        text,
  strengths           text[]                   DEFAULT '{}'::text[],
  skill_gaps          text[]                   DEFAULT '{}'::text[],
  screening_status    text                     DEFAULT 'pending'::text,
  stage               text                     DEFAULT 'screening'::text,
  stage_status        text                     DEFAULT 'pending'::text,
  stage_notes         text,
  priority            integer                  DEFAULT 0,
  reviewed_by         uuid,
  reviewed_at         timestamp with time zone,
  created_at          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_deleted          boolean                  DEFAULT false,
  screening_questions jsonb                    DEFAULT '[]'::jsonb NOT NULL
);

ALTER TABLE public.applications
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_fuzzy_score_check CHECK (fuzzy_score >= 0::numeric AND fuzzy_score <= 100::numeric);

ALTER TABLE public.applications
  ADD CONSTRAINT applications_match_score_check CHECK (match_score >= 0::numeric AND match_score <= 100::numeric);

ALTER TABLE public.applications
  ADD CONSTRAINT applications_pkey PRIMARY KEY (id);

ALTER TABLE public.applications
  ADD CONSTRAINT applications_screening_status_check CHECK (screening_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'shortlisted'::text]));

ALTER TABLE public.applications
  ADD CONSTRAINT applications_stage_status_check CHECK (stage_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'passed'::text, 'failed'::text, 'on_hold'::text]));

ALTER TABLE public.applications
  ADD CONSTRAINT uq_candidate_job_application UNIQUE (candidate_id, job_opening_id);

GRANT ALL ON public.applications TO anon;

GRANT ALL ON public.applications TO authenticated;

GRANT ALL ON public.applications TO service_role;

CREATE INDEX idx_applications_job ON public.applications (job_opening_id);

CREATE INDEX idx_applications_candidate ON public.applications (candidate_id);

CREATE INDEX idx_applications_stage ON public.applications (stage);

CREATE INDEX idx_applications_screening_status ON public.applications (screening_status);

CREATE INDEX idx_applications_is_deleted ON public.applications (is_deleted);

CREATE TRIGGER set_timestamp_applications
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_timestamp();

CREATE TABLE public.approval_logs (
  id          text                     DEFAULT (gen_random_uuid())::text NOT NULL,
  pipeline_id text                     NOT NULL,
  stage_id    text,
  actor_id    text,
  actor_name  text,
  action      text                     NOT NULL,
  notes       text,
  metadata    jsonb                    DEFAULT '{}'::jsonb,
  created_at  timestamp with time zone DEFAULT now()
);

ALTER TABLE public.approval_logs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.approval_logs
  ADD CONSTRAINT approval_logs_pkey PRIMARY KEY (id);

GRANT ALL ON public.approval_logs TO anon;

GRANT ALL ON public.approval_logs TO authenticated;

GRANT ALL ON public.approval_logs TO service_role;

CREATE TABLE public.approval_pipeline_access (
  id           text                     DEFAULT (gen_random_uuid())::text NOT NULL,
  pipeline_id  text                     NOT NULL,
  role_id      text,
  member_id    text,
  access_level text                     DEFAULT 'view'::text NOT NULL,
  created_at   timestamp with time zone DEFAULT now()
);

ALTER TABLE public.approval_pipeline_access
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.approval_pipeline_access
  ADD CONSTRAINT approval_pipeline_access_pkey PRIMARY KEY (id);

GRANT ALL ON public.approval_pipeline_access TO anon;

GRANT ALL ON public.approval_pipeline_access TO authenticated;

GRANT ALL ON public.approval_pipeline_access TO service_role;

CREATE INDEX idx_approval_access_pipeline ON public.approval_pipeline_access (pipeline_id);

CREATE TABLE public.approval_pipelines (
  id                  text                     DEFAULT (gen_random_uuid())::text NOT NULL,
  organization_id     text                     NOT NULL,
  name                text                     NOT NULL,
  description         text,
  is_template         boolean                  DEFAULT false,
  entity_type         text                     DEFAULT 'custom'::text NOT NULL,
  entity_id           text,
  custom_content      jsonb,
  created_by          text,
  current_stage_index integer                  DEFAULT 0,
  status              text                     DEFAULT 'draft'::text NOT NULL,
  created_at          timestamp with time zone DEFAULT now(),
  updated_at          timestamp with time zone DEFAULT now()
);

ALTER TABLE public.approval_pipelines
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.approval_pipelines
  ADD CONSTRAINT approval_pipelines_pkey PRIMARY KEY (id);

ALTER TABLE public.approval_logs
  ADD CONSTRAINT approval_logs_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.approval_pipelines(id) ON DELETE CASCADE;

ALTER TABLE public.approval_pipeline_access
  ADD CONSTRAINT approval_pipeline_access_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.approval_pipelines(id) ON DELETE CASCADE;

GRANT ALL ON public.approval_pipelines TO anon;

GRANT ALL ON public.approval_pipelines TO authenticated;

GRANT ALL ON public.approval_pipelines TO service_role;

CREATE INDEX idx_approval_pipelines_org ON public.approval_pipelines (organization_id);

CREATE INDEX idx_approval_pipelines_status ON public.approval_pipelines (status);

CREATE TABLE public.approval_rejection_checklists (
  id                 text                     DEFAULT (gen_random_uuid())::text NOT NULL,
  pipeline_id        text                     NOT NULL,
  stage_id           text                     NOT NULL,
  rejected_by        text,
  reasons            jsonb                    DEFAULT '[]'::jsonb,
  highlighted_fields jsonb                    DEFAULT '[]'::jsonb,
  feedback_notes     text,
  created_at         timestamp with time zone DEFAULT now()
);

ALTER TABLE public.approval_rejection_checklists
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.approval_rejection_checklists
  ADD CONSTRAINT approval_rejection_checklists_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.approval_pipelines(id) ON DELETE CASCADE;

ALTER TABLE public.approval_rejection_checklists
  ADD CONSTRAINT approval_rejection_checklists_pkey PRIMARY KEY (id);

GRANT ALL ON public.approval_rejection_checklists TO anon;

GRANT ALL ON public.approval_rejection_checklists TO authenticated;

GRANT ALL ON public.approval_rejection_checklists TO service_role;

CREATE TABLE public.approval_stage_approvers (
  id           text                     DEFAULT (gen_random_uuid())::text NOT NULL,
  stage_id     text                     NOT NULL,
  role_id      text,
  member_id    text,
  has_approved boolean                  DEFAULT false,
  approved_at  timestamp with time zone,
  notes        text,
  created_at   timestamp with time zone DEFAULT now()
);

ALTER TABLE public.approval_stage_approvers
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.approval_stage_approvers
  ADD CONSTRAINT approval_stage_approvers_pkey PRIMARY KEY (id);

GRANT ALL ON public.approval_stage_approvers TO anon;

GRANT ALL ON public.approval_stage_approvers TO authenticated;

GRANT ALL ON public.approval_stage_approvers TO service_role;

CREATE INDEX idx_approval_approvers_stage ON public.approval_stage_approvers (stage_id);

CREATE INDEX idx_approval_approvers_member ON public.approval_stage_approvers (member_id);

CREATE TABLE public.approval_stages (
  id                    text                     DEFAULT (gen_random_uuid())::text NOT NULL,
  pipeline_id           text                     NOT NULL,
  stage_index           integer                  DEFAULT 0 NOT NULL,
  stage_name            text                     NOT NULL,
  require_all_approvers boolean                  DEFAULT false,
  status                text                     DEFAULT 'pending'::text NOT NULL,
  created_at            timestamp with time zone DEFAULT now()
);

ALTER TABLE public.approval_stages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.approval_stages
  ADD CONSTRAINT approval_stages_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.approval_pipelines(id) ON DELETE CASCADE;

ALTER TABLE public.approval_stages
  ADD CONSTRAINT approval_stages_pkey PRIMARY KEY (id);

ALTER TABLE public.approval_logs
  ADD CONSTRAINT approval_logs_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.approval_stages(id) ON DELETE SET NULL;

ALTER TABLE public.approval_rejection_checklists
  ADD CONSTRAINT approval_rejection_checklists_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.approval_stages(id) ON DELETE CASCADE;

ALTER TABLE public.approval_stage_approvers
  ADD CONSTRAINT approval_stage_approvers_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.approval_stages(id) ON DELETE CASCADE;

GRANT ALL ON public.approval_stages TO anon;

GRANT ALL ON public.approval_stages TO authenticated;

GRANT ALL ON public.approval_stages TO service_role;

CREATE INDEX idx_approval_stages_pipeline ON public.approval_stages (pipeline_id);

CREATE TABLE public.audit_logs (
  id                 character varying(36)    DEFAULT gen_random_uuid() NOT NULL,
  organization_id    character varying(36),
  actor_id           character varying(36),
  actor_name         character varying(255)   NOT NULL,
  action_description character varying(255)   NOT NULL,
  target_name        character varying(255)   NOT NULL,
  action_type        character varying(50)    NOT NULL,
  created_at         timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.audit_logs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

GRANT ALL ON public.audit_logs TO anon;

GRANT ALL ON public.audit_logs TO authenticated;

GRANT ALL ON public.audit_logs TO service_role;

CREATE TABLE public.branches (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  organization_id character varying(100)   NOT NULL,
  name            character varying(150)   NOT NULL,
  code            character varying(50)    DEFAULT 'MAIN'::character varying,
  location        character varying(200)   DEFAULT 'HQ'::character varying,
  created_at      timestamp with time zone DEFAULT now(),
  updated_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.branches
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.branches
  ADD CONSTRAINT branches_pkey PRIMARY KEY (id);

GRANT ALL ON public.branches TO anon;

GRANT ALL ON public.branches TO authenticated;

GRANT ALL ON public.branches TO service_role;

CREATE INDEX idx_branches_org_id ON public.branches (organization_id);

CREATE TABLE public.candidate_queries (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  job_id          uuid                     NOT NULL,
  candidate_email text                     NOT NULL,
  query_text      text                     NOT NULL,
  ai_response     text,
  is_resolved     boolean                  DEFAULT false,
  created_at      timestamp with time zone DEFAULT now(),
  source          text                     DEFAULT 'apply_form'::text,
  sender          text                     DEFAULT 'candidate'::text,
  is_ended        boolean                  DEFAULT false
);

ALTER TABLE public.candidate_queries
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.candidate_queries
  ADD CONSTRAINT candidate_queries_pkey PRIMARY KEY (id);

ALTER TABLE public.candidate_queries
  ADD CONSTRAINT candidate_queries_sender_check CHECK (sender = ANY (ARRAY['candidate'::text, 'recruiter'::text, 'ai'::text]));

ALTER TABLE public.candidate_queries
  ADD CONSTRAINT candidate_queries_source_check CHECK (source = ANY (ARRAY['apply_form'::text, 'tracking_portal'::text]));

GRANT ALL ON public.candidate_queries TO anon;

GRANT ALL ON public.candidate_queries TO authenticated;

GRANT ALL ON public.candidate_queries TO service_role;

CREATE INDEX idx_candidate_queries_convo ON public.candidate_queries (candidate_email, job_id, is_ended);

CREATE POLICY "Allow anonymous view candidate queries" ON public.candidate_queries
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow insert candidate queries" ON public.candidate_queries
  FOR INSERT
  WITH CHECK (true);

CREATE TABLE public.candidates (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  full_name          text                     NOT NULL,
  email              text                     NOT NULL,
  phone              text,
  skills             text[]                   DEFAULT '{}'::text[],
  experience_years   integer                  DEFAULT 0,
  current_company    text,
  resume_url         text,
  parsed_resume_json jsonb,
  source             text,
  uploaded_by        uuid                     DEFAULT auth.uid(),
  created_at         timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at         timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_deleted         boolean                  DEFAULT false,
  education          text,
  working_or_not     boolean                  DEFAULT true,
  academic_details   text,
  achievements       text,
  job_id             uuid
);

ALTER TABLE public.candidates
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);

ALTER TABLE public.applications
  ADD CONSTRAINT applications_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_source_check CHECK (source = ANY (ARRAY['csv'::text, 'pdf'::text, 'docx'::text, 'manual'::text]));

GRANT ALL ON public.candidates TO anon;

GRANT ALL ON public.candidates TO authenticated;

GRANT ALL ON public.candidates TO service_role;

CREATE INDEX idx_candidates_email ON public.candidates (email);

CREATE INDEX idx_candidates_is_deleted ON public.candidates (is_deleted);

CREATE UNIQUE INDEX uq_candidates_email_job_id ON public.candidates (email, job_id)
  WHERE job_id IS NOT NULL;

CREATE UNIQUE INDEX uq_candidates_email_no_job ON public.candidates (email)
  WHERE job_id IS NULL;

CREATE INDEX idx_candidates_skills ON public.candidates USING gin (skills);

CREATE TRIGGER set_timestamp_candidates
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_timestamp();

CREATE TRIGGER trigger_candidate_deduplication
  BEFORE INSERT ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_candidate_deduplication();

CREATE POLICY "Allow anonymous insert of candidates" ON public.candidates
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read of candidates" ON public.candidates
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous update of candidates" ON public.candidates
  FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow modify candidates" ON public.candidates
  TO authenticated
  USING (((auth.uid() = uploaded_by) OR public.is_admin()));

CREATE POLICY "Allow view candidates" ON public.candidates
  FOR SELECT
  TO authenticated
  USING (((auth.uid() = uploaded_by) OR public.is_admin()));

CREATE TABLE public.clients (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  name       text                     NOT NULL,
  created_by uuid                     DEFAULT auth.uid(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_deleted boolean                  DEFAULT false
);

ALTER TABLE public.clients
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_name_created_by_key UNIQUE (name, created_by);

ALTER TABLE public.clients
  ADD CONSTRAINT clients_pkey PRIMARY KEY (id);

GRANT ALL ON public.clients TO anon;

GRANT ALL ON public.clients TO authenticated;

GRANT ALL ON public.clients TO service_role;

CREATE INDEX idx_clients_is_deleted ON public.clients (is_deleted);

CREATE TRIGGER set_timestamp_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_timestamp();

CREATE POLICY "Allow admin to delete clients" ON public.clients
  FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Allow anonymous view clients" ON public.clients
  FOR SELECT
  TO anon
  USING ((is_deleted = false));

CREATE POLICY "Allow recruiters to modify clients" ON public.clients
  FOR INSERT
  WITH CHECK (((auth.uid() = created_by) OR public.is_admin()));

CREATE POLICY "Allow recruiters to update clients" ON public.clients
  FOR UPDATE
  USING (((auth.uid() = created_by) OR public.is_admin()));

CREATE POLICY "Allow recruiters to view clients" ON public.clients
  FOR SELECT
  TO authenticated
  USING (((auth.uid() = created_by) OR public.is_admin()));

CREATE TABLE public.interview_assignments (
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  job_candidate_id uuid,
  interviewer_id   character varying(36),
  round_name       character varying(150)   DEFAULT 'Technical Round'::character varying NOT NULL,
  scheduled_at     timestamp with time zone,
  status           character varying(50)    DEFAULT 'scheduled'::character varying,
  created_at       timestamp with time zone DEFAULT now()
);

ALTER TABLE public.interview_assignments
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.interview_assignments
  ADD CONSTRAINT interview_assignments_pkey PRIMARY KEY (id);

GRANT ALL ON public.interview_assignments TO anon;

GRANT ALL ON public.interview_assignments TO authenticated;

GRANT ALL ON public.interview_assignments TO service_role;

CREATE TABLE public.interview_feedback (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  assignment_id  uuid,
  interviewer_id character varying(36),
  recommendation character varying(50)    NOT NULL,
  ratings        jsonb                    DEFAULT '{}'::jsonb,
  notes          text,
  submitted_at   timestamp with time zone DEFAULT now(),
  locked_at      timestamp with time zone DEFAULT now()
);

ALTER TABLE public.interview_feedback
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.interview_feedback
  ADD CONSTRAINT interview_feedback_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.interview_assignments(id) ON DELETE CASCADE;

ALTER TABLE public.interview_feedback
  ADD CONSTRAINT interview_feedback_pkey PRIMARY KEY (id);

GRANT ALL ON public.interview_feedback TO anon;

GRANT ALL ON public.interview_feedback TO authenticated;

GRANT ALL ON public.interview_feedback TO service_role;

CREATE TABLE public.interview_stages (
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  application_id   uuid                     NOT NULL,
  job_candidate_id uuid,
  stage_name       text                     NOT NULL,
  stage_order      integer                  DEFAULT 1,
  status           text                     DEFAULT 'scheduled'::text,
  outcome          text                     DEFAULT 'pending'::text,
  notes            text,
  scheduled_at     timestamp with time zone,
  completed_at     timestamp with time zone,
  updated_by       uuid,
  created_at       timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at       timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.interview_stages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.interview_stages
  ADD CONSTRAINT interview_stages_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE public.interview_stages
  ADD CONSTRAINT interview_stages_outcome_check CHECK (outcome = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text, 'on_hold'::text]));

ALTER TABLE public.interview_stages
  ADD CONSTRAINT interview_stages_pkey PRIMARY KEY (id);

ALTER TABLE public.interview_stages
  ADD CONSTRAINT interview_stages_status_check CHECK (status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'cancelled'::text]));

GRANT ALL ON public.interview_stages TO anon;

GRANT ALL ON public.interview_stages TO authenticated;

GRANT ALL ON public.interview_stages TO service_role;

CREATE INDEX idx_interview_stages_application ON public.interview_stages (application_id);

CREATE TRIGGER set_timestamp_interview_stages
  BEFORE UPDATE ON public.interview_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_timestamp();

CREATE TRIGGER trigger_interview_stage_failure_check
  BEFORE INSERT OR UPDATE ON public.interview_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stage_notes_on_failure();

CREATE TABLE public.job_candidates (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  job_opening_id uuid                     NOT NULL,
  candidate_id   uuid                     NOT NULL,
  application_id uuid,
  fuzzy_score    numeric                  NOT NULL,
  rank_order     integer                  NOT NULL,
  strengths      text[]                   DEFAULT '{}'::text[],
  skill_gaps     text[]                   DEFAULT '{}'::text[],
  ai_reasoning   text,
  status         text                     DEFAULT 'pending'::text,
  created_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  parsed_resume  jsonb
);

ALTER TABLE public.job_candidates
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.job_candidates
  ADD CONSTRAINT job_candidates_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;

ALTER TABLE public.job_candidates
  ADD CONSTRAINT job_candidates_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;

ALTER TABLE public.job_candidates
  ADD CONSTRAINT job_candidates_fuzzy_score_check CHECK (fuzzy_score >= 0::numeric AND fuzzy_score <= 100::numeric);

ALTER TABLE public.job_candidates
  ADD CONSTRAINT job_candidates_pkey PRIMARY KEY (id);

ALTER TABLE public.interview_assignments
  ADD CONSTRAINT interview_assignments_job_candidate_id_fkey FOREIGN KEY (job_candidate_id) REFERENCES public.job_candidates(id) ON DELETE CASCADE;

ALTER TABLE public.interview_stages
  ADD CONSTRAINT interview_stages_job_candidate_id_fkey FOREIGN KEY (job_candidate_id) REFERENCES public.job_candidates(id) ON DELETE SET NULL;

ALTER TABLE public.job_candidates
  ADD CONSTRAINT job_candidates_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text]));

ALTER TABLE public.job_candidates
  ADD CONSTRAINT uq_job_candidates_opening_candidate UNIQUE (job_opening_id, candidate_id);

GRANT ALL ON public.job_candidates TO anon;

GRANT ALL ON public.job_candidates TO authenticated;

GRANT ALL ON public.job_candidates TO service_role;

CREATE INDEX idx_job_candidates_opening ON public.job_candidates (job_opening_id);

CREATE INDEX idx_job_candidates_rank ON public.job_candidates (rank_order);

CREATE INDEX idx_job_candidates_fuzzy_score ON public.job_candidates (fuzzy_score DESC);

CREATE TABLE public.job_opening_skills (
  job_opening_id uuid                     NOT NULL,
  skills         jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  created_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.job_opening_skills
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.job_opening_skills
  ADD CONSTRAINT job_opening_skills_pkey PRIMARY KEY (job_opening_id);

GRANT ALL ON public.job_opening_skills TO anon;

GRANT ALL ON public.job_opening_skills TO authenticated;

GRANT ALL ON public.job_opening_skills TO service_role;

CREATE TABLE public.job_openings (
  id                      uuid                     DEFAULT gen_random_uuid() NOT NULL,
  requirement_id          uuid                     NOT NULL,
  post_index              integer                  DEFAULT 1,
  title                   text,
  description             text,
  responsibilities        text[]                   DEFAULT '{}'::text[],
  qualifications          text[]                   DEFAULT '{}'::text[],
  keywords                text[]                   DEFAULT '{}'::text[],
  salary_range            text,
  status                  text                     DEFAULT 'draft'::text,
  processing_status       text                     DEFAULT 'idle'::text,
  error_message           text,
  ai_generated            boolean                  DEFAULT true,
  approved_by             uuid,
  created_at              timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at              timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  published_at            timestamp with time zone,
  is_deleted              boolean                  DEFAULT false,
  custom_stages           text[]                   DEFAULT ARRAY['technical'::text,
  'hr'::text,
  'final'::text],
  category                text,
  sub_category            text,
  candidate_view_settings jsonb                    DEFAULT '{}'::jsonb,
  stage_notifications     jsonb                    DEFAULT '{}'::jsonb
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log, TABLE public.interview_stages, TABLE public.job_candidates, TABLE public.job_openings;

ALTER TABLE public.job_openings
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.job_openings
  ADD CONSTRAINT job_openings_category_check CHECK (category = ANY (ARRAY['technical'::text, 'non-technical'::text]));

ALTER TABLE public.job_openings
  ADD CONSTRAINT job_openings_pkey PRIMARY KEY (id);

ALTER TABLE public.applications
  ADD CONSTRAINT applications_job_opening_id_fkey FOREIGN KEY (job_opening_id) REFERENCES public.job_openings(id) ON DELETE CASCADE;

ALTER TABLE public.candidate_queries
  ADD CONSTRAINT candidate_queries_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_openings(id) ON DELETE CASCADE;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.job_openings(id) ON DELETE SET NULL;

ALTER TABLE public.job_candidates
  ADD CONSTRAINT job_candidates_job_opening_id_fkey FOREIGN KEY (job_opening_id) REFERENCES public.job_openings(id) ON DELETE CASCADE;

ALTER TABLE public.job_opening_skills
  ADD CONSTRAINT job_opening_skills_job_opening_id_fkey FOREIGN KEY (job_opening_id) REFERENCES public.job_openings(id) ON DELETE CASCADE;

ALTER TABLE public.job_openings
  ADD CONSTRAINT job_openings_processing_status_check
    CHECK (processing_status = ANY (ARRAY['idle'::text, 'generating'::text, 'skill_approval'::text, 'matching'::text, 'questions_ready'::text, 'ready'::text, 'error'::text]));

ALTER TABLE public.job_openings
  ADD CONSTRAINT job_openings_status_check CHECK (status = ANY (ARRAY['draft'::text, 'confirmed'::text, 'published'::text, 'closed'::text]));

GRANT ALL ON public.job_openings TO anon;

GRANT ALL ON public.job_openings TO authenticated;

GRANT ALL ON public.job_openings TO service_role;

CREATE INDEX idx_job_openings_is_deleted ON public.job_openings (is_deleted);

CREATE INDEX idx_job_openings_req ON public.job_openings (requirement_id);

CREATE INDEX idx_job_openings_status ON public.job_openings (status);

CREATE TRIGGER set_timestamp_job_openings
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_timestamp();

CREATE TRIGGER trigger_validate_job_skills_weight
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_job_skills_weight();

CREATE POLICY "Allow admin to delete jobs" ON public.job_openings
  FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Allow anonymous view active jobs" ON public.job_openings
  FOR SELECT
  TO anon
  USING ((is_deleted = false));

CREATE TABLE public.linkedin_accounts (
  id                     uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id                uuid                     NOT NULL,
  linkedin_member_id     text                     NOT NULL,
  linkedin_access_token  text                     NOT NULL,
  linkedin_refresh_token text,
  company_page_id        text,
  expires_at             timestamp with time zone,
  created_at             timestamp with time zone DEFAULT now(),
  updated_at             timestamp with time zone DEFAULT now()
);

ALTER TABLE public.linkedin_accounts
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.linkedin_accounts
  ADD CONSTRAINT linkedin_accounts_pkey PRIMARY KEY (id);

ALTER TABLE public.linkedin_accounts
  ADD CONSTRAINT linkedin_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.linkedin_accounts
  ADD CONSTRAINT uq_linkedin_user UNIQUE (user_id);

GRANT ALL ON public.linkedin_accounts TO anon;

GRANT ALL ON public.linkedin_accounts TO authenticated;

GRANT ALL ON public.linkedin_accounts TO service_role;

CREATE POLICY "Allow insert/update for owner" ON public.linkedin_accounts
  USING ((auth.uid() = user_id));

CREATE POLICY "Allow select for owner" ON public.linkedin_accounts
  FOR SELECT
  USING ((auth.uid() = user_id));

CREATE TABLE public.member_manager_assignments (
  id                uuid                     DEFAULT gen_random_uuid() NOT NULL,
  member_id         character varying(36)    NOT NULL,
  role_id           character varying(36)    NOT NULL,
  manager_member_id character varying(36),
  branch_name       character varying(100)   DEFAULT 'Main Branch'::character varying,
  created_at        timestamp with time zone DEFAULT now()
);

ALTER TABLE public.member_manager_assignments
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.member_manager_assignments
  ADD CONSTRAINT member_manager_assignments_pkey PRIMARY KEY (id);

ALTER TABLE public.member_manager_assignments
  ADD CONSTRAINT unique_member_role_assignment UNIQUE (member_id, role_id);

GRANT ALL ON public.member_manager_assignments TO anon;

GRANT ALL ON public.member_manager_assignments TO authenticated;

GRANT ALL ON public.member_manager_assignments TO service_role;

CREATE INDEX idx_mma_manager_member_id ON public.member_manager_assignments (manager_member_id);

CREATE INDEX idx_mma_member_id ON public.member_manager_assignments (member_id);

CREATE INDEX idx_mma_role_id ON public.member_manager_assignments (role_id);

CREATE TABLE public.member_roles (
  member_id character varying(36) NOT NULL,
  role_id   character varying(36) NOT NULL
);

ALTER TABLE public.member_roles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.member_roles
  ADD CONSTRAINT member_roles_pkey PRIMARY KEY (member_id, role_id);

GRANT ALL ON public.member_roles TO anon;

GRANT ALL ON public.member_roles TO authenticated;

GRANT ALL ON public.member_roles TO service_role;

CREATE TABLE public.members (
  id                   character varying(36)    DEFAULT gen_random_uuid() NOT NULL,
  organization_id      character varying(36),
  name                 character varying(255)   NOT NULL,
  email                character varying(255)   NOT NULL,
  password_hash        character varying(255)   NOT NULL,
  avatar_initials      character varying(4)     NOT NULL,
  must_change_password boolean                  DEFAULT true,
  status               character varying(50)    DEFAULT 'active'::character varying,
  created_at           timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  terms_accepted       boolean                  DEFAULT false,
  terms_accepted_at    timestamp with time zone,
  invitation_sent_at   timestamp with time zone,
  is_primary_admin     boolean                  DEFAULT false,
  manager_member_id    character varying(36)
);

ALTER TABLE public.members
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.members
  ADD CONSTRAINT members_email_key UNIQUE (email);

ALTER TABLE public.members
  ADD CONSTRAINT members_pkey PRIMARY KEY (id);

ALTER TABLE public.approval_logs
  ADD CONSTRAINT approval_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.members(id) ON DELETE SET NULL;

ALTER TABLE public.approval_pipeline_access
  ADD CONSTRAINT approval_pipeline_access_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE public.approval_pipelines
  ADD CONSTRAINT approval_pipelines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.members(id) ON DELETE SET NULL;

ALTER TABLE public.approval_rejection_checklists
  ADD CONSTRAINT approval_rejection_checklists_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.members(id) ON DELETE SET NULL;

ALTER TABLE public.approval_stage_approvers
  ADD CONSTRAINT approval_stage_approvers_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.members(id) ON DELETE SET NULL;

ALTER TABLE public.interview_assignments
  ADD CONSTRAINT interview_assignments_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE public.interview_feedback
  ADD CONSTRAINT interview_feedback_interviewer_id_fkey FOREIGN KEY (interviewer_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE public.member_manager_assignments
  ADD CONSTRAINT member_manager_assignments_manager_member_id_fkey FOREIGN KEY (manager_member_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE public.member_manager_assignments
  ADD CONSTRAINT member_manager_assignments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE public.member_roles
  ADD CONSTRAINT member_roles_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

ALTER TABLE public.members
  ADD CONSTRAINT members_manager_member_id_fkey FOREIGN KEY (manager_member_id) REFERENCES public.members(id) ON DELETE SET NULL;

GRANT ALL ON public.members TO anon;

GRANT ALL ON public.members TO authenticated;

GRANT ALL ON public.members TO service_role;

CREATE INDEX idx_members_email ON public.members (email);

CREATE INDEX idx_members_manager_id ON public.members (manager_member_id);

CREATE INDEX idx_members_is_primary_admin ON public.members (is_primary_admin);

CREATE INDEX idx_members_org_id ON public.members (organization_id);

CREATE TABLE public.notifications (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  recruiter_id uuid                     NOT NULL,
  title        text                     NOT NULL,
  message      text                     NOT NULL,
  type         text                     NOT NULL,
  is_read      boolean                  DEFAULT false NOT NULL,
  metadata     jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  created_at   timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY['job_generation'::text, 'candidate_matching'::text, 'upload'::text, 'error'::text, 'screening_questions'::text]));

GRANT ALL ON public.notifications TO anon;

GRANT ALL ON public.notifications TO authenticated;

GRANT ALL ON public.notifications TO service_role;

CREATE INDEX idx_notifications_recruiter_created ON public.notifications (recruiter_id, created_at DESC);

CREATE POLICY "Allow modify notifications" ON public.notifications
  TO authenticated
  USING (((auth.uid() = recruiter_id) OR public.is_admin()));

CREATE POLICY "Allow view notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (((auth.uid() = recruiter_id) OR public.is_admin()));

CREATE TABLE public.organizations (
  id                     character varying(36)    DEFAULT gen_random_uuid() NOT NULL,
  name                   character varying(255)   NOT NULL,
  operating_mode         character varying(50)    DEFAULT 'internal'::character varying NOT NULL,
  default_landing_portal character varying(50)    DEFAULT 'admin'::character varying NOT NULL,
  created_at             timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at             timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  max_members_limit      integer                  DEFAULT 10,
  max_roles_limit        integer                  DEFAULT 5,
  can_manage_pipelines   boolean                  DEFAULT true,
  can_view_audit_logs    boolean                  DEFAULT true
);

ALTER TABLE public.organizations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);

ALTER TABLE public.approval_pipelines
  ADD CONSTRAINT approval_pipelines_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.branches
  ADD CONSTRAINT branches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.members
  ADD CONSTRAINT members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

GRANT ALL ON public.organizations TO anon;

GRANT ALL ON public.organizations TO authenticated;

GRANT ALL ON public.organizations TO service_role;

CREATE TABLE public.pending_approvals (
  id                  character varying(36)    DEFAULT gen_random_uuid() NOT NULL,
  pipeline_id         character varying(36),
  item_title          character varying(255)   NOT NULL,
  requestor_id        character varying(36),
  current_stage_step  integer                  NOT NULL,
  current_stage_title character varying(255)   NOT NULL,
  required_role_id    character varying(36),
  status              character varying(50)    DEFAULT 'Pending Review'::character varying,
  submitted_at        timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.pending_approvals
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pending_approvals
  ADD CONSTRAINT pending_approvals_pkey PRIMARY KEY (id);

ALTER TABLE public.pending_approvals
  ADD CONSTRAINT pending_approvals_requestor_id_fkey FOREIGN KEY (requestor_id) REFERENCES public.members(id) ON DELETE CASCADE;

GRANT ALL ON public.pending_approvals TO anon;

GRANT ALL ON public.pending_approvals TO authenticated;

GRANT ALL ON public.pending_approvals TO service_role;

CREATE TABLE public.pipeline_stages (
  id               character varying(36)    DEFAULT gen_random_uuid() NOT NULL,
  pipeline_id      character varying(36),
  step_number      integer                  NOT NULL,
  stage_title      character varying(255)   NOT NULL,
  required_role_id character varying(36),
  sla_hours        integer                  DEFAULT 24,
  created_at       timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.pipeline_stages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pipeline_stages
  ADD CONSTRAINT pipeline_stages_pkey PRIMARY KEY (id);

GRANT ALL ON public.pipeline_stages TO anon;

GRANT ALL ON public.pipeline_stages TO authenticated;

GRANT ALL ON public.pipeline_stages TO service_role;

CREATE TABLE public.profiles (
  id           uuid                     NOT NULL,
  email        text                     NOT NULL,
  full_name    text,
  avatar_url   text,
  role         text                     DEFAULT 'recruiter'::text,
  is_active    boolean                  DEFAULT true,
  is_onboarded boolean                  DEFAULT false,
  created_at   timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at   timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_email_key UNIQUE (email);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.activity_log
  ADD CONSTRAINT activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.interview_stages
  ADD CONSTRAINT interview_stages_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.job_openings
  ADD CONSTRAINT job_openings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_recruiter_id_fkey FOREIGN KEY (recruiter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['admin'::text, 'recruiter'::text, 'manager'::text, 'client'::text]));

GRANT ALL ON public.profiles TO anon;

GRANT ALL ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE INDEX idx_profiles_email ON public.profiles (email);

CREATE TRIGGER set_timestamp_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_timestamp();

CREATE POLICY "Allow admin full access profiles" ON public.profiles
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Allow public read of profiles" ON public.profiles
  FOR SELECT
  USING (((auth.uid() = id) OR public.is_admin()));

CREATE POLICY "Allow self-insert profiles" ON public.profiles
  FOR INSERT
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Allow self-update profiles" ON public.profiles
  FOR UPDATE
  USING ((auth.uid() = id));

CREATE TABLE public.requirements (
  id                  uuid                     DEFAULT gen_random_uuid() NOT NULL,
  client_id           uuid                     NOT NULL,
  title               text                     NOT NULL,
  description         text,
  skills              text[]                   DEFAULT '{}'::text[],
  experience_min      integer                  DEFAULT 0,
  experience_max      integer                  DEFAULT 30,
  budget_min          numeric                  DEFAULT 0,
  budget_max          numeric                  DEFAULT 1000,
  seniority           text,
  notes               text,
  num_posts_requested integer                  DEFAULT 1,
  status              text                     DEFAULT 'draft'::text,
  created_by          uuid                     DEFAULT auth.uid(),
  created_at          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at          timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_deleted          boolean                  DEFAULT false
);

CREATE POLICY "Allow modify applications" ON public.applications
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM (public.job_openings j
     JOIN public.requirements r ON ((j.requirement_id = r.id)))
  WHERE ((j.id = applications.job_opening_id) AND (r.created_by = auth.uid())))) OR public.is_admin()));

CREATE POLICY "Allow view applications" ON public.applications
  FOR SELECT
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM (public.job_openings j
     JOIN public.requirements r ON ((j.requirement_id = r.id)))
  WHERE ((j.id = applications.job_opening_id) AND (r.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.candidates c
  WHERE ((c.id = applications.candidate_id) AND (c.uploaded_by = auth.uid())))) OR public.is_admin()));

CREATE POLICY "Allow resolve candidate queries" ON public.candidate_queries
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.job_openings j
     JOIN public.requirements r ON ((j.requirement_id = r.id)))
  WHERE ((j.id = candidate_queries.job_id) AND (r.created_by = auth.uid())))));

CREATE POLICY "Allow view candidate queries" ON public.candidate_queries
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.job_openings j
     JOIN public.requirements r ON ((j.requirement_id = r.id)))
  WHERE ((j.id = candidate_queries.job_id) AND (r.created_by = auth.uid())))));

CREATE POLICY "Allow modify stages" ON public.interview_stages
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM ((public.applications a
     JOIN public.job_openings j ON ((a.job_opening_id = j.id)))
     JOIN public.requirements r ON ((j.requirement_id = r.id)))
  WHERE ((a.id = interview_stages.application_id) AND (r.created_by = auth.uid())))) OR public.is_admin()));

CREATE POLICY "Allow view stages" ON public.interview_stages
  FOR SELECT
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM ((public.applications a
     JOIN public.job_openings j ON ((a.job_opening_id = j.id)))
     JOIN public.requirements r ON ((j.requirement_id = r.id)))
  WHERE ((a.id = interview_stages.application_id) AND (r.created_by = auth.uid())))) OR public.is_admin()));

CREATE POLICY "Allow modify job candidates" ON public.job_candidates
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM (public.job_openings j
     JOIN public.requirements r ON ((j.requirement_id = r.id)))
  WHERE ((j.id = job_candidates.job_opening_id) AND (r.created_by = auth.uid())))) OR public.is_admin()));

CREATE POLICY "Allow view job candidates" ON public.job_candidates
  FOR SELECT
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM (public.job_openings j
     JOIN public.requirements r ON ((j.requirement_id = r.id)))
  WHERE ((j.id = job_candidates.job_opening_id) AND (r.created_by = auth.uid())))) OR public.is_admin()));

CREATE POLICY "Allow modify skills" ON public.job_opening_skills
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM (public.job_openings j
     JOIN public.requirements r ON ((j.requirement_id = r.id)))
  WHERE ((j.id = job_opening_skills.job_opening_id) AND (r.created_by = auth.uid())))) OR public.is_admin()));

CREATE POLICY "Allow view skills" ON public.job_opening_skills
  FOR SELECT
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM (public.job_openings j
     JOIN public.requirements r ON ((j.requirement_id = r.id)))
  WHERE ((j.id = job_opening_skills.job_opening_id) AND (r.created_by = auth.uid())))) OR public.is_admin()));

CREATE POLICY "Allow recruiters to modify jobs" ON public.job_openings
  FOR INSERT
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.requirements r
  WHERE ((r.id = job_openings.requirement_id) AND (r.created_by = auth.uid())))) OR public.is_admin()));

CREATE POLICY "Allow recruiters to update jobs" ON public.job_openings
  FOR UPDATE
  USING (((EXISTS ( SELECT 1
   FROM public.requirements r
  WHERE ((r.id = job_openings.requirement_id) AND (r.created_by = auth.uid())))) OR public.is_admin()));

CREATE POLICY "Allow recruiters to view jobs" ON public.job_openings
  FOR SELECT
  TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.requirements r
  WHERE ((r.id = job_openings.requirement_id) AND (r.created_by = auth.uid())))) OR public.is_admin()));

ALTER TABLE public.requirements
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.requirements
  ADD CONSTRAINT requirements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.requirements
  ADD CONSTRAINT requirements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.requirements
  ADD CONSTRAINT requirements_num_posts_requested_check CHECK (num_posts_requested >= 1 AND num_posts_requested <= 5);

ALTER TABLE public.requirements
  ADD CONSTRAINT requirements_pkey PRIMARY KEY (id);

ALTER TABLE public.job_openings
  ADD CONSTRAINT job_openings_requirement_id_fkey FOREIGN KEY (requirement_id) REFERENCES public.requirements(id) ON DELETE CASCADE;

ALTER TABLE public.requirements
  ADD CONSTRAINT requirements_seniority_check CHECK (seniority = ANY (ARRAY['junior'::text, 'mid'::text, 'senior'::text, 'lead'::text, 'any'::text]));

ALTER TABLE public.requirements
  ADD CONSTRAINT requirements_status_check CHECK (status = ANY (ARRAY['draft'::text, 'generating'::text, 'ready'::text, 'archived'::text]));

GRANT ALL ON public.requirements TO anon;

GRANT ALL ON public.requirements TO authenticated;

GRANT ALL ON public.requirements TO service_role;

CREATE INDEX idx_requirements_client ON public.requirements (client_id);

CREATE INDEX idx_requirements_is_deleted ON public.requirements (is_deleted);

CREATE TRIGGER set_timestamp_requirements
  BEFORE UPDATE ON public.requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_timestamp();

CREATE POLICY "Allow admin to delete requirements" ON public.requirements
  FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Allow anonymous view requirements" ON public.requirements
  FOR SELECT
  TO anon
  USING ((is_deleted = false));

CREATE POLICY "Allow recruiters to modify requirements" ON public.requirements
  FOR INSERT
  WITH CHECK (((auth.uid() = created_by) OR public.is_admin()));

CREATE POLICY "Allow recruiters to update requirements" ON public.requirements
  FOR UPDATE
  USING (((auth.uid() = created_by) OR public.is_admin()));

CREATE POLICY "Allow recruiters to view requirements" ON public.requirements
  FOR SELECT
  TO authenticated
  USING (((auth.uid() = created_by) OR public.is_admin()));

CREATE TABLE public.role_permissions (
  role_id                 character varying(36) NOT NULL,
  administrator           boolean               DEFAULT false,
  audit_logs              boolean               DEFAULT false,
  manage_server           boolean               DEFAULT false,
  access_recruitment      boolean               DEFAULT true,
  recruiter_dashboard     boolean               DEFAULT true,
  recruiter_mandates      boolean               DEFAULT true,
  recruiter_jobs          boolean               DEFAULT true,
  recruiter_sourcing      boolean               DEFAULT true,
  recruiter_reports       boolean               DEFAULT true,
  recruiter_qna           boolean               DEFAULT true,
  recruiter_resumes       boolean               DEFAULT true,
  recruiter_stage_move    boolean               DEFAULT true,
  access_client           boolean               DEFAULT false,
  client_contracts        boolean               DEFAULT false,
  client_mandates         boolean               DEFAULT false,
  client_shortlists       boolean               DEFAULT false,
  access_employee         boolean               DEFAULT false,
  employee_directory      boolean               DEFAULT false,
  employee_org_chart      boolean               DEFAULT false,
  manage_jobs             boolean               DEFAULT true,
  view_resumes            boolean               DEFAULT true,
  edit_status             boolean               DEFAULT true,
  schedule_interviews     boolean               DEFAULT true,
  recruiter_stages        boolean               DEFAULT true,
  recruiter_pipelines     boolean               DEFAULT true,
  recruiter_notifications boolean               DEFAULT true,
  team_monitoring         boolean               DEFAULT false,
  interviewer_workspace   boolean               DEFAULT false
);

ALTER TABLE public.role_permissions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id);

GRANT ALL ON public.role_permissions TO anon;

GRANT ALL ON public.role_permissions TO authenticated;

GRANT ALL ON public.role_permissions TO service_role;

CREATE TABLE public.roles (
  id                    character varying(36)    DEFAULT gen_random_uuid() NOT NULL,
  organization_id       character varying(36),
  parent_id             character varying(36),
  name                  character varying(255)   NOT NULL,
  level                 character varying(50)    DEFAULT 'position'::character varying NOT NULL,
  color_hex             character varying(7)     DEFAULT '#ff6e30'::character varying NOT NULL,
  created_at            timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at            timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  branch_id             uuid,
  scope_type            character varying(50)    DEFAULT 'organization'::character varying,
  branch_name           character varying(100)   DEFAULT 'Main Branch'::character varying,
  is_managerial         boolean                  DEFAULT false,
  supervised_by_role_id character varying(36)
);

ALTER TABLE public.roles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.roles
  ADD CONSTRAINT roles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.roles
  ADD CONSTRAINT roles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.roles
  ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE public.approval_pipeline_access
  ADD CONSTRAINT approval_pipeline_access_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE public.approval_stage_approvers
  ADD CONSTRAINT approval_stage_approvers_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE public.member_manager_assignments
  ADD CONSTRAINT member_manager_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE public.member_roles
  ADD CONSTRAINT member_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE public.pending_approvals
  ADD CONSTRAINT pending_approvals_required_role_id_fkey FOREIGN KEY (required_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE public.pipeline_stages
  ADD CONSTRAINT pipeline_stages_required_role_id_fkey FOREIGN KEY (required_role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE public.roles
  ADD CONSTRAINT roles_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.roles(id) ON DELETE SET NULL;

ALTER TABLE public.roles
  ADD CONSTRAINT roles_supervised_by_role_id_fkey FOREIGN KEY (supervised_by_role_id) REFERENCES public.roles(id) ON DELETE SET NULL;

GRANT ALL ON public.roles TO anon;

GRANT ALL ON public.roles TO authenticated;

GRANT ALL ON public.roles TO service_role;

CREATE INDEX idx_roles_supervised_by_role_id ON public.roles (supervised_by_role_id);

CREATE INDEX idx_roles_branch_id ON public.roles (branch_id);

CREATE INDEX idx_roles_branch_name ON public.roles (branch_name);

CREATE INDEX idx_roles_scope_type ON public.roles (scope_type);

CREATE INDEX idx_roles_is_managerial ON public.roles (is_managerial);

CREATE TABLE public.rolling_updates (
  id           character varying(36)    DEFAULT gen_random_uuid() NOT NULL,
  version_tag  character varying(50)    NOT NULL,
  title        character varying(255)   NOT NULL,
  description  text                     NOT NULL,
  category     character varying(100)   DEFAULT 'Feature Release'::character varying NOT NULL,
  priority     character varying(50)    DEFAULT 'Normal'::character varying NOT NULL,
  published_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.rolling_updates
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.rolling_updates
  ADD CONSTRAINT rolling_updates_pkey PRIMARY KEY (id);

GRANT ALL ON public.rolling_updates TO anon;

GRANT ALL ON public.rolling_updates TO authenticated;

GRANT ALL ON public.rolling_updates TO service_role;

CREATE VIEW public.active_applications AS SELECT id,
    candidate_id,
    job_opening_id,
    candidate_cv,
    fuzzy_score,
    match_score,
    match_reason,
    strengths,
    skill_gaps,
    screening_status,
    stage,
    stage_status,
    stage_notes,
    priority,
    reviewed_by,
    reviewed_at,
    created_at,
    updated_at,
    is_deleted
   FROM public.applications
  WHERE (is_deleted = false);

GRANT ALL ON public.active_applications TO anon;

GRANT ALL ON public.active_applications TO authenticated;

GRANT ALL ON public.active_applications TO service_role;

CREATE VIEW public.active_candidates AS SELECT id,
    full_name,
    email,
    phone,
    skills,
    experience_years,
    current_company,
    resume_url,
    parsed_resume_json,
    source,
    uploaded_by,
    created_at,
    updated_at,
    is_deleted
   FROM public.candidates
  WHERE (is_deleted = false);

GRANT ALL ON public.active_candidates TO anon;

GRANT ALL ON public.active_candidates TO authenticated;

GRANT ALL ON public.active_candidates TO service_role;

CREATE VIEW public.active_clients AS SELECT id,
    name,
    created_by,
    created_at,
    updated_at,
    is_deleted
   FROM public.clients
  WHERE (is_deleted = false);

GRANT ALL ON public.active_clients TO anon;

GRANT ALL ON public.active_clients TO authenticated;

GRANT ALL ON public.active_clients TO service_role;

CREATE VIEW public.active_job_openings AS SELECT id,
    requirement_id,
    post_index,
    title,
    description,
    responsibilities,
    qualifications,
    keywords,
    salary_range,
    status,
    processing_status,
    error_message,
    ai_generated,
    approved_by,
    created_at,
    updated_at,
    published_at,
    is_deleted,
    custom_stages,
    category,
    sub_category,
    candidate_view_settings,
    stage_notifications
   FROM public.job_openings
  WHERE (is_deleted = false);

GRANT ALL ON public.active_job_openings TO anon;

GRANT ALL ON public.active_job_openings TO authenticated;

GRANT ALL ON public.active_job_openings TO service_role;

CREATE VIEW public.active_requirements AS SELECT id,
    client_id,
    title,
    description,
    skills,
    experience_min,
    experience_max,
    budget_min,
    budget_max,
    seniority,
    notes,
    num_posts_requested,
    status,
    created_by,
    created_at,
    updated_at,
    is_deleted
   FROM public.requirements
  WHERE (is_deleted = false);

GRANT ALL ON public.active_requirements TO anon;

GRANT ALL ON public.active_requirements TO authenticated;

GRANT ALL ON public.active_requirements TO service_role;

CREATE VIEW public.candidate_rankings_view AS SELECT jc.id AS job_candidate_id,
    jc.rank_order AS candidate_rank,
    jc.fuzzy_score,
    c.id AS candidate_id,
    c.full_name AS candidate_name,
    c.email AS candidate_email,
    c.phone AS candidate_phone,
    c.experience_years,
    c.current_company,
    c.skills AS candidate_skills,
    j.id AS job_opening_id,
    j.title AS job_title,
    j.status AS job_status,
    jc.strengths,
    jc.skill_gaps,
    jc.ai_reasoning,
    jc.status AS candidate_job_status
   FROM ((public.job_candidates jc
     JOIN public.candidates c ON ((jc.candidate_id = c.id)))
     JOIN public.job_openings j ON ((jc.job_opening_id = j.id)))
  WHERE ((c.is_deleted = false) AND (j.is_deleted = false));

GRANT ALL ON public.candidate_rankings_view TO anon;

GRANT ALL ON public.candidate_rankings_view TO authenticated;

GRANT ALL ON public.candidate_rankings_view TO service_role;

CREATE VIEW public.recruiter_dashboard_view AS SELECT ( SELECT count(*) AS count
           FROM public.job_openings
          WHERE ((job_openings.status = 'published'::text) AND (job_openings.is_deleted = false))) AS open_jobs,
    ( SELECT count(*) AS count
           FROM public.requirements
          WHERE ((requirements.status = 'active'::text) AND (requirements.is_deleted = false))) AS active_requirements,
    ( SELECT count(*) AS count
           FROM public.candidates
          WHERE (candidates.is_deleted = false)) AS candidates_uploaded,
    ( SELECT count(*) AS count
           FROM public.applications
          WHERE ((applications.screening_status = 'pending'::text) AND (applications.is_deleted = false))) AS pending_reviews,
    ( SELECT count(*) AS count
           FROM public.applications
          WHERE ((applications.stage_status = 'in_progress'::text) AND (applications.is_deleted = false))) AS stages_in_progress;

GRANT ALL ON public.recruiter_dashboard_view TO anon;

GRANT ALL ON public.recruiter_dashboard_view TO authenticated;

GRANT ALL ON public.recruiter_dashboard_view TO service_role;
