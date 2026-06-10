# ATS Platform — Complete Project Knowledge Base
> This document is the single source of truth for the AI-powered Applicant Tracking System (ATS). It is intended to be fed to AI agents, developers, or any assistant working on this project. Read this fully before taking any action on the codebase.

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Current Phase Scope](#2-current-phase-scope)
3. [Out of Scope — Future Modules](#3-out-of-scope--future-modules)
4. [User Roles](#4-user-roles)
5. [Complete System Flow](#5-complete-system-flow)
6. [Tech Stack](#6-tech-stack)
7. [Project Folder Structure](#7-project-folder-structure)
8. [Database Schema](#8-database-schema)
9. [API Endpoints](#9-api-endpoints)
10. [AI Features — Prompts and Logic](#10-ai-features--prompts-and-logic)
11. [CV Upload — All Methods](#11-cv-upload--all-methods)
12. [Chatbot Interface](#12-chatbot-interface)
13. [UI — Page by Page](#13-ui--page-by-page)
14. [Auth and Security](#14-auth-and-security)
15. [Background Jobs](#15-background-jobs)
16. [Email Notifications](#16-email-notifications)
17. [File Storage](#17-file-storage)
18. [Error Handling Rules](#18-error-handling-rules)
19. [Build Order](#19-build-order)
20. [Key Design Decisions](#20-key-design-decisions)
21. [Glossary](#21-glossary)

---

## 1. Project Summary

This is an AI-powered internal recruitment management platform. It manages the full hiring lifecycle — from requirement creation through AI-generated job openings, candidate upload and AI matching, personalised screening, and interview stage tracking.

The system uses AI (Claude API by Anthropic) for four core tasks:
- Generating job opening drafts from recruiter-uploaded requirements
- Matching candidates to job openings with a fit score and reason
- Generating personalised screening questions per candidate based on their resume
- Editing questions based on natural language instructions from the recruiter

The platform is an internal tool. There is no public-facing candidate self-apply portal in this phase. Candidates are sourced via CSV upload, individual PDF/DOCX CV upload, or manual entry.

---

## 2. Current Phase Scope

The following features are confirmed IN SCOPE for the initial build:

- **Auth** — Single role: Recruiter. The recruiter is also the admin. Full access to everything. Mandatory login on every page.
- **Onboarding tutorial** — First-time users see a guided tutorial with pop-up tooltips walking them through each step of the platform. Returning users bypass the tutorial and go directly to the dashboard.
- **Client name entry** — (Optional) Recruiter adds a client name (string only). Acts as a foreign key placeholder for the future client module. Used for relating requirements to clients.
- **Requirements** — Recruiter creates a requirement linked to a client name. Can be entered as structured fields (title, skills, experience range, budget, seniority) or as a free-text paragraph (description). AI analyzes both.
- **AI job generation** — On requirement save, AI automatically drafts one or more job openings from the requirement description. Recruiter can also add openings manually via a "+" button. Recruiter reviews, edits manually or regenerates with instructions.
- **Dynamic Job Openings table** — Job openings are displayed as a dynamic Notion-style table within the Job Opening page, grouped per requirement. Recruiter can add new openings with a "+" button at the bottom. Each opening shows its status and linked requirement.
- **Scan and Publish** — Interactive animated button on the Job Opening page. Before scanning, the AI extracts `n` weighted skills (default n=5) from the job opening and requirement. These are shown to the recruiter in an editable pop-up for approval. The recruiter must approve (and can edit) the skills before the agent begins scanning CVs. After approval, the agent uses these weighted skills to generate a fuzzy score for each candidate and ranks them accordingly.
- **CV upload (two methods)**:
  - Inside a specific job opening (candidates auto-linked to that job) — CSV format
  - Common pool upload from the Candidates page (candidates go into general pool)
  - Formats: CSV (bulk), PDF (individual), DOCX (individual)
- **AI candidate matching (fuzzy scoring)** — After scan and publish, the AI agent uses the approved weighted skills to score each candidate's CV against the job opening. Produces a fuzzy score per candidate. Candidates are ranked by fuzzy score. The score and ranking are stored in the Job-Candidate table and also updated in the Applicant (applications) table.
- **AI personalised screening questions** — Per candidate per job, based on that candidate's specific resume and skills. 8–10 questions, easy to hard. Different for every candidate. Generated after accepting a candidate.
- **Recruiter candidate review** — View resume, AI summary, skill ratings, fit reason, questions. Edit questions manually or via AI instruction. Recruiter can add new candidates and give them priority, add certain skills, or change the screening questions. An AI agent has access to the whole page.
- **Accept / Reject** — Recruiter manually accepts or rejects each candidate. Status saved to DB.
- **Job Opening Page Flow** — The Job Opening page lists Job Openings mapped to approved requirements. Clicking on a job opening pops up its description for the recruiter to approve. Once approved, the AI scans the description and requirement to create 5 skills. The recruiter can add new skills or approve the AI-generated ones. These skills are then used to calculate the fuzzy score by scanning the CVs.
- **Interview stages** — Candidates progress through fixed stages: Screening → Technical → HR → Final. Stage and stage status are tracked per applicant. If a candidate does not pass a round, a **rejection reason** must be recorded in the stage notes, which is considered if the same candidate reappears later. (Note: There is no separate Pipeline page).
- **Standard filters** — A standard filter to classify job openings and identify top candidates.
- **Candidate Pool page** — Shows a table of candidate details (candidate pool) updated from the Applicant table. Uses a function to map unique applicants based on email and/or name. Common candidates are mapped together under a single name entry with multiple jobs. Shows candidate details, skills, and jobs which they have applied for.
- **Stage overview** — Stage-level overview is accessible from the candidate's application details within the Job Opening.
- **Activity log** — Every state change is logged with actor, action, entity, and timestamp.
- **Chatbot** — Fixed right-side panel on every page, powered by Claude API, context-aware.
- **Simple, clean UI** using Tailwind CSS and shadcn/ui components.
- **Brand name**: Kozker Recruiter AI.

---

## 3. Out of Scope — Future Modules

Do NOT build these in the initial phase. They are planned as separate modules:

| Feature | Notes |
|---|---|
| Multiple user roles | Only one role (recruiter) in this phase. Multi-user and role separation is a future module |
| Client login and portal | Client will have a read-only portal in a future phase |
| Client verification flow | Admin approval + credential email to client — future |
| Full client details page | Only name stored now; full table (address, contacts, industry) later |
| Public job board | Candidates self-applying via a public URL — future |
| Candidate self-signup | No candidate accounts in this phase |
| Naukri / LinkedIn integration | Manual entry only in this phase |
| Reports and analytics | Funnel metrics, time-to-hire, recruiter performance — future |
| Bulk email to candidates | Future |
| Multi-recruiter job sharing | Future |

---

## 4. User Roles

### Initial Phase — Single Role: Recruiter

There is only one role in this phase. The recruiter has full access to everything in the system. The recruiter is also the admin. There is no role separation, no permission hierarchy, and no role-based endpoint restrictions.

**The recruiter can:**
- Sign up and log in (first-time users receive a guided onboarding tutorial with pop-ups)
- Add and manage client names (optional, for relating to clients)
- Create and manage requirements (structured fields or free-text description)
- Review AI-generated job openings in a dynamic Notion-style table per requirement
- Manually add new job openings via "+" button on the Job Openings page
- Approve, edit, or re-weight the AI-extracted skills before scanning candidates
- Use the Scan and Publish button to trigger AI fuzzy scoring of candidates
- Upload CVs (both job-specific and common pool), in CSV, PDF, or DOCX format
- Add new candidates and give them priority directly on the job opening page
- View candidate detail: resume, AI summary, skill ratings, fuzzy score, fit reason
- Edit personalised screening questions manually or via AI instruction
- Accept or reject candidates
- Track candidate progress through stages: Screening → Technical → HR → Final
- Update stage and stage status with notes
- Use standard filters to classify job openings and top candidates
- Use the chatbot to query any data in the system

### Auth rules
- Single role stored in the `users` table as `role = 'recruiter'`
- Role embedded in the Supabase JWT on login
- FastAPI middleware verifies the JWT on every request — if no valid token, returns 401
- Next.js middleware reads the JWT cookie on every page load — if no valid session, redirects to login
- No role-based endpoint restrictions exist in this phase — all authenticated endpoints are accessible to any logged-in recruiter
- Signup is self-serve — anyone with the link can create an account (access control via invite link can be added in a future phase)

---

## 5. Complete System Flow

### Phase A — Auth & Onboarding
1. User visits any page → redirected to login if no valid session
2. User signs up with name, email, and password — role is set to `recruiter` automatically
3. User logs in with email and password via Supabase Auth
4. JWT issued containing user ID and role
5. Next.js middleware reads JWT cookie → checks if first login (via `is_onboarded` flag on user record)
6. **If new user** → guided onboarding tutorial begins: a series of pop-up tooltips walk the user through each section of the platform (Dashboard → Requirements → Job Openings → Candidates). User can skip at any time. On completion or skip, `is_onboarded` is set to `true`.
7. **If returning user** → direct access to dashboard (no tutorial)
8. Every API call to FastAPI includes JWT in Authorization header
9. FastAPI verifies JWT signature against Supabase public key on every request — returns 401 if invalid

### Phase B — Client and Requirement
8. Recruiter logs in and adds a client name (simple text input → saved to `clients` table with auto-generated UUID)
9. Recruiter opens Requirements page → clicks Add Requirement
10. Recruiter fills requirement — either using structured fields (role title, required skills, experience range, budget range, seniority, notes) or by writing a free-text paragraph describing the role — or both
11. Recruiter selects how many job posts to generate: 1, 2, or 3
12. Recruiter saves the requirement → saved to `requirements` table with status `active`
13. On save, FastAPI immediately fires a Celery background task for AI job generation (one task per requested job post)
14. Requirement card shows "Generating job opening(s)..." status badge

### Phase C — AI Job Generation, Dynamic Table, and Review
15. Celery task calls Claude API with the full requirement details (structured fields + paragraph text if provided)
16. Claude returns a structured JSON for each job post: title, description, responsibilities[], qualifications[], salary_range, keywords[]
17. FastAPI saves each as a `job_openings` record with status `draft` and processing_status `ready`
18. Supabase Realtime notifies the frontend — status badge updates to "Draft ready"
19. Job openings appear as rows in a **dynamic Notion-style table** on the Job Openings page, grouped by requirement
20. Recruiter can also **manually add new job openings** via a "+" button at the bottom of the table
21. Recruiter opens a draft job opening and reviews all fields
22. **Option A** — Satisfied: clicks **Confirm** → opening is confirmed and ready for Scan and Publish
23. **Option B** — Manual edit: recruiter edits any field directly in the form → saves
24. **Option C** — Regenerate: recruiter types a specific instruction → clicks Regenerate → Celery fires another AI call with the previous draft + instruction → new draft returned → recruiter reviews again
25. Regeneration loop can repeat unlimited times until recruiter is satisfied

### Phase D — CV Upload
25. **Method 1 — Job-specific upload**: Recruiter opens a published job opening → clicks Upload CVs → uploads CSV or individual PDF/DOCX files → candidates parsed and saved to `candidates` table → `applications` records created linking each candidate to this job opening
26. **Method 2 — Common pool upload**: Recruiter opens Candidates page → clicks Upload → uploads files → candidates saved to `candidates` table with no job link → available for matching to any job later
27. CSV parsing: Papaparse runs in browser → preview table shown to user → user confirms → FastAPI bulk inserts
28. PDF/DOCX parsing: File sent to FastAPI → pdfplumber (PDF) or python-docx (DOCX) extracts raw text → FastAPI sends text to Claude for structured extraction (name, email, phone, skills, experience) → saved to DB
29. Duplicate emails: detected via unique constraint → skipped → uploader sees count of duplicates skipped

### Phase E — Scan and Publish (AI Skill Extraction + Fuzzy Scoring)
30. Recruiter clicks the **"Scan and Publish"** button (interactive, animated) on the Job Opening page for a confirmed opening
31. **Before scanning**: AI analyzes the job opening + requirement and extracts `n` weighted skills (default n=5), prioritised based on the job opening and requirement
32. An **editable pop-up** is shown to the recruiter displaying the extracted skills with their weights
33. Recruiter can **add, remove, or re-weight** skills in the pop-up. Recruiter can also add new candidates at this stage.
34. Recruiter **approves** the skills → the agent begins scanning
35. FastAPI fires Celery task: for each candidate linked to the job, the agent uses the approved weighted skills to analyse each candidate’s CV
36. A **fuzzy score** is generated for each candidate based on how well their CV matches the weighted skills
37. Candidates are **ranked by fuzzy score** and stored in the **Job-Candidate** table, sorted by score
38. Fuzzy scores are also updated in the **Applicant (applications)** table along with the opening details
39. Job processing_status updated to `matching` then `questions_ready`
40. Recruiter notified via Supabase Realtime
41. Recruiter can view the ranked candidate list by clicking on the job opening

### Phase F — AI Question Generation (Post-Accept)
42. Triggered **after a candidate is accepted** by the recruiter (not immediately after matching)
43. For each accepted candidate, Claude is called with: job title, job requirements, candidate's skills, experience years, and parsed resume text
44. Claude returns JSON array of 8–10 questions, each tagged easy / medium / hard
45. Questions are personalised to this specific candidate — not generic, not shared across candidates
46. Saved to `screening_questions` table linked to the `applications` record
47. An AI agent has access to the whole page and can assist the recruiter with question refinement

### Phase G — Recruiter Review
48. Recruiter opens Job Opening page → sees the dynamic Notion-style table of job openings
49. Clicking on a job opening → shows the **list of suitable candidates** (from Job-Candidate table), sorted by fuzzy score
50. Recruiter clicks a candidate → detail panel shows: full name, contact info, skill tags with AI-rated scores, AI summary paragraph, "Why they fit" section, PDF/DOCX resume viewer
51. Recruiter can:
    - **Add new candidates** to the opening and give them priority
    - **Add or modify skills** used for ranking
    - Accept or Reject candidates
52. On Accept → personalised screening questions are generated (Phase F triggers)
53. Recruiter can edit any question:
    - Manual edit: click question text → edit inline → save
    - AI edit: click edit icon → type instruction → AI returns revised question → recruiter sees preview → confirms
    - AI agent has access to the whole page and can suggest changes
54. Decision saved to `applications.screening_status`
55. Action written to `activity_log`

### Phase H — Interview Stages
56. **Interview Stages** are tracked directly on the applicant details within the Job Opening. There is no separate Pipeline or Stages page.
57. Clicking an applicant shows the **status of the applicant** and the **stage they are currently in**
58. Fixed stages: **Screening → Technical → HR → Final**
59. Stage and stage status are tracked in the Applicant table (`stage`, `stage_status`, `notes` columns).
60. **Rejection Reason**: If a candidate does not pass a round, the rejection reason must be recorded in the stage notes. This reason is used by the system if the same candidate pops up again.
61. Recruiter can update the stage and status at any time.
62. **Stage overview** is accessible from the candidate's application details.
63. An **AI agent** has access to candidate views for updates and filtering.
64. A **standard filter** is available to classify top candidates.
65. Full stage history and rejection reasons are visible on the candidate detail page at all times.

### Phase I — Chatbot
55. Fixed right-side chat panel visible on every page (collapsible)
56. Recruiter can toggle the panel open/closed
57. Recruiter types a question in natural language
58. FastAPI receives message + current page context + user info
59. Claude API called with system prompt containing page context and a read-only summary of relevant DB data
60. Response displayed in chat panel
61. Conversation history maintained for the session (in-memory, not persisted to DB in this phase)

---

## 6. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14 (App Router) | Framework, routing, SSR, middleware |
| TypeScript | 5.x | Type safety across all components |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | latest | Pre-built accessible UI components |
| Papaparse | 5.x | CSV parsing in browser before upload |
| React Hook Form | 7.x | Form state management |
| Zod | 3.x | Schema validation for all forms |
| React PDF | latest | PDF resume viewer in candidate panel |
| Supabase JS SDK | 2.x | Auth, Realtime subscriptions |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Language |
| FastAPI | 0.110+ | REST API framework |
| SQLAlchemy | 2.x (async) | ORM for database queries |
| asyncpg | latest | Async PostgreSQL driver |
| Alembic | latest | Database migrations |
| Pydantic | 2.x | Request/response validation schemas |
| python-jose | latest | JWT verification |
| pdfplumber | latest | PDF text extraction |
| python-docx | latest | DOCX text extraction |
| pandas | latest | CSV processing on backend |
| Celery | 5.x | Background task queue |
| Redis | 7.x | Celery broker and cache |
| anthropic | latest | Claude API SDK |
| Resend | latest | Transactional email |
| supabase-py | latest | Supabase Storage and Auth Admin SDK |

### Infrastructure
| Service | Purpose |
|---|---|
| Supabase | PostgreSQL database, Auth, Storage, Realtime |
| Redis | Celery broker (Railway managed Redis) |
| Vercel | Next.js frontend hosting |
| Railway | FastAPI + Celery worker hosting |

---

## 7. Project Folder Structure

```
ats-platform/
│
├── frontend/                          # Next.js application
│   ├── app/
│   │   ├── (auth)/                    # No sidebar layout
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       └── page.tsx
│   │   ├── (dashboard)/               # Sidebar + chatbot panel layout
│   │   │   ├── layout.tsx             # Shared layout with sidebar and right-side chatbot panel
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── requirements/
│   │   │   │   ├── page.tsx           # Requirements list
│   │   │   │   └── new/
│   │   │   │       └── page.tsx       # Add requirement form
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx           # All job openings list
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # Job detail + candidate list/pipeline + upload
│   │   │   │       └── candidate/
│   │   │   │           └── [candidateId]/
│   │   │   │               └── page.tsx  # Candidate detail panel
│   │   └── middleware.ts              # JWT auth check — redirect to login if no session
│   │
│   ├── components/
│   │   ├── chatbot/
│   │   │   ├── ChatToggle.tsx         # Toggle button for right-side panel
│   │   │   └── ChatPanel.tsx          # Right-side chat panel interface
│   │   ├── cv-uploader/
│   │   │   ├── CsvUploader.tsx        # CSV parse + preview + confirm
│   │   │   └── FileUploader.tsx       # PDF/DOCX individual upload
│   │   ├── job-draft/
│   │   │   ├── DraftEditor.tsx        # Review + manual edit
│   │   │   └── RegeneratePanel.tsx    # Instruction input + regenerate
│   │   ├── candidate/
│   │   │   ├── CandidateCard.tsx      # Row in pipeline list
│   │   │   ├── CandidatePanel.tsx     # Sliding detail panel
│   │   │   ├── SkillRating.tsx        # Skill tag with AI score
│   │   │   └── ResumeViewer.tsx       # PDF/DOCX viewer
│   │   ├── questions/
│   │   │   ├── QuestionList.tsx       # List of screening questions
│   │   │   └── QuestionEditor.tsx     # Manual + AI edit per question
│   │   ├── stages/
│   │   │   ├── StageList.tsx          # All stages for a candidate
│   │   │   └── StageItem.tsx          # Single stage with status/outcome
│   │   └── ui/                        # shadcn/ui components
│   │
│   └── lib/
│       ├── api.ts                     # Typed fetch wrapper → FastAPI
│       ├── supabase.ts                # Supabase client for auth + realtime
│       └── types.ts                   # Shared TypeScript types
│
└── backend/                           # FastAPI application
    ├── app/
    │   ├── routers/
    │   │   ├── auth.py                # /auth/me — returns current user
    │   │   ├── clients.py             # /clients CRUD
    │   │   ├── requirements.py        # /requirements CRUD
    │   │   ├── jobs.py                # /jobs CRUD + publish
    │   │   ├── candidates.py          # /candidates CRUD + upload
    │   │   ├── applications.py        # /applications — match, accept, reject
    │   │   ├── screening.py           # /screening/questions CRUD + AI edit
    │   │   ├── stages.py              # /stages CRUD + status update
    │   │   └── chatbot.py             # /chatbot — message handler
    │   │
    │   ├── services/
    │   │   ├── ai_service.py          # All Claude API calls
    │   │   ├── cv_parser.py           # PDF, DOCX, CSV parsing
    │   │   ├── matching_service.py    # Candidate scoring logic
    │   │   └── question_service.py    # Question generation + editing
    │   │
    │   ├── models/
    │   │   ├── orm.py                 # SQLAlchemy ORM models
    │   │   └── schemas.py             # Pydantic request/response schemas
    │   │
    │   ├── core/
    │   │   ├── auth.py                # JWT verification middleware — 401 if invalid
    │   │   ├── config.py              # Environment variable loading
    │   │   └── database.py            # Async DB session factory
    │   │
    │   └── workers/
    │       ├── celery_app.py          # Celery app configuration
    │       └── tasks.py               # All background task definitions
    │
    ├── alembic/                       # Database migration files
    │   └── versions/
    ├── alembic.ini
    ├── requirements.txt
    └── main.py                        # FastAPI app entry point
```

---

## 8. Database Schema

> All tables use UUID primary keys. All timestamps are `timestamptz` (timezone-aware). Foreign keys have ON DELETE behaviour specified. Run all migrations via Alembic before any feature development.

```sql
-- ============================================================
-- USERS
-- Linked to Supabase Auth.
-- Only one role in this phase: 'recruiter'.
-- role column kept for forward compatibility with future phases.
-- ============================================================
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_auth_id  UUID UNIQUE NOT NULL,
    email             TEXT UNIQUE NOT NULL,
    full_name         TEXT,
    role              TEXT NOT NULL DEFAULT 'recruiter' CHECK (role IN ('recruiter')),
    is_onboarded      BOOLEAN DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CLIENTS
-- Name only in this phase. Full client details in future module.
-- Any recruiter can add client names.
-- ============================================================
CREATE TABLE clients (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT UNIQUE NOT NULL,
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- REQUIREMENTS
-- Linked to a client. Source of truth for AI job generation.
-- description field accepts free-text paragraph from recruiter.
-- num_posts_requested: how many job posts AI should generate (1–3).
-- ============================================================
CREATE TABLE requirements (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    title                 TEXT NOT NULL,
    description           TEXT,
    skills                TEXT[] DEFAULT '{}',
    experience_min        INT,
    experience_max        INT,
    budget_min            NUMERIC,
    budget_max            NUMERIC,
    seniority             TEXT CHECK (seniority IN ('junior', 'mid', 'senior', 'lead', 'any')),
    notes                 TEXT,
    num_posts_requested   INT DEFAULT 1 CHECK (num_posts_requested BETWEEN 1 AND 3),
    status                TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- JOB OPENINGS
-- AI-generated or manually created openings linked to a requirement.
-- Multiple job_openings records can share the same requirement_id.
-- Recruiter can add openings manually via "+" button (source='manual').
-- status: draft → confirmed → published → closed
-- processing_status: tracks background AI job state
-- ============================================================
CREATE TABLE job_openings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id      UUID NOT NULL REFERENCES requirements(id) ON DELETE RESTRICT,
    client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    post_index          INT DEFAULT 1,
    title               TEXT,
    description         TEXT,
    responsibilities    TEXT[],
    qualifications      TEXT[],
    salary_range        TEXT,
    keywords            TEXT[] DEFAULT '{}',
    source              TEXT DEFAULT 'ai' CHECK (source IN ('ai', 'manual')),
    status              TEXT DEFAULT 'draft'
                            CHECK (status IN ('draft', 'confirmed', 'published', 'closed')),
    processing_status   TEXT DEFAULT 'idle'
                            CHECK (processing_status IN
                                ('idle', 'generating', 'skill_approval', 'matching', 'questions_ready', 'ready', 'error')),
    error_message       TEXT,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT now(),
    published_at        TIMESTAMPTZ
);

-- ============================================================
-- JOB OPENING SKILLS
-- Weighted skills extracted by AI for a job opening.
-- Recruiter approves/edits these before scanning candidates.
-- n skills (default 5), each with a weight (priority).
-- ============================================================
CREATE TABLE job_opening_skills (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_opening_id    UUID NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
    skill_name        TEXT NOT NULL,
    weight            NUMERIC NOT NULL DEFAULT 1.0 CHECK (weight >= 0),
    skill_order       INT NOT NULL,
    approved          BOOLEAN DEFAULT false,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CANDIDATES
-- Single master record per person. Email must be unique.
-- source tracks how they were added.
-- raw_text is the full parsed resume text used for AI calls.
-- ============================================================
CREATE TABLE candidates (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name         TEXT NOT NULL,
    email             TEXT UNIQUE NOT NULL,
    phone             TEXT,
    skills            TEXT[] DEFAULT '{}',
    experience_years  INT,
    resume_url        TEXT,
    raw_text          TEXT,
    source            TEXT CHECK (source IN ('csv', 'pdf', 'docx', 'manual')),
    uploaded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- APPLICATIONS (Applicant Table)
-- Links a candidate to a job opening.
-- One candidate can be linked to many jobs (unique pair enforced).
-- Each application has its own application_id even if the same
-- candidate applies to multiple job openings.
-- fuzzy_score set by AI weighted skill matching.
-- stage tracks pipeline progress: Screening → Technical → HR → Final
-- screening_status set by recruiter.
-- ============================================================
CREATE TABLE applications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id      UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_opening_id    UUID NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
    candidate_cv      TEXT,
    fuzzy_score       NUMERIC CHECK (fuzzy_score >= 0 AND fuzzy_score <= 100),
    match_score       INT CHECK (match_score >= 0 AND match_score <= 100),
    match_reason      TEXT,
    strengths         TEXT[] DEFAULT '{}',
    skill_gaps        TEXT[] DEFAULT '{}',
    screening_status  TEXT DEFAULT 'pending'
                          CHECK (screening_status IN ('pending', 'accepted', 'rejected')),
    stage             TEXT DEFAULT 'screening'
                          CHECK (stage IN ('screening', 'technical', 'hr', 'final', 'hired', 'rejected')),
    stage_status      TEXT DEFAULT 'pending'
                          CHECK (stage_status IN ('pending', 'in_progress', 'passed', 'failed', 'on_hold')),
    stage_notes       TEXT, -- Should contain the rejection reason when a candidate fails a round. To be considered if candidate reappears.
    priority          INT DEFAULT 0,
    reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT now(),
    UNIQUE (candidate_id, job_opening_id)
);

-- ============================================================
-- JOB CANDIDATES
-- Selected candidates for a job opening, sorted by fuzzy score.
-- This table is populated after the Scan and Publish process.
-- Links to applications via application_id.
-- ============================================================
CREATE TABLE job_candidates (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_opening_id    UUID NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
    application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    fuzzy_score       NUMERIC CHECK (fuzzy_score >= 0 AND fuzzy_score <= 100),
    rank_order        INT,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SCREENING QUESTIONS
-- Per candidate per job (via application_id).
-- Different for every candidate — personalised by AI.
-- Generated after the recruiter accepts a candidate.
-- Links to requirement and job for context.
-- ============================================================
CREATE TABLE screening_questions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    requirement_id    UUID REFERENCES requirements(id) ON DELETE SET NULL,
    job_opening_id    UUID REFERENCES job_openings(id) ON DELETE SET NULL,
    question          TEXT NOT NULL,
    difficulty        TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_order    INT,
    modified          BOOLEAN DEFAULT false,
    modified_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INTERVIEW STAGES
-- Defined per accepted candidate (via application_id).
-- stage_order determines sequence.
-- ============================================================
CREATE TABLE interview_stages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    stage_name        TEXT NOT NULL,
    stage_order       INT NOT NULL,
    status            TEXT DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    outcome           TEXT DEFAULT 'pending'
                          CHECK (outcome IN ('passed', 'failed', 'on_hold', 'pending')),
    scheduled_at      TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,
    notes             TEXT,
    updated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ACTIVITY LOG
-- Append-only. Every state change in the system is logged here.
-- metadata is a JSONB field for any extra context.
-- ============================================================
CREATE TABLE activity_log (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    action            TEXT NOT NULL,
    entity_type       TEXT NOT NULL,
    entity_id         UUID,
    metadata          JSONB DEFAULT '{}',
    created_at        TIMESTAMPTZ DEFAULT now()
);
```

### Key Relationships
- `clients` ← `requirements` ← `job_openings` (one requirement → multiple job_openings, AI-generated or manually added)
- `job_openings` → `job_opening_skills` (one-to-many, weighted skills for fuzzy scoring)
- `job_openings` + `candidates` → `applications` (junction table, one candidate can apply to many jobs)
- `applications` → `job_candidates` (selected candidates ranked by fuzzy score per job opening)
- `applications` → `screening_questions` (one-to-many, personalised per candidate, generated after accept)
- `applications` → `interview_stages` (one-to-many, for detailed stage tracking within the pipeline)
- `applications.stage` tracks pipeline progress: Screening → Technical → HR → Final
- Every mutation → `activity_log`

---

## 9. API Endpoints

> All endpoints are prefixed with `/api/v1`. All endpoints except `/auth/login` and `/auth/signup` require a valid JWT in the `Authorization: Bearer <token>` header. There are no role-based restrictions — any authenticated recruiter can call any endpoint.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/signup | Create new recruiter account |
| POST | /auth/login | Login, returns JWT |
| GET | /auth/me | Returns current user profile (includes `is_onboarded` flag) |
| PATCH | /auth/onboarded | Mark user as onboarded (set `is_onboarded = true`) |

### Clients
| Method | Endpoint | Description |
|---|---|---|
| GET | /clients | List all client names |
| POST | /clients | Add a new client name |
| DELETE | /clients/{id} | Remove a client (only if no linked requirements) |

### Requirements
| Method | Endpoint | Description |
|---|---|---|
| GET | /requirements | List all requirements |
| GET | /requirements/{id} | Get single requirement with linked job openings |
| POST | /requirements | Create requirement (triggers AI job generation) |
| PATCH | /requirements/{id} | Update requirement |
| DELETE | /requirements/{id} | Delete requirement |

### Job Openings
| Method | Endpoint | Description |
|---|---|---|
| GET | /jobs | List all job openings (dynamic table, grouped by requirement) |
| GET | /jobs/{id} | Get single job opening (full draft) |
| POST | /jobs | Manually create a new job opening ("+" button) |
| PATCH | /jobs/{id} | Manually edit draft fields |
| POST | /jobs/{id}/regenerate | Regenerate draft with instruction |
| POST | /jobs/{id}/confirm | Confirm job opening (ready for scan and publish) |
| POST | /jobs/{id}/scan-and-publish | Trigger AI skill extraction + fuzzy scoring |
| POST | /jobs/{id}/close | Close a published job |
| GET | /jobs/{id}/candidates | Get ranked candidates for this job (from job_candidates table) |

### Job Opening Skills
| Method | Endpoint | Description |
|---|---|---|
| GET | /jobs/{id}/skills | Get AI-extracted weighted skills for a job opening |
| PUT | /jobs/{id}/skills | Update/approve weighted skills (recruiter edits before scanning) |
| POST | /jobs/{id}/skills/approve | Approve skills and trigger candidate scanning |

### Candidates
| Method | Endpoint | Description |
|---|---|---|
| GET | /candidates | List all candidates in pool (de-duplicated by email/name) |
| GET | /candidates/{id} | Get single candidate full profile with all linked jobs |
| GET | /candidates/{id}/resume-url | Get signed URL for resume file (15 min expiry) |
| POST | /candidates | Add single candidate manually |
| POST | /candidates/upload/csv | Bulk upload via CSV |
| POST | /candidates/upload/file | Upload single PDF or DOCX |
| POST | /jobs/{id}/candidates/upload/csv | Job-specific CSV upload |
| POST | /jobs/{id}/candidates/upload/file | Job-specific file upload |
| PATCH | /jobs/{id}/candidates/{candidateId}/priority | Set candidate priority for a job |

### Applications
| Method | Endpoint | Description |
|---|---|---|
| GET | /jobs/{id}/applications | Get all applications for a job (with fuzzy scores) |
| GET | /applications/{id} | Get single application detail (includes stage info) |
| PATCH | /applications/{id}/accept | Accept candidate (triggers screening question generation) |
| PATCH | /applications/{id}/reject | Reject candidate |
| PATCH | /applications/{id}/stage | Update candidate's stage and stage status |

### Screening Questions
| Method | Endpoint | Description |
|---|---|---|
| GET | /applications/{id}/questions | Get all questions for an application |
| PATCH | /questions/{id} | Manually edit a question |
| POST | /questions/{id}/ai-edit | Edit question via AI instruction |

### Interview Stages
| Method | Endpoint | Description |
|---|---|---|
| GET | /applications/{id}/stages | Get all stages for an application |
| POST | /applications/{id}/stages | Add a new stage |
| PATCH | /stages/{id} | Update stage status and outcome |
| DELETE | /stages/{id} | Delete a stage |

### Chatbot
| Method | Endpoint | Description |
|---|---|---|
| POST | /chatbot/message | Send a message, receive AI response |

---

## 10. AI Features — Prompts and Logic

> All Claude API calls are made from `backend/app/services/ai_service.py`. Always use `claude-sonnet-4-20250514` as the model. Always request JSON output. Never expose the API key to the frontend.

### 10.1 Job Opening Generation

**Trigger**: Immediately after a requirement is saved. One Celery task fired per requested job post (1–3 tasks).

**Input**: Requirement object (title, description, skills[], experience_min, experience_max, budget_min, budget_max, seniority, notes, post_index)

**Prompt**:
```
You are a professional recruitment assistant helping write job descriptions.

Given the following job requirement, generate a complete and compelling job opening.
This is job post {post_index} of {num_posts_requested} for this requirement — make
each post distinct in tone or angle if generating multiple.

Requirement details:
- Title: {title}
- Description / notes from recruiter: {description}
- Required skills: {skills joined by comma}
- Experience: {experience_min}–{experience_max} years
- Seniority: {seniority}
- Budget: {budget_min}–{budget_max}

Return ONLY a valid JSON object with these exact fields:
{
  "title": "string",
  "description": "string (2–3 paragraph overview of the role)",
  "responsibilities": ["string", ...] (6–8 bullet points),
  "qualifications": ["string", ...] (5–7 bullet points),
  "salary_range": "string (e.g. ₹12–18 LPA)",
  "keywords": ["string", ...] (8–10 searchable keywords)
}

Do not include any text outside the JSON object.
```

**Expected output**: Valid JSON parsed into `job_openings` table.

---

### 10.2 Job Opening Regeneration

**Trigger**: Recruiter types an instruction and clicks Regenerate.

**Input**: Previous job opening draft (JSON) + recruiter instruction (string)

**Prompt**:
```
You are a professional recruitment assistant.

You previously generated this job opening draft:
{json.dumps(previous_draft, indent=2)}

The recruiter has requested the following change:
"{recruiter_instruction}"

Generate a revised version of the job opening incorporating this change.
Keep everything else the same unless the instruction requires changing it.

Return ONLY a valid JSON object with these exact fields:
{
  "title": "string",
  "description": "string",
  "responsibilities": ["string", ...],
  "qualifications": ["string", ...],
  "salary_range": "string",
  "keywords": ["string", ...]
}

Do not include any text outside the JSON object.
```

---

### 10.3 Candidate CV Parsing (PDF/DOCX)

**Trigger**: When a PDF or DOCX file is uploaded. Raw text extracted first using pdfplumber/python-docx, then sent to Claude.

**Prompt**:
```
You are a resume parsing assistant.

Extract structured information from the following resume text.

Resume text:
{raw_resume_text}

Return ONLY a valid JSON object with these exact fields:
{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "skills": ["string", ...],
  "experience_years": integer,
  "summary": "string (2–3 sentence professional summary)"
}

If a field cannot be found, use null for that field.
Do not include any text outside the JSON object.
```

---

### 10.4 Weighted Skill Extraction (Scan and Publish)

**Trigger**: When the recruiter clicks "Scan and Publish" on a confirmed job opening. Before any CV scanning begins.

**Input**: Job opening object + requirement object

**Prompt**:
```
You are a recruitment analysis assistant.

Analyze the following job opening and its source requirement. Extract the top 5
skills that are most important for this role. Assign a weight to each skill based
on its priority and importance to the role. Weights should sum to 1.0.

Job opening:
- Title: {job_title}
- Description: {job_description}
- Responsibilities: {responsibilities joined}
- Qualifications: {qualifications joined}
- Keywords: {keywords joined}

Source requirement:
- Title: {requirement_title}
- Description: {requirement_description}
- Required skills: {requirement_skills joined}
- Seniority: {seniority}
- Experience: {experience_min}–{experience_max} years

Return ONLY a valid JSON array of exactly 5 skill objects, ordered by weight
(highest first):
[
  {"skill_name": "string", "weight": float (0.0–1.0), "order": 1},
  {"skill_name": "string", "weight": float, "order": 2},
  ...
]

Weights must sum to 1.0. Do not include any text outside the JSON array.
```

**Expected output**: JSON array of 5 weighted skills. Saved to `job_opening_skills` table. Shown to recruiter in editable pop-up for approval.

---

### 10.5 Candidate Fuzzy Scoring (replaces simple matching)

**Trigger**: After recruiter approves the weighted skills for a job opening. One Claude call per candidate per job. Run in parallel via Celery.

**Input**: Approved weighted skills + candidate profile

**Prompt**:
```
You are a technical recruitment screening assistant.

Evaluate how well this candidate matches the job opening based on the following
weighted skills. Score each skill individually, then compute a weighted fuzzy
score.

Weighted skills for this job:
{skills_with_weights as JSON array}

Job opening:
- Title: {job_title}
- Description: {job_description}
- Qualifications: {qualifications joined}
- Responsibilities: {responsibilities joined}

Candidate profile:
- Name: {full_name}
- Skills: {candidate_skills joined}
- Experience: {experience_years} years
- Resume summary: {raw_text first 1500 chars}

For each weighted skill, rate the candidate from 0 to 100 on how well they
demonstrate that skill. Then calculate the overall fuzzy score as the weighted
sum: sum(skill_score * skill_weight) for all skills.

Return ONLY a valid JSON object:
{
  "fuzzy_score": float (0–100, the weighted sum),
  "skill_scores": [
    {"skill_name": "string", "weight": float, "score": integer (0–100)},
    ...
  ],
  "match_reason": "string (2–3 sentences explaining the overall fit)",
  "strengths": ["string", ...] (top 3 matching strengths),
  "skill_gaps": ["string", ...] (top 3 missing skills or gaps)
}

Do not include any text outside the JSON object.
```

**Ranking**: Candidates are sorted by `fuzzy_score` descending and stored in the `job_candidates` table. Fuzzy scores are also updated in the `applications` table.

**Shortlisting threshold**: Candidates with `fuzzy_score >= 60` are shown in the recruiter's pipeline view. Configurable via environment variable `MATCH_THRESHOLD`.

---

### 10.6 Personalised Screening Question Generation

**Trigger**: After a candidate is **accepted** by the recruiter (not immediately after matching). One Claude call per accepted candidate per job.

**Prompt**:
```
You are a technical interviewer generating screening questions.

Generate personalised interview screening questions for this specific candidate
applying for the role below. Questions must be tailored to their actual background,
not generic.

Job role: {job_title}
Required skills: {job_skills}

Candidate profile:
- Skills: {candidate_skills}
- Experience: {experience_years} years
- Resume highlights: {raw_text first 1000 chars}

Generate exactly 10 questions:
- 3 easy questions (basic knowledge, warm-up)
- 4 medium questions (role-specific, practical)
- 3 hard questions (advanced, problem-solving, situational)

Return ONLY a valid JSON array:
[
  {"question": "string", "difficulty": "easy", "order": 1},
  {"question": "string", "difficulty": "easy", "order": 2},
  ...
]

Make every question specific to this candidate's background.
Do not include any text outside the JSON array.
```

---

### 10.7 Question Editing via AI Instruction

**Trigger**: Recruiter types an instruction for a specific question and submits.

**Prompt**:
```
You are helping a recruiter refine an interview screening question.

Current question: "{existing_question}"
Difficulty level: {difficulty}
Job role: {job_title}
Recruiter instruction: "{instruction}"

Rewrite the question following the recruiter's instruction.
Keep the same difficulty level.

Return ONLY the revised question as a plain string.
No JSON, no explanation, no punctuation before or after — just the question.
```

---

### 10.8 Chatbot

**Trigger**: Recruiter sends a message from the chat panel.

**System prompt**:
```
You are a helpful assistant embedded inside Kozker Recruiter AI, an ATS platform.
You help recruiters quickly find information and understand the status of their
hiring pipeline.

Current user: {full_name}
Current page: {current_page}
Current page context: {page_context_summary}

Rules:
- Answer concisely and helpfully
- Never make up candidate names, scores, or data
- If you do not have the data to answer, say so clearly and suggest where to find it
- Do not perform any write operations — you are read-only
- Keep responses short (3–5 sentences max unless a list is needed)
```

**Page context**: FastAPI fetches a lightweight summary of the current page's data on every message and includes it in the system prompt.

---

## 11. CV Upload — All Methods

### Method 1 — Job-Specific Upload (inside a job opening)

- **Where**: Job Opening detail page → Upload CVs button
- **Effect**: Candidates parsed and saved to `candidates` table + `applications` records created linking each to this `job_opening_id`
- **Formats**: CSV, PDF, DOCX

### Method 2 — Common Pool Upload (Candidates page)

- **Where**: Candidates page → Upload button
- **Effect**: Candidates parsed and saved to `candidates` table only. No job link. Available for matching to any job later.
- **Formats**: CSV, PDF, DOCX

### CSV Format (expected columns)
```
full_name, email, phone, skills, experience_years
```
- `skills` column: comma-separated values within the cell (e.g. `"Python, Django, PostgreSQL"`)
- First row is treated as header
- Empty rows are skipped
- Rows with missing `full_name` or `email` are skipped with a warning

### PDF / DOCX Processing
1. File received by FastAPI
2. Text extracted using `pdfplumber` (PDF) or `python-docx` (DOCX)
3. Raw text sent to Claude for structured extraction (name, email, phone, skills, experience, summary)
4. Structured data saved to `candidates` table
5. Original file stored in Supabase Storage at path: `resumes/{candidate_id}/{filename}`
6. `resume_url` field set to the Supabase Storage path (served via pre-signed URLs — never a public URL)

### Duplicate Handling
- Unique constraint on `candidates.email`
- On duplicate: record is skipped, not updated
- After upload completes: response includes `{ inserted: N, skipped: M, errors: [] }`
- UI shows a summary banner: "X candidates added. Y duplicates skipped."

---

## 12. Chatbot Interface

### UI Behaviour
- Fixed position: right-side panel on every page inside the `(dashboard)` layout
- Default state: collapsed — a toggle button (Kozker AI branding) is visible on the right edge of the screen
- Expanded state: right-side panel slides in from the right, taking up a fixed width (~350px) alongside the main content
- Main content area adjusts (shrinks) when the chat panel is open
- Chat history shown as message bubbles (user right, AI left)
- Input field at the bottom of the panel with send button
- Session-only history (clears on page refresh — no DB persistence in this phase)
- Panel can be toggled open/closed at any time without losing conversation history

### Technical Flow
1. User types message → POST `/api/v1/chatbot/message`
2. Request body: `{ message: string, current_page: string, conversation_history: Message[] }`
3. FastAPI handler fetches page context from DB (lightweight summary query)
4. Claude API called with system prompt + conversation history + new message
5. Response returned to frontend and added to chat history

### What the chatbot can answer
- Status of specific job openings
- Count of candidates in a pipeline
- Status of a specific candidate's application
- Which candidates are pending review
- Stage statuses for a candidate
- General questions about how to use the platform

### What the chatbot cannot do
- Create, edit, or delete any data (read-only)
- Give information about future modules (client portal, reports, etc.)

---

## 13. UI — Page by Page

### Login Page
- Centered card layout with Kozker Recruiter AI branding
- Email + password fields
- Sign in button
- Link to signup page

### Signup Page
- Name, email, password fields
- Role set to `recruiter` automatically on creation
- Sign up button
- Link to login page

### Onboarding Tutorial (New Users Only)
- Triggered on first login (`is_onboarded = false`)
- Series of pop-up tooltips that walk the user through each section of the platform:
  1. Dashboard overview
  2. Requirements — how to add a requirement
  3. Job Openings — dynamic table and how to review/confirm openings
  4. Scan and Publish — skill approval and fuzzy scoring
  5. Candidates — uploading and managing CVs
  6. Candidate Stages — tracking candidate progress in the candidate details panel
- User can skip the tutorial at any time
- On completion or skip → `is_onboarded` set to `true`, not shown again

### Dashboard
- Summary stat cards: Open Jobs, Candidates Uploaded (this week), Pending Reviews, Stages In Progress
- AI status banner when a job is currently generating or scanning
- Recent job openings table (last 5)
- Recent activity feed (last 10 entries from `activity_log`)
- Quick action: New Requirement button in top bar

### Requirements Page
- Table: Client Name, Role Title, Number of Posts, Status, Created Date, Actions
- Add Requirement button opens a form with:
  - Client Name (dropdown from clients table — optional)
  - Role title
  - Description / paragraph (free text — AI will analyze this to create job openings)
  - Required skills (tag input)
  - Experience range, budget range, seniority (dropdown)
  - Number of job posts to generate (select: 1 / 2 / 3)
  - Notes
- On submit → saved → AI generation triggered → card shows "Generating..." badge
- AI from the requirement page creates job openings and shows them for that particular requirement

### Job Openings Page
- The page displays **Job Openings** which are mapped to the approved requirements.
- **Clicking a job opening** pops up the description of the job opening.
- The recruiter reviews and **approves the description**.
- Once approved, the AI scans the description and requirement to create 5 weighted skills.
- The recruiter will have the ability to **add new skills or approve the existing ones** created by the AI in an editable pop-up.
- These approved skills are then used to calculate the fuzzy score by **scanning the CVs**.
- After scanning → shows the **list of suitable candidates** sorted by fuzzy score.

### Job Detail Page — Draft state
- Shows all AI-generated fields (title, description, responsibilities, qualifications, salary range) — all editable inline
- Regenerate bar at the bottom: text input for instruction → Regenerate button
- **Confirm** button (confirms opening, makes it ready for Scan and Publish)
- Discard button

### Job Detail Page — Confirmed/Published state
- Job details header (read-only)
- Upload CVs section: CSV and file upload
- **Scan and Publish** button with interactive animation
- After scanning: ranked candidate list below (sorted by fuzzy score from Job-Candidate table)
- "+" button to add new candidates directly
- "+" button to add skills to the ranking criteria

### Candidate Detail Panel
- Name, email, phone, source tag
- Fuzzy score + "Why they fit" paragraph
- Skill tags with AI-rated scores
- Strengths list and Skill Gaps list
- Resume file link (opens via signed URL)
- Personalised screening questions with difficulty badges (generated after accept)
  - Pencil icon: manual edit inline
  - Wand icon: AI instruction input → update question
- Accept / Reject buttons
- After Accept: screening questions are generated, stage tracking begins
- Current **stage**: Screening → Technical → HR → Final
- **Stage status**: Pending / In Progress / Passed / Failed / On Hold
- **Notes** for the current stage: Must contain the **rejection reason** if a candidate fails a round, so it can be considered if they reapply.
- Full stage history and progress stepper (Screening → Technical → HR → Final)
- AI agent has access to this page for suggesting changes and filtering candidates.

### Candidate Pool Page
- Table of candidate details (candidate pool) updated from the Applicant table
- **De-duplication**: A function maps unique applicants based on email and/or name. Common candidates are mapped together under a single name entry with multiple jobs listed.
- Columns: Name, Email, Skills, Experience, Source, Linked Jobs (list of jobs they've applied for), Upload Date
- Search and filter by skills, experience range, source
- Upload CVs button (CSV or individual files)
- Drag-and-drop upload zone
- Shows candidate details, skills, and all jobs which they have applied for

### Clients Page
- Add client form (name only, single field)
- Table: Name, Requirements count, Active jobs count, Added by, Date

### Chatbot Panel (Right Side)
- Fixed right-side panel on all dashboard pages (collapsible)
- Toggle button on the right edge to open/close panel
- Panel slides in from the right (~350px width)
- Main content adjusts when panel is open
- Online status indicator
- Session message history
- Input field with send button

---

## 14. Auth and Security

### Authentication Flow
1. User submits email + password to Supabase Auth
2. Supabase Auth returns access token (JWT) and refresh token
3. Supabase JS SDK stores tokens in HTTP-only cookies
4. Next.js middleware (`middleware.ts`) reads cookie on every request:
   - No token → redirect to `/login`
   - Valid token → allow access
5. Every fetch call from `lib/api.ts` includes the JWT in `Authorization: Bearer` header
6. FastAPI `auth.py` middleware verifies JWT signature on every request using Supabase's public JWKS endpoint
7. If JWT is invalid or expired → 401 returned → frontend redirects to login

### No Role-Based Restrictions in This Phase
There is only one role (`recruiter`). FastAPI middleware only checks for a valid JWT — not for a specific role. All authenticated endpoints are accessible to any logged-in user. Role-based access control will be introduced in a future phase when multiple roles are added.

### RLS Policies (minimal, for safety)
```sql
-- All authenticated users can read and write their own data
-- In this single-user phase, RLS is kept permissive for all users
CREATE POLICY "authenticated_full_access"
ON candidates FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_full_access"
ON job_openings FOR ALL
USING (auth.role() = 'authenticated');
```

### Environment Variables (never commit to git)
```
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=https://your-fastapi-domain.railway.app

# Backend (.env)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DATABASE_URL=postgresql+asyncpg://...
ANTHROPIC_API_KEY=
RESEND_API_KEY=
REDIS_URL=redis://...
MATCH_THRESHOLD=60
```

---

## 15. Background Jobs

All background jobs use Celery with Redis as the broker. Jobs are defined in `backend/app/workers/tasks.py`.

### Task: generate_job_opening
- **Triggered by**: POST `/requirements` (on save) — one task fired per `num_posts_requested`
- **Input**: `requirement_id`, `post_index`
- **Steps**: Fetch requirement from DB → build prompt → call Claude → parse JSON → save to `job_openings` with status `draft`, `post_index` set → update Supabase Realtime channel
- **On error**: Set `job_openings.processing_status = 'error'`, set `error_message`, notify recruiter

### Task: extract_job_skills
- **Triggered by**: POST `/jobs/{id}/scan-and-publish` (when recruiter clicks Scan and Publish)
- **Input**: `job_opening_id`
- **Steps**: Fetch job opening + requirement → call Claude skill extraction prompt (10.4) → parse JSON array of 5 weighted skills → save to `job_opening_skills` table → set `processing_status = 'skill_approval'` → notify frontend to show editable skill pop-up to recruiter
- **On error**: Set `processing_status = 'error'`, set `error_message`

### Task: fuzzy_score_candidates
- **Triggered by**: POST `/jobs/{id}/skills/approve` (after recruiter approves weighted skills)
- **Input**: `job_opening_id`, approved skills with weights
- **Steps**: Fetch job + all linked candidates → for each candidate, call Claude fuzzy scoring prompt (10.5) with approved weighted skills → save fuzzy_score, skill_scores, match_reason, strengths, skill_gaps to `applications` → insert ranked candidates into `job_candidates` table sorted by fuzzy_score → update `processing_status = 'matching'` → after all complete, set `processing_status = 'ready'` → set job status to `published` → notify recruiter
- **Parallelism**: Each candidate scored in a separate subtask using Celery group

### Task: generate_screening_questions
- **Triggered by**: PATCH `/applications/{id}/accept` (after recruiter accepts a candidate)
- **Input**: `application_id`
- **Steps**: Fetch candidate + job → call Claude question generation prompt (10.6) → parse JSON array → save to `screening_questions` with `requirement_id` and `job_opening_id` → notify recruiter via Supabase Realtime

### Task: send_email
- **Triggered by**: Various events
- **Input**: `to`, `subject`, `template_name`, `template_data`
- **Steps**: Call Resend API → log result to activity_log

---

## 16. Email Notifications

Using Resend for all transactional email. Email calls are always made from Celery tasks, never inline in API routes.

| Trigger | Recipient | Subject |
|---|---|---|
| Requirement saved, AI generation starts | Recruiter who created it | "Job draft is being generated for {requirement_title}" |
| AI generation complete | Recruiter | "Your job opening draft for {title} is ready to review" |
| Candidate matching complete | Recruiter | "{N} candidates matched for {job_title}" |

> More email triggers will be added in future phases (client welcome email, stage status notifications).

---

## 17. File Storage

Using Supabase Storage.

### Bucket Structure
```
resumes/
  {candidate_id}/
    {original_filename}
```

### Access Rules
- Files are NOT publicly accessible
- FastAPI generates a signed URL valid for 15 minutes when a recruiter opens a candidate detail panel
- Signed URL endpoint: `GET /candidates/{id}/resume-url`
- Frontend loads the resume viewer using this signed URL

### Upload Size Limits
- Individual PDF/DOCX: 10MB max
- CSV: 5MB max (enforced in FastAPI)

---

## 18. Error Handling Rules

1. **AI generation fails**: Set `job_openings.processing_status = 'error'`, store error message, show error badge in UI with "Retry" button
2. **CV parsing fails** (unparseable PDF): Skip file, include filename in error list returned to uploader
3. **Duplicate email on upload**: Skip silently, include in `skipped` count in response
4. **Claude API rate limit**: Celery task retries with exponential backoff (3 retries, delays: 30s, 60s, 120s)
5. **JWT expired**: FastAPI returns 401, Next.js catches and redirects to login
6. **DB connection error**: FastAPI returns 503, frontend shows "Service temporarily unavailable"
7. **Never silently fail**: Every error writes to `activity_log` and is surfaced to the user in the UI

---

## 19. Build Order

Build strictly in this order. Each step is independently functional before moving to the next.

| Week | Step | What gets built |
|---|---|---|
| 1–2 | Foundation | Next.js setup, FastAPI setup, Supabase project, auth (login, signup, JWT middleware, redirect to dashboard), onboarding tutorial skeleton, empty dashboard shell with sidebar |
| 3 | Core data | Clients (name only, optional), Requirements CRUD, Job Openings CRUD (manual + AI), dynamic Notion-style table — all manual, no AI, all forms and tables working |
| 4 | AI job generation | Claude API integration, job generation on requirement save (1–3 posts), review/edit/regenerate UI, confirm flow, "+" button for manual openings, Supabase Realtime status updates |
| 5 | CV upload | CSV parser (Papaparse frontend + pandas backend), PDF/DOCX parser (pdfplumber + python-docx), both upload methods, duplicate handling, Supabase Storage |
| 6 | Scan & Publish + Fuzzy scoring | Scan and Publish button with animation, AI skill extraction, editable skill pop-up, recruiter approval, fuzzy scoring per candidate, Job-Candidate table, ranked candidate view |
| 7 | Screening + Stages | Accept/Reject functionality, post-accept question generation, question editing (manual + AI), stage-based pipeline (Screening → Technical → HR → Final), stage status tracking, pipeline integration with job openings, activity log |
| 8 | Candidate Pool + Chatbot | Candidate de-duplication view, multi-job display, right-side chat panel UI, FastAPI chatbot endpoint, page context fetching, Claude integration |
| 9 | Onboarding + Polish | Onboarding tutorial pop-ups, standard filters, AI agent page access, loading states, error states, empty states, processing_status spinners, edge cases, security review |

---

## 20. Key Design Decisions

**Why one `candidates` table with a separate `applications` junction table?**
A single candidate (identified by email) can be uploaded for multiple jobs. The `candidates` table holds one canonical record per person. The `applications` table links each candidate to each job they are being considered for, with each application having its own `application_id`. This prevents data duplication and makes it easy to track a person’s history across multiple openings.

**Why are screening questions per application and not per job?**
Questions are personalised to each candidate’s specific resume and skills. Two candidates applying to the same job will have different questions tailored to their backgrounds. This is more effective for screening and fairer — each candidate is evaluated on their own merits.

**Why fuzzy scoring with weighted skills instead of a simple match score?**
A simple 0–100 match score is opaque and hard to trust. By extracting `n` weighted skills (default 5) and scoring candidates against each skill individually, the recruiter gets a transparent, interpretable ranking. The recruiter can also edit the skills and weights before scanning, giving them control over what matters most. The weighted sum produces a fuzzy score that reflects priority-based matching.

**Why require recruiter approval of skills before scanning?**
AI-extracted skills may not perfectly align with what the recruiter values. The approval step gives the recruiter control and trust in the ranking process. They can add, remove, or re-weight skills before any CVs are scanned. This human-in-the-loop approach ensures the AI serves the recruiter’s judgement, not the other way around.

**Why a dynamic Notion-style table for job openings?**
Recruiters are familiar with Notion-style tables from their daily workflows. A dynamic table grouped by requirement makes it easy to see all openings at a glance, add new ones inline, and manage them without navigating away. It also integrates naturally with the Scan and Publish workflow.

**Why fixed stages (Screening → Technical → HR → Final) instead of custom stages?**
Fixed stages provide a consistent pipeline that all candidates go through. This standardises reporting, makes filtering predictable, and aligns with common recruitment workflows. The `interview_stages` table tracks each stage instance per candidate with status and outcome.

**Why a separate Job-Candidate table?**
The `job_candidates` table stores the ranked, post-scan results separately from the raw `applications` table. This makes it fast to query "show me the top candidates for this job sorted by fuzzy score" without re-sorting the entire applications table. It also provides a clear separation between "all candidates linked to a job" and "candidates that passed the fuzzy scoring threshold."

**Why Celery for AI calls and not inline in FastAPI?**
AI calls to Claude can take 5–30 seconds. If done inline, the API request would time out and the user would see a loading spinner for a long time. Celery runs these in the background. FastAPI immediately returns a response with a "processing" status, and the frontend receives the real-time update via Supabase Realtime when the job is done.

**Why keep client as name-only in this phase?**
The client module (with verification, login, and portal) is a significant feature set. Building it partially would create technical debt. The name-only approach gives the current phase a working foreign key relationship with zero risk of half-built features.

**Why not expose Supabase directly to the frontend for data queries?**
All data queries go through FastAPI. This keeps business logic and AI calls in one place. Supabase is used for Auth, Storage, and Realtime only from the frontend.

**Why `processing_status` on `job_openings`?**
AI skill extraction, fuzzy scoring, and question generation can take minutes for large candidate pools. The `processing_status` field acts as a state machine (`idle → generating → skill_approval → matching → questions_ready → ready → error`) that the frontend polls via Supabase Realtime. This prevents the recruiter from seeing a blank pipeline while background work is running.

**Why a single `recruiter` role in this phase?**
Adding role separation before it is needed creates complexity in middleware, endpoints, and UI that slows down the initial build. The single-role approach means no permission logic anywhere in the codebase. When multi-user support is needed, role is already a column in the `users` table — the constraint simply needs to be widened and middleware added.

**Why allow 1–3 job posts per requirement?**
A single requirement may produce subtly different job posts targeting different aspects of the role (e.g. one more technical, one more leadership-focused). The `post_index` column on `job_openings` tracks which post it is. All posts from the same requirement share the same `requirement_id` as a foreign key.

---

## 21. Glossary

| Term | Definition |
|---|---|
| Recruiter | The only user type in this phase. Has full access to all features. Also acts as admin. |
| Onboarding Tutorial | A guided pop-up tooltip walkthrough shown to first-time users. Covers all major sections of the platform. |
| Requirement | A job requirement created by a recruiter, describing the role, skills, budget, and seniority needed by a client. Can be entered as structured fields, free-text description, or both. AI analyzes this to create job openings. |
| Job Opening | A job description derived from a requirement. Can be AI-generated or manually created via "+" button. Lifecycle: draft → confirmed → published → closed |
| Dynamic Table | Notion-style interactive table displaying job openings grouped by requirement. Supports inline actions. |
| Post Index | The order number of a job opening within its requirement (1, 2, or 3) |
| Candidate | A person in the system. Added via CSV, PDF, DOCX upload, or manual entry. Identified uniquely by email. |
| Application (Applicant) | The link between a candidate and a job opening. Each application has its own ID even for the same candidate across multiple jobs. Holds fuzzy score, stage, stage status (with rejection reason in stage notes on failure), screening status, and is the parent of screening questions. |
| Fuzzy Score | A weighted sum (0–100) generated by Claude based on how well a candidate's CV matches the approved weighted skills for a job opening. Replaces the simple match score. |
| Weighted Skills | A set of `n` skills (default 5) extracted by AI from a job opening and requirement, each with a weight reflecting priority. Sum of weights = 1.0. Recruiter must approve before scanning. |
| Scan and Publish | The process of extracting weighted skills, getting recruiter approval, then scanning all candidate CVs to generate fuzzy scores and rank candidates. Triggered via an animated button on the Job Opening page. |
| Job-Candidate Table | A table of selected candidates for a job opening, sorted by fuzzy score descending. Populated after Scan and Publish. |
| Screening Status | The recruiter’s decision on a candidate for a job: pending / accepted / rejected |
| Screening Questions | 8–10 interview questions generated by Claude after a candidate is accepted. Personalised to each candidate’s resume and skills for a specific job. |
| Stage | A fixed step in the interview pipeline: Screening → Technical → HR → Final. Tracked per applicant in the applications table. |
| Stage Status | The status of a candidate within a stage: pending / in_progress / passed / failed / on_hold |
| Interview Stage | A tracked step in the interview pipeline for an accepted candidate (e.g. Technical Interview). Has status, outcome, scheduled/completed timestamps, and notes. |
| Processing Status | The background job state of a job opening: idle / generating / skill_approval / matching / questions_ready / ready / error |
| Activity Log | Append-only audit trail of every significant action in the system |
| Common Pool | The global candidate list. Candidates here are not linked to a specific job until matched. |
| Job-Specific Upload | CV upload done directly inside a job opening page — candidates are auto-linked to that job |
| Candidate De-duplication | A function that maps unique applicants based on email and/or name, grouping common candidates under a single entry with multiple jobs listed. |
| AI Agent | An AI agent with access to specific views (Job Opening page, candidate details) that can assist the recruiter with filtering, updates, and suggestions. |
| Celery Task | A Python function that runs in the background, outside the main API request cycle |
| JWT | JSON Web Token — the encrypted token issued by Supabase Auth that proves a user’s identity |
| Claude API | Anthropic’s AI API used for all intelligent features: job generation, skill extraction, fuzzy scoring, question generation, chatbot |
| Signed URL | A temporary, expiring URL for accessing a file in Supabase Storage — used to serve resumes securely |

---

*Last updated: v3.2 — Remove separate Pipeline/Stages page & document rejection reason handling*
*Change from v3.0: Renamed all "round" references to "stages" throughout — interview_rounds table → interview_stages, round_name → stage_name, round_order → stage_order, /rounds API routes → /stages, RoundList/RoundItem components → StageList/StageItem. Redesigned chatbot from floating bottom-right bubble to a fixed right-side collapsible panel (~350px) that adjusts main content when open. Updated ChatBubble.tsx → ChatToggle.tsx component.*
*Change from v2.0: Added onboarding tutorial for new users. Redesigned Job Openings page as dynamic Notion-style table. Added Scan and Publish workflow with AI-extracted weighted skills, recruiter approval step, and fuzzy scoring. Replaced simple match_score with weighted fuzzy scoring. Added job_opening_skills table, job_candidates table. Added "+" button for manual job openings, skills, and candidates. Integrated Pipeline page with Job Opening page (removing the separate Pipeline page). Fixed stages (Screening → Technical → HR → Final). Added candidate de-duplication view. Added AI agent access to Job Opening page and candidate details. Added confirmed status to job opening lifecycle. Screening questions now generated after accept.*
*Stack: Next.js 14 · FastAPI · Supabase · Claude API · Celery · Redis · Resend*
