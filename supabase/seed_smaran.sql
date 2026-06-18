-- Ensure candidates table has the correct schema columns
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS working_or_not BOOLEAN DEFAULT TRUE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS academic_details TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS achievements TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 1. Ensure profile exists and is onboarded
INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    is_active, 
    is_onboarded, 
    created_at, 
    updated_at
)
VALUES (
    'f3dcea71-25c3-431b-8f51-7f8699421cfd',
    'smaranlm10@gmail.com',
    'Smaran Devaki',
    'recruiter',
    TRUE,
    TRUE,
    now(),
    now()
)
ON CONFLICT (id) DO UPDATE
SET is_onboarded = TRUE, role = 'recruiter';

-- 2. Seed Clients
INSERT INTO public.clients (id, name, created_by, created_at, updated_at)
VALUES 
    ('c1111111-1111-1111-1111-111111111111', 'Google', 'f3dcea71-25c3-431b-8f51-7f8699421cfd', now(), now()),
    ('c2222222-2222-2222-2222-222222222222', 'Stripe', 'f3dcea71-25c3-431b-8f51-7f8699421cfd', now(), now()),
    ('c3333333-3333-3333-3333-333333333333', 'Vercel', 'f3dcea71-25c3-431b-8f51-7f8699421cfd', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Requirements
INSERT INTO public.requirements (
    id, 
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
    updated_at
)
VALUES 
    (
        'e1111111-1111-1111-1111-111111111111',
        'c1111111-1111-1111-1111-111111111111',
        'Senior Frontend Engineer (Next.js & React)',
        'We are looking for a Senior Frontend Engineer to build high-performance user interfaces for our Next-Gen Cloud Console. Experience with React, Tailwind CSS, Next.js, and TypeScript is mandatory. You will own client-side architecture and optimize page loading speeds.',
        ARRAY['React', 'Next.js', 'Tailwind CSS', 'TypeScript', 'Web Performance'],
        5,
        10,
        15,
        25,
        'senior',
        'Focus on engineers who have optimized page performance and have built enterprise SaaS dashboards.',
        2,
        'ready',
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now() - INTERVAL '3 days',
        now() - INTERVAL '3 days'
    ),
    (
        'e2222222-2222-2222-2222-222222222222',
        'c2222222-2222-2222-2222-222222222222',
        'Staff Systems Engineer (Rust)',
        'Looking for a Staff Engineer to join our high-volume core payments ledger team. You will build distributed transactional services in Rust. Deep understanding of ACID, systems engineering, databases, and low-latency networking is required.',
        ARRAY['Rust', 'Distributed Systems', 'SQL', 'Systems Programming'],
        8,
        15,
        30,
        45,
        'lead',
        'Strict ledger requirements. Candidates must have experience scaling low-latency services.',
        1,
        'ready',
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now() - INTERVAL '1 day',
        now() - INTERVAL '1 day'
    )
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Job Openings
INSERT INTO public.job_openings (
    id, 
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
    ai_generated, 
    approved_by, 
    created_at, 
    updated_at, 
    published_at
)
VALUES 
    (
        'ab111111-1111-1111-1111-111111111111',
        'e1111111-1111-1111-1111-111111111111',
        1,
        'Senior UI/Frontend Developer - Cloud Platform',
        'Google Cloud Platform (GCP) is seeking a Senior Frontend Developer to design and implement slick, high-density dashboard controls for GCP console. You will lead UI component designs, collaborate with backend specialists, and improve client-side performance. A focus on developer tooling, responsive systems, and design tokens is essential.',
        ARRAY[
            'Design and build responsive UI dashboards for GCP Cloud Console using React and Next.js.',
            'Implement complex client-side state management systems with Redux or TanStack Query.',
            'Optimize web vital metrics focusing on LCP, FID, and CLS.',
            'Author comprehensive unit and integration test coverage using Jest and Testing Library.',
            'Create shared design system components complying with WCAG Accessibility guidelines.'
        ],
        ARRAY[
            '5+ years of software development experience specializing in frontend architectures.',
            'Strong proficiency in modern JavaScript, TypeScript, and functional programming.',
            'Deep familiarity with Tailwind CSS, post-CSS frameworks, and styling optimization.',
            'Proven experience with server-side rendering (SSR) and Incremental Static Regeneration (ISR).',
            'Excellent collaborative skills working alongside product design and API specialists.'
        ],
        ARRAY['React', 'Next.js', 'TypeScript', 'Performance', 'GCP', 'Tailwind CSS'],
        '₹18 - ₹24 LPA',
        'published',
        'ready',
        TRUE,
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now() - INTERVAL '3 days',
        now() - INTERVAL '2 days',
        now() - INTERVAL '2 days'
    ),
    (
        'ab222222-2222-2222-2222-222222222222',
        'e1111111-1111-1111-1111-111111111111',
        2,
        'Staff Web Architect - Cloud Console Core',
        'Join the GCP Core UX team as a Staff Web Architect. You will shape the micro-frontend architectures governing hundreds of microservices. This role demands exceptional knowledge of module federation, browser caching, web security, and low-level bundler optimizations.',
        ARRAY[
            'Own the architectural blueprints for the GCP Core Micro-Frontend shell.',
            'Design modules using Webpack module federation and Rspack bundlers.',
            'Develop core guidelines for authentication, analytics, and service worker caching.',
            'Direct performance audits across junior development squads to maintain console responsiveness.'
        ],
        ARRAY[
            '8+ years of web engineering experience, with 2+ years leading framework architectures.',
            'Expertise in bundlers (Webpack, Vite, Turbopack) and performance auditing.',
            'Solid foundations in HTTP caching, web worker threads, and browser performance diagnostics.'
        ],
        ARRAY['Module Federation', 'Web Performance', 'Bundling', 'Next.js', 'Architect'],
        '₹24 - ₹32 LPA',
        'draft',
        'ready',
        TRUE,
        NULL,
        now() - INTERVAL '3 days',
        now() - INTERVAL '3 days',
        NULL
    ),
    (
        'ab333333-3333-3333-3333-333333333333',
        'e2222222-2222-2222-2222-222222222222',
        1,
        'Staff Systems Engineer - Distributed Transaction Ledger',
        'Stripe is building high-availability ledger databases. We are looking for an expert Systems Engineer to architect low-latency services in Rust. You will develop software directly handling financial ledger entries, ensuring strict ACID properties and fault tolerance.',
        ARRAY[
            'Architect and implement Ledger storage engines in safe and concurrent Rust code.',
            'Build distributed consensus layer modules utilizing Raft protocol architectures.',
            'Create custom database index engines optimized for disk storage layout systems.',
            'Integrate automated fuzz testing harnesses for transactional ledger validation.'
        ],
        ARRAY[
            '8+ years of systems engineering, with at least 3 years writing Rust in production.',
            'Strong understanding of relational databases, transactions, and ACID isolation levels.',
            'Expertise in network socket communication, TCP protocols, and RPC frameworks.'
        ],
        ARRAY['Rust', 'Consensus', 'Ledger', 'ACID', 'Stripe', 'Databases'],
        '₹35 - ₹50 LPA',
        'confirmed',
        'idle',
        TRUE,
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now() - INTERVAL '1 day',
        now() - INTERVAL '1 day',
        NULL
    )
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Job Opening Skills
INSERT INTO public.job_opening_skills (job_opening_id, skills)
VALUES 
    (
        'ab111111-1111-1111-1111-111111111111', 
        '[
            {"id": "b1111111-1111-1111-1111-111111111111", "job_opening_id": "ab111111-1111-1111-1111-111111111111", "skill_name": "React", "weight": 0.30, "skill_order": 1, "approved": true},
            {"id": "b2222222-2222-2222-2222-222222222222", "job_opening_id": "ab111111-1111-1111-1111-111111111111", "skill_name": "Next.js", "weight": 0.25, "skill_order": 2, "approved": true},
            {"id": "b3333333-3333-3333-3333-333333333333", "job_opening_id": "ab111111-1111-1111-1111-111111111111", "skill_name": "Tailwind CSS", "weight": 0.15, "skill_order": 3, "approved": true},
            {"id": "b4444444-4444-4444-4444-444444444444", "job_opening_id": "ab111111-1111-1111-1111-111111111111", "skill_name": "TypeScript", "weight": 0.15, "skill_order": 4, "approved": true},
            {"id": "b5555555-5555-5555-5555-555555555555", "job_opening_id": "ab111111-1111-1111-1111-111111111111", "skill_name": "Web Performance", "weight": 0.15, "skill_order": 5, "approved": true}
        ]'::jsonb
    )
