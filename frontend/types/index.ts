export type UserRole = 'recruiter';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  role: UserRole;
  is_active?: boolean;
  is_onboarded: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  // Computed client stats
  requirements_count?: number;
  active_jobs_count?: number;
}

export type SeniorityType = 'junior' | 'mid' | 'senior' | 'lead' | 'any';
export type RequirementStatus = 'draft' | 'generating' | 'ready' | 'archived';

export interface Requirement {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  skills: string[];
  experience_min: number | null;
  experience_max: number | null;
  budget_min: number | null;
  budget_max: number | null;
  seniority: SeniorityType | null;
  notes: string | null;
  num_posts_requested: number;
  status: RequirementStatus;
  created_by: string | null;
  created_at: string;
  // Included items
  client_name?: string;
  job_openings?: JobOpening[];
}

export type JobOpeningStatus = 'draft' | 'confirmed' | 'published' | 'closed';
export type JobOpeningProcessingStatus = 
  | 'idle' 
  | 'generating' 
  | 'skill_approval' 
  | 'matching' 
  | 'questions_ready' 
  | 'ready' 
  | 'error';

export interface JobOpening {
  id: string;
  requirement_id: string;
  client_id: string;
  post_index: number;
  title: string | null;
  description: string | null;
  responsibilities: string[];
  qualifications: string[];
  salary_range: string | null;
  keywords: string[];
  source: 'ai' | 'manual';
  status: JobOpeningStatus;
  processing_status: JobOpeningProcessingStatus;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
  // Joined stats
  client_name?: string;
  requirement_title?: string;
  candidate_count?: number;
  top_score?: number;
  last_activity?: string;
}

export interface JobOpeningSkill {
  id: string;
  job_opening_id: string;
  skill_name: string;
  weight: number; // 0.0 - 1.0
  skill_order: number;
  approved: boolean;
  created_at: string;
}

export interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  skills: string[];
  experience_years: number | null;
  resume_url: string | null;
  raw_text: string | null;
  source: 'csv' | 'pdf' | 'docx' | 'manual' | null;
  uploaded_by: string | null;
  created_at: string;
  // Combined views
  linked_jobs?: Array<{
    job_id: string;
    job_title: string;
    fuzzy_score: number;
    stage: string;
    status: string;
  }>;
}

export type ScreeningStatusType = 'pending' | 'accepted' | 'rejected';
export type PipelineStageType = 'screening' | 'technical' | 'hr' | 'final' | 'hired' | 'rejected';
export type StageStatusType = 'pending' | 'in_progress' | 'passed' | 'failed' | 'on_hold';

export interface Application {
  id: string;
  candidate_id: string;
  job_opening_id: string;
  candidate_cv: string | null;
  fuzzy_score: number | null;
  match_score: number | null;
  match_reason: string | null;
  strengths: string[];
  skill_gaps: string[];
  screening_status: ScreeningStatusType;
  stage: PipelineStageType;
  stage_status: StageStatusType;
  stage_notes: string | null; // Stores rejection reasons if failed
  priority: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Context mapping
  candidate_name?: string;
  candidate_email?: string;
  candidate_experience?: number;
  candidate_skills?: string[];
}

export interface JobCandidate {
  id: string;
  job_opening_id: string;
  application_id: string;
  fuzzy_score: number;
  rank_order: number;
  created_at: string;
  // Extra fields for ranking view
  candidate_id?: string;
  candidate_name?: string;
  experience_years?: number;
  skills?: string[];
  strengths?: string[];
  skill_gaps?: string[];
  priority?: number;
  stage?: PipelineStageType;
  stage_status?: StageStatusType;
}

export interface ScreeningQuestion {
  id: string;
  application_id: string;
  requirement_id: string | null;
  job_opening_id: string | null;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_order: number;
  modified: boolean;
  modified_by: string | null;
  modified_at: string | null;
  created_at: string;
}

export interface InterviewStage {
  id: string;
  application_id: string;
  stage_name: string; // e.g. Screening, Technical, HR, Final
  stage_order: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  outcome: 'passed' | 'failed' | 'on_hold' | 'pending';
  scheduled_at: string | null;
  completed_at: string | null;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id: string | null;
  actor_name?: string; // hydrated
  action: string; // e.g. "job_created", "status_changed", "candidate_ranked"
  entity_type: string; // "job_openings", "applications", "requirements"
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