ON CONFLICT (job_opening_id) DO NOTHING;


-- 6. Seed Candidates
INSERT INTO public.candidates (
    id, 
    full_name, 
    email, 
    phone, 
    skills, 
    experience_years, 
    current_company, 
    resume_url, 
    parsed_resume_json, 
    education,
    working_or_not,
    academic_details,
    achievements,
    source, 
    uploaded_by, 
    created_at, 
    updated_at
)
VALUES 
    (
        'ca111111-1111-1111-1111-111111111111',
        'Rohan Sharma',
        'rohan.sharma@example.com',
        '+91 98765 43210',
        ARRAY['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Redux', 'Node.js'],
        6,
        'Flipkart',
        'resumes/cand-1/rohan_sharma_resume.pdf',
        '{"summary": "Senior UI Developer with experience in Next.js transitions and UI optimization."}'::jsonb,
        'Bachelor''s in Computer Science',
        TRUE,
        'Bachelor of Technology in Computer Science and Engineering, IIT Delhi (2016-2020) - CGPA: 8.9/10. Key coursework: Data Structures, Advanced Algorithms, Web Engineering.',
        'Winner of Smart India Hackathon (2019) for constructing an optimized logistics tracking system. Published a research paper on responsive UI rendering algorithms.',
        'pdf',
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now() - INTERVAL '2 days',
        now() - INTERVAL '2 days'
    ),
    (
        'ca222222-2222-2222-2222-222222222222',
        'Priya Patel',
        'priya.patel@example.com',
        '+91 91234 56789',
        ARRAY['React', 'JavaScript', 'HTML', 'CSS', 'Webpack', 'Vite', 'GraphQL'],
        5,
        'TCS',
        'resumes/cand-2/priya_patel_cv.docx',
        '{"summary": "Frontend Developer with standard CSS grids and React render loop knowledge."}'::jsonb,
        'Bachelor''s in Information Technology',
        FALSE,
        'Bachelor of Science in Information Technology, Mumbai University (2017-2020) - GPA: 3.8/4.0. Completed Advanced Frontend Specialization Certification.',
        'Recognized as ''Best Performer of the Quarter'' twice at TCS for UI modularization projects. Open-source contributor to React-based routing utilities.',
        'docx',
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now() - INTERVAL '2 days',
        now() - INTERVAL '2 days'
    ),
    (
        'ca333333-3333-3333-3333-333333333333',
        'Siddharth Verma',
        'sid.verma@example.com',
        '+91 99887 76655',
        ARRAY['Rust', 'Distributed Systems', 'PostgreSQL', 'C++', 'Docker'],
        9,
        'Razorpay',
        'resumes/cand-3/sid_verma_ledger.pdf',
        '{"summary": "Systems Developer specializing in ledger design and Rust databases."}'::jsonb,
        'Master''s in Software Engineering',
        TRUE,
        'Master of Science in Software Systems, BITS Pilani (2013-2015) - CGPA: 9.2/10. Thesis focused on Distributed Transaction Isolation Levels.',
        'Designed Swiggy''s high-concurrency ledger backend scaling to 15,000 QPS. Optimized transaction consensus loops, saving 20% in infrastructure cloud costs.',
        'pdf',
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now() - INTERVAL '1 day',
        now() - INTERVAL '1 day'
    )
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Applications
INSERT INTO public.applications (
    id, 
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
    updated_at
)
VALUES 
    (
        'ad111111-1111-1111-1111-111111111111',
        'ca111111-1111-1111-1111-111111111111',
        'ab111111-1111-1111-1111-111111111111',
        'resumes/cand-1/rohan_sharma_resume.pdf',
        94.5,
        95,
        'Exceptional background in React, Next.js, and TypeScript. Experience migrating critical checkout systems matching top skills. High performance awareness.',
        ARRAY['Strong Next.js expertise', 'Mentorship experience', 'Performance optimization success'],
        ARRAY['No direct GCP console experience'],
        'accepted',
        'technical',
        'in_progress',
        'Technical interview scheduled for Thursday. Impressive resume.',
        1,
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now(),
        now(),
        now()
    ),
    (
        'ad222222-2222-2222-2222-222222222222',
        'ca222222-2222-2222-2222-222222222222',
        'ab111111-1111-1111-1111-111111111111',
        'resumes/cand-2/priya_patel_cv.docx',
        72.0,
        72,
        'Strong HTML/CSS/React roots. Missing TypeScript and Next.js experience, which are core framework dependencies for this role.',
        ARRAY['Clean CSS skills', 'Core React rendering competency', 'Detail-oriented'],
        ARRAY['No Next.js experience', 'No TypeScript experience'],
        'accepted',
        'screening',
        'passed',
        'Initial recruiter screen cleared. Moving to tech evaluation.',
        0,
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now(),
        now(),
        now()
    ),
    (
        'ad333333-3333-3333-3333-333333333333',
        'ca111111-1111-1111-1111-111111111111',
        'ab222222-2222-2222-2222-222222222222',
        'resumes/cand-1/rohan_sharma_resume.pdf',
        88.0,
        88,
        'Very strong technical architectural alignment. Handled Flipkart check-out transition matching console microservices goals. Needs checking on module federation.',
        ARRAY['Check-out migraton leader', 'Strong framework foundations'],
        ARRAY['No explicit Module Federation experience listed'],
        'pending',
        'screening',
        'in_progress',
        'Under consideration for core micro-frontend architect options.',
        0,
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now(),
        now(),
        now()
    )
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Job Candidates (Rankings)
INSERT INTO public.job_candidates (
    id, 
    job_opening_id, 
    candidate_id, 
    application_id, 
    fuzzy_score, 
    rank_order, 
    strengths, 
    skill_gaps, 
    ai_reasoning, 
    status, 
    created_at
)
VALUES 
    (
        'dc111111-1111-1111-1111-111111111111',
        'ab111111-1111-1111-1111-111111111111',
        'ca111111-1111-1111-1111-111111111111',
        'ad111111-1111-1111-1111-111111111111',
        94.5,
        1,
        ARRAY['Strong Next.js expertise', 'Performance optimization success'],
        ARRAY['No direct GCP console experience'],
        'Matches 95% of core requirements including Next.js and performance tuning.',
        'accepted',
        now()
    ),
    (
        'dc222222-2222-2222-2222-222222222222',
        'ab111111-1111-1111-1111-111111111111',
        'ca222222-2222-2222-2222-222222222222',
        'ad222222-2222-2222-2222-222222222222',
        72.0,
        2,
        ARRAY['Core React rendering competency'],
        ARRAY['No Next.js experience', 'No TypeScript experience'],
        'React foundations are strong but lack of Next.js/TypeScript limits scoring.',
        'pending',
        now()
    )
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Screening Questions
INSERT INTO public.screening_questions (
    id, 
    application_id, 
    job_candidate_id, 
    requirement_id, 
    job_opening_id, 
    question, 
    difficulty, 
    question_order, 
    ai_generated, 
    created_at
)
VALUES 
    (
        'f1111111-1111-1111-1111-111111111111',
        'ad111111-1111-1111-1111-111111111111',
        'dc111111-1111-1111-1111-111111111111',
        'e1111111-1111-1111-1111-111111111111',
        'ab111111-1111-1111-1111-111111111111',
        'In your Flipkart experience, how did you manage the checkout state during the Next.js App Router transition? Explain your strategy for caching server component inputs.',
        'hard',
        1,
        TRUE,
        now()
    ),
    (
        'f2222222-2222-2222-2222-222222222222',
        'ad111111-1111-1111-1111-111111111111',
        'dc111111-1111-1111-1111-111111111111',
        'e1111111-1111-1111-1111-111111111111',
        'ab111111-1111-1111-1111-111111111111',
        'What performance metrics did you focus on when improving Flipkart''s page load speed, and what tools did you use to measure LCP?',
        'medium',
        2,
        TRUE,
        now()
    ),
    (
        'f3333333-3333-3333-3333-333333333333',
        'ad111111-1111-1111-1111-111111111111',
        'dc111111-1111-1111-1111-111111111111',
        'e1111111-1111-1111-1111-111111111111',
        'ab111111-1111-1111-1111-111111111111',
        'Explain the differences between Server Actions and API Route handlers in Next.js 14.',
        'easy',
        3,
        TRUE,
        now()
    )
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Interview Stages
INSERT INTO public.interview_stages (
    id, 
    application_id, 
    job_candidate_id, 
    stage_name, 
    stage_order, 
    status, 
    outcome, 
    notes, 
    scheduled_at, 
    completed_at, 
    updated_by, 
    created_at, 
    updated_at
)
VALUES 
    (
        'de111111-1111-1111-1111-111111111111',
        'ad111111-1111-1111-1111-111111111111',
        'dc111111-1111-1111-1111-111111111111',
        'screening',
        1,
        'completed',
        'passed',
        'Polite candidate, fits salary parameters.',
        now() - INTERVAL '48 hours',
        now() - INTERVAL '47 hours',
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now(),
        now()
    ),
    (
        'de222222-2222-2222-2222-222222222222',
        'ad111111-1111-1111-1111-111111111111',
        'dc111111-1111-1111-1111-111111111111',
        'technical',
        2,
        'scheduled',
        'pending',
        'Assigned interviewer: Senior Staff GCP console Lead.',
        now() + INTERVAL '48 hours',
        NULL,
        'f3dcea71-25c3-431b-8f51-7f8699421cfd',
        now(),
        now()
    )
ON CONFLICT (id) DO NOTHING;

-- 11. Seed Activity Logs
INSERT INTO public.activity_log (id, actor_id, actor_name, action, entity_type, entity_id, metadata, created_at)
VALUES 
    (
        'df111111-1111-1111-1111-111111111111', 
        'f3dcea71-25c3-431b-8f51-7f8699421cfd', 
        'Smaran Devaki', 
        'job_created', 
        'job_openings', 
        'ab111111-1111-1111-1111-111111111111', 
        '{"job_title": "Senior UI/Frontend Developer - Cloud Platform", "requirement_title": "Senior Frontend Engineer"}'::jsonb, 
        now() - INTERVAL '3 days'
    ),
    (
        'df222222-2222-2222-2222-222222222222', 
        'f3dcea71-25c3-431b-8f51-7f8699421cfd', 
        'Smaran Devaki', 
        'candidate_uploaded', 
        'candidates', 
        'ca111111-1111-1111-1111-111111111111', 
        '{"candidate_name": "Rohan Sharma", "job_title": "Senior UI/Frontend Developer - Cloud Platform"}'::jsonb, 
        now() - INTERVAL '2 days'
    ),
    (
        'df333333-3333-3333-3333-333333333333', 
        'f3dcea71-25c3-431b-8f51-7f8699421cfd', 
        'Smaran Devaki', 
        'candidate_ranked', 
        'applications', 
        'ad111111-1111-1111-1111-111111111111', 
        '{"candidate_name": "Rohan Sharma", "fuzzy_score": 94.5}'::jsonb, 
        now() - INTERVAL '2 days'
    )
ON CONFLICT (id) DO NOTHING;
