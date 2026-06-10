import { 
  User, Client, Requirement, JobOpening, JobOpeningSkill, 
  Candidate, Application, ScreeningQuestion, InterviewStage, 
  ActivityLog, ChatMessage, JobCandidate
} from "../types";

// Base Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Persistent memory-store for mock fallback
// Serves as a local stateful database to make the UI completely interactive
class MockDatabase {
  users: User[] = [
    {
      id: "usr-1",
      supabase_auth_id: "sb-auth-1",
      email: "recruiter@kozker.ai",
      full_name: "Alex Mercer",
      role: "recruiter",
      is_onboarded: false,
      created_at: new Date().toISOString()
    }
  ];

  clients: Client[] = [
    { id: "cli-1", name: "Google", created_by: "usr-1", created_at: new Date().toISOString(), requirements_count: 2, active_jobs_count: 2 },
    { id: "cli-2", name: "Stripe", created_by: "usr-1", created_at: new Date().toISOString(), requirements_count: 1, active_jobs_count: 1 },
    { id: "cli-3", name: "Vercel", created_by: "usr-1", created_at: new Date().toISOString(), requirements_count: 1, active_jobs_count: 0 }
  ];

  requirements: Requirement[] = [
    {
      id: "req-1",
      client_id: "cli-1",
      client_name: "Google",
      title: "Senior Frontend Engineer (Next.js & React)",
      description: "We are looking for a Senior Frontend Engineer to build high-performance user interfaces for our Next-Gen Cloud Console. Experience with React, Tailwind CSS, Next.js, and TypeScript is mandatory. You will own client-side architecture and optimize page loading speeds.",
      skills: ["React", "Next.js", "Tailwind CSS", "TypeScript", "Web Performance"],
      experience_min: 5,
      experience_max: 10,
      budget_min: 15,
      budget_max: 25,
      seniority: "senior",
      notes: "Focus on engineers who have optimized page performance and have built enterprise SaaS dashboards.",
      num_posts_requested: 2,
      status: "active",
      created_by: "usr-1",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "req-2",
      client_id: "cli-2",
      client_name: "Stripe",
      title: "Staff Systems Engineer (Rust)",
      description: "Looking for a Staff Engineer to join our high-volume core payments ledger team. You will build distributed transactional services in Rust. Deep understanding of ACID, systems engineering, databases, and low-latency networking is required.",
      skills: ["Rust", "Distributed Systems", "SQL", "Systems Programming"],
      experience_min: 8,
      experience_max: 15,
      budget_min: 30,
      budget_max: 45,
      seniority: "lead",
      notes: "Strict ledger requirements. Candidates must have experience scaling low-latency services.",
      num_posts_requested: 1,
      status: "active",
      created_by: "usr-1",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  jobOpenings: JobOpening[] = [
    {
      id: "job-1",
      requirement_id: "req-1",
      client_id: "cli-1",
      client_name: "Google",
      requirement_title: "Senior Frontend Engineer (Next.js & React)",
      post_index: 1,
      title: "Senior UI/Frontend Developer - Cloud Platform",
      description: "Google Cloud Platform (GCP) is seeking a Senior Frontend Developer to design and implement slick, high-density dashboard controls for GCP console. You will lead UI component designs, collaborate with backend specialists, and improve client-side performance. A focus on developer tooling, responsive systems, and design tokens is essential.",
      responsibilities: [
        "Design and build responsive UI dashboards for GCP Cloud Console using React and Next.js.",
        "Implement complex client-side state management systems with Redux or TanStack Query.",
        "Optimize web vital metrics focusing on LCP, FID, and CLS.",
        "Author comprehensive unit and integration test coverage using Jest and Testing Library.",
        "Create shared design system components complying with WCAG Accessibility guidelines."
      ],
      qualifications: [
        "5+ years of software development experience specializing in frontend architectures.",
        "Strong proficiency in modern JavaScript, TypeScript, and functional programming.",
        "Deep familiarity with Tailwind CSS, post-CSS frameworks, and styling optimization.",
        "Proven experience with server-side rendering (SSR) and Incremental Static Regeneration (ISR).",
        "Excellent collaborative skills working alongside product design and API specialists."
      ],
      salary_range: "₹18 - ₹24 LPA",
      keywords: ["React", "Next.js", "TypeScript", "Performance", "GCP", "Tailwind CSS"],
      source: "ai",
      status: "published",
      processing_status: "ready",
      error_message: null,
      created_by: "usr-1",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "job-2",
      requirement_id: "req-1",
      client_id: "cli-1",
      client_name: "Google",
      requirement_title: "Senior Frontend Engineer (Next.js & React)",
      post_index: 2,
      title: "Staff Web Architect - Cloud Console Core",
      description: "Join the GCP Core UX team as a Staff Web Architect. You will shape the micro-frontend architectures governing hundreds of microservices. This role demands exceptional knowledge of module federation, browser caching, web security, and low-level bundler optimizations.",
      responsibilities: [
        "Own the architectural blueprints for the GCP Core Micro-Frontend shell.",
        "Design modules using Webpack module federation and Rspack bundlers.",
        "Develop core guidelines for authentication, analytics, and service worker caching.",
        "Direct performance audits across junior development squads to maintain console responsiveness."
      ],
      qualifications: [
        "8+ years of web engineering experience, with 2+ years leading framework architectures.",
        "Expertise in bundlers (Webpack, Vite, Turbopack) and performance auditing.",
        "Solid foundations in HTTP caching, web worker threads, and browser performance diagnostics."
      ],
      salary_range: "₹24 - ₹32 LPA",
      keywords: ["Module Federation", "Web Performance", "Bundling", "Next.js", "Architect"],
      source: "ai",
      status: "draft",
      processing_status: "ready",
      error_message: null,
      created_by: "usr-1",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      published_at: null
    },
    {
      id: "job-3",
      requirement_id: "req-2",
      client_id: "cli-2",
      client_name: "Stripe",
      requirement_title: "Staff Systems Engineer (Rust)",
      post_index: 1,
      title: "Staff Systems Engineer - Distributed Transaction Ledger",
      description: "Stripe is building high-availability ledger databases. We are looking for an expert Systems Engineer to architect low-latency services in Rust. You will develop software directly handling financial ledger entries, ensuring strict ACID properties and fault tolerance.",
      responsibilities: [
        "Architect and implement Ledger storage engines in safe and concurrent Rust code.",
        "Build distributed consensus layer modules utilizing Raft protocol architectures.",
        "Create custom database index engines optimized for disk storage layout systems.",
        "Integrate automated fuzz testing harnesses for transactional ledger validation."
      ],
      qualifications: [
        "8+ years of systems engineering, with at least 3 years writing Rust in production.",
        "Strong understanding of relational databases, transactions, and ACID isolation levels.",
        "Expertise in network socket communication, TCP protocols, and RPC frameworks."
      ],
      salary_range: "₹35 - ₹50 LPA",
      keywords: ["Rust", "Consensus", "Ledger", "ACID", "Stripe", "Databases"],
      source: "ai",
      status: "confirmed",
      processing_status: "idle",
      error_message: null,
      created_by: "usr-1",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      published_at: null
    }
  ];

  jobOpeningSkills: JobOpeningSkill[] = [
    { id: "sk-1", job_opening_id: "job-1", skill_name: "React", weight: 0.3, skill_order: 1, approved: true, created_at: new Date().toISOString() },
    { id: "sk-2", job_opening_id: "job-1", skill_name: "Next.js", weight: 0.25, skill_order: 2, approved: true, created_at: new Date().toISOString() },
    { id: "sk-3", job_opening_id: "job-1", skill_name: "Tailwind CSS", weight: 0.15, skill_order: 3, approved: true, created_at: new Date().toISOString() },
    { id: "sk-4", job_opening_id: "job-1", skill_name: "TypeScript", weight: 0.15, skill_order: 4, approved: true, created_at: new Date().toISOString() },
    { id: "sk-5", job_opening_id: "job-1", skill_name: "Web Performance", weight: 0.15, skill_order: 5, approved: true, created_at: new Date().toISOString() }
  ];

  candidates: Candidate[] = [
    {
      id: "cand-1",
      full_name: "Rohan Sharma",
      email: "rohan.sharma@example.com",
      phone: "+91 98765 43210",
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Redux", "Node.js"],
      experience_years: 6,
      resume_url: "resumes/cand-1/rohan_sharma_resume.pdf",
      raw_text: "ROHAN SHARMA - Senior UI Developer\n\nExperience:\n- Senior Frontend Engineer at Flipkart (2022 - Present):\n  * Led the migraton of the desktop check-out flow to Next.js App Router, resulting in a 35% improvement in First Contentful Paint.\n  * Mentored 4 junior engineers on React hooks design patterns.\n- UI Developer at Swiggy (2020 - 2022):\n  * Created an internal React component library used across 3 distinct squads.\n\nSkills:\nReact, Next.js, TypeScript, Tailwind CSS, Jest, Webpack, Node.js.",
      source: "pdf",
      uploaded_by: "usr-1",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      linked_jobs: [
        { job_id: "job-1", job_title: "Senior UI/Frontend Developer - Cloud Platform", fuzzy_score: 94.5, stage: "technical", status: "in_progress" }
      ]
    },
    {
      id: "cand-2",
      full_name: "Priya Patel",
      email: "priya.patel@example.com",
      phone: "+91 91234 56789",
      skills: ["React", "JavaScript", "HTML", "CSS", "Webpack", "Vite", "GraphQL"],
      experience_years: 5,
      resume_url: "resumes/cand-2/priya_patel_cv.docx",
      raw_text: "PRIYA PATEL - Frontend Developer\n\n5 Years experience building modern web pages.\nWorked at TCS and Infosys.\nDeeply interested in core React rendering loops, custom hook caching, and CSS grid layouts.\nProficient with JavaScript, React, Webpack, CSS3.",
      source: "docx",
      uploaded_by: "usr-1",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      linked_jobs: [
        { job_id: "job-1", job_title: "Senior UI/Frontend Developer - Cloud Platform", fuzzy_score: 72.0, stage: "screening", status: "passed" }
      ]
    },
    {
      id: "cand-3",
      full_name: "Siddharth Verma",
      email: "sid.verma@example.com",
      phone: "+91 99887 76655",
      skills: ["Rust", "Distributed Systems", "PostgreSQL", "C++", "Docker"],
      experience_years: 9,
      resume_url: "resumes/cand-3/sid_verma_ledger.pdf",
      raw_text: "SIDDHARTH VERMA - Systems Engineer\n\n9 years writing robust backends.\nExpertise: Rust, C++, Linux kernel profiling, Distributed transactions, consensus loops.\nLedger team lead at Razorpay (2021 - Present). Built transaction Ledger processing 15,000 queries per second.",
      source: "pdf",
      uploaded_by: "usr-1",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      linked_jobs: []
    }
  ];

  applications: Application[] = [
    {
      id: "app-1",
      candidate_id: "cand-1",
      job_opening_id: "job-1",
      candidate_cv: "resumes/cand-1/rohan_sharma_resume.pdf",
      fuzzy_score: 94.5,
      match_score: 95,
      match_reason: "Exceptional background in React, Next.js, and TypeScript. Experience migrating critical checkout systems matching top skills. High performance awareness.",
      strengths: ["Strong Next.js expertise", "Mentorship experience", "Performance optimization success"],
      skill_gaps: ["No direct GCP console experience"],
      screening_status: "accepted",
      stage: "technical",
      stage_status: "in_progress",
      stage_notes: "Technical interview scheduled for Thursday. Impressive resume.",
      priority: 1,
      reviewed_by: "usr-1",
      reviewed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    },
    {
      id: "app-2",
      candidate_id: "cand-2",
      job_opening_id: "job-1",
      candidate_cv: "resumes/cand-2/priya_patel_cv.docx",
      fuzzy_score: 72.0,
      match_score: 72,
      match_reason: "Strong HTML/CSS/React roots. Missing TypeScript and Next.js experience, which are core framework dependencies for this role.",
      strengths: ["Clean CSS skills", "Core React rendering competency", "Detail-oriented"],
      skill_gaps: ["No Next.js experience", "No TypeScript experience"],
      screening_status: "accepted",
      stage: "screening",
      stage_status: "passed",
      stage_notes: "Initial recruiter screen cleared. Moving to tech evaluation.",
      priority: 0,
      reviewed_by: "usr-1",
      reviewed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }
  ];

  jobCandidates: JobCandidate[] = [
    {
      id: "jc-1",
      job_opening_id: "job-1",
      application_id: "app-1",
      fuzzy_score: 94.5,
      rank_order: 1,
      created_at: new Date().toISOString(),
      candidate_id: "cand-1",
      candidate_name: "Rohan Sharma",
      experience_years: 6,
      skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
      strengths: ["Strong Next.js expertise", "Performance optimization success"],
      skill_gaps: ["No direct GCP console experience"],
      priority: 1,
      stage: "technical",
      stage_status: "in_progress"
    },
    {
      id: "jc-2",
      job_opening_id: "job-1",
      application_id: "app-2",
      fuzzy_score: 72.0,
      rank_order: 2,
      created_at: new Date().toISOString(),
      candidate_id: "cand-2",
      candidate_name: "Priya Patel",
      experience_years: 5,
      skills: ["React", "JavaScript", "HTML/CSS"],
      strengths: ["Core React rendering competency"],
      skill_gaps: ["No Next.js experience", "No TypeScript experience"],
      priority: 0,
      stage: "screening",
      stage_status: "passed"
    }
  ];

  screeningQuestions: ScreeningQuestion[] = [
    {
      id: "q-1",
      application_id: "app-1",
      requirement_id: "req-1",
      job_opening_id: "job-1",
      question: "In your Flipkart experience, how did you manage the checkout state during the Next.js App Router transition? Explain your strategy for caching server component inputs.",
      difficulty: "hard",
      question_order: 1,
      modified: false,
      modified_by: null,
      modified_at: null,
      created_at: new Date().toISOString()
    },
    {
      id: "q-2",
      application_id: "app-1",
      requirement_id: "req-1",
      job_opening_id: "job-1",
      question: "What performance metrics did you focus on when improving Flipkart's page load speed, and what tools did you use to measure LCP?",
      difficulty: "medium",
      question_order: 2,
      modified: false,
      modified_by: null,
      modified_at: null,
      created_at: new Date().toISOString()
    },
    {
      id: "q-3",
      application_id: "app-1",
      requirement_id: "req-1",
      job_opening_id: "job-1",
      question: "Explain the differences between Server Actions and API Route handlers in Next.js 14.",
      difficulty: "easy",
      question_order: 3,
      modified: false,
      modified_by: null,
      modified_at: null,
      created_at: new Date().toISOString()
    }
  ];

  interviewStages: InterviewStage[] = [
    {
      id: "stg-1",
      application_id: "app-1",
      stage_name: "screening",
      stage_order: 1,
      status: "completed",
      outcome: "passed",
      scheduled_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
      notes: "Polite candidate, fits salary parameters.",
      updated_by: "usr-1",
      created_at: new Date().toISOString()
    },
    {
      id: "stg-2",
      application_id: "app-1",
      stage_name: "technical",
      stage_order: 2,
      status: "scheduled",
      outcome: "pending",
      scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      completed_at: null,
      notes: "Assigned interviewer: Senior Staff GCP console Lead.",
      updated_by: "usr-1",
      created_at: new Date().toISOString()
    }
  ];

  activityLogs: ActivityLog[] = [
    {
      id: "act-1",
      actor_id: "usr-1",
      actor_name: "Alex Mercer",
      action: "job_created",
      entity_type: "job_openings",
      entity_id: "job-1",
      metadata: { job_title: "Senior UI/Frontend Developer - Cloud Platform", requirement_title: "Senior Frontend Engineer" },
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "act-2",
      actor_id: "usr-1",
      actor_name: "Alex Mercer",
      action: "candidate_uploaded",
      entity_type: "candidates",
      entity_id: "cand-1",
      metadata: { candidate_name: "Rohan Sharma", job_title: "Senior UI/Frontend Developer - Cloud Platform" },
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "act-3",
      actor_id: "usr-1",
      actor_name: "Alex Mercer",
      action: "candidate_ranked",
      entity_type: "applications",
      entity_id: "app-1",
      metadata: { candidate_name: "Rohan Sharma", fuzzy_score: 94.5 },
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

const mockDb = new MockDatabase();

// API fetch wrapper with defensive logging and mock fallbacks
export const apiRequest = async <T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  data?: any
): Promise<T> => {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Attempt real backend call
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (res.ok) {
      return await res.json() as T;
    }
    
    if (res.status === 418 || res.status === 404 || res.status === 500 || res.status === 503) {
      console.warn(`API returned status ${res.status}. Falling back to persisted mock database.`);
    }
  } catch (err) {
    console.warn("Backend server not reached. Serving data from static mock storage fallback.", err);
  }

  // Persisted Mock Database Handlers
  return handleMockRequest<T>(method, path, data);
};

// Route matching patterns for the mock layer
const handleMockRequest = <T>(
  method: string,
  path: string,
  data: any
): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Artificial Latency
    setTimeout(() => {
      try {
        // AUTH
        if (path === "/auth/me") {
          return resolve(mockDb.users[0] as unknown as T);
        }
        if (path === "/auth/onboarded" && method === "PATCH") {
          mockDb.users[0].is_onboarded = true;
          return resolve(mockDb.users[0] as unknown as T);
        }
        if (path === "/auth/login" || path === "/auth/signup") {
          return resolve({
            user: mockDb.users[0],
            session: { access_token: "mock-jwt-token", refresh_token: "mock-refresh-token" }
          } as unknown as T);
        }

        // CLIENTS
        if (path === "/clients") {
          if (method === "GET") {
            return resolve(mockDb.clients as unknown as T);
          }
          if (method === "POST") {
            const newClient: Client = {
              id: `cli-${Date.now()}`,
              name: data.name,
              created_by: "usr-1",
              created_at: new Date().toISOString(),
              requirements_count: 0,
              active_jobs_count: 0
            };
            mockDb.clients.push(newClient);
            // log activity
            mockDb.activityLogs.unshift({
              id: `act-${Date.now()}`,
              actor_id: "usr-1",
              actor_name: "Alex Mercer",
              action: "client_created",
              entity_type: "clients",
              entity_id: newClient.id,
              metadata: { client_name: newClient.name },
              created_at: new Date().toISOString()
            });
            return resolve(newClient as unknown as T);
          }
        }
        if (path.startsWith("/clients/") && method === "DELETE") {
          const id = path.split("/")[2];
          mockDb.clients = mockDb.clients.filter(c => c.id !== id);
          return resolve({ success: true } as unknown as T);
        }

        // REQUIREMENTS
        if (path === "/requirements") {
          if (method === "GET") {
            return resolve(mockDb.requirements as unknown as T);
          }
          if (method === "POST") {
            const client = mockDb.clients.find(c => c.id === data.client_id) || { name: data.client_id };
            const newReq: Requirement = {
              id: `req-${Date.now()}`,
              client_id: data.client_id,
              client_name: client.name,
              title: data.title,
              description: data.description,
              skills: data.skills || [],
              experience_min: data.experience_min,
              experience_max: data.experience_max,
              budget_min: data.budget_min,
              budget_max: data.budget_max,
              seniority: data.seniority,
              notes: data.notes,
              num_posts_requested: data.num_posts_requested || 1,
              status: "active",
              created_by: "usr-1",
              created_at: new Date().toISOString()
            };
            mockDb.requirements.push(newReq);
            
            // Auto trigger AI job openings drafts generation
            for (let i = 1; i <= newReq.num_posts_requested; i++) {
              const draftJob: JobOpening = {
                id: `job-${Date.now()}-${i}`,
                requirement_id: newReq.id,
                client_id: newReq.client_id,
                client_name: newReq.client_name,
                requirement_title: newReq.title,
                post_index: i,
                title: `${newReq.title} - Option ${i}`,
                description: `AI-Generated draft option ${i} based on: ${newReq.description}`,
                responsibilities: [
                  "Own key workflow modules and align layout structures.",
                  "Collaborate with internal design squads to build performant widgets.",
                  "Deliver clean, high-performance TypeScript components."
                ],
                qualifications: [
                  "Relevant developer background in this engineering discipline.",
                  "Competence with our core skill keywords."
                ],
                salary_range: `₹${(newReq.budget_min || 10)} - ${(newReq.budget_max || 20)} LPA`,
                keywords: newReq.skills,
                source: "ai",
                status: "draft",
                processing_status: "generating",
                error_message: null,
                created_by: "usr-1",
                created_at: new Date().toISOString(),
                published_at: null
              };
              
              mockDb.jobOpenings.push(draftJob);
              
              // Simulate async generation status update to "ready"
              setTimeout(() => {
                const liveJob = mockDb.jobOpenings.find(j => j.id === draftJob.id);
                if (liveJob) {
                  liveJob.processing_status = "ready";
                  // Log to activity log
                  mockDb.activityLogs.unshift({
                    id: `act-${Date.now()}`,
                    actor_id: "usr-1",
                    actor_name: "Alex Mercer",
                    action: "job_draft_ready",
                    entity_type: "job_openings",
                    entity_id: liveJob.id,
                    metadata: { job_title: liveJob.title },
                    created_at: new Date().toISOString()
                  });
                }
              }, 4000);
            }
            
            // Update client counters
            if (newReq.client_id) {
              const cIndex = mockDb.clients.findIndex(c => c.id === newReq.client_id);
              if (cIndex !== -1) {
                mockDb.clients[cIndex].requirements_count = (mockDb.clients[cIndex].requirements_count || 0) + 1;
                mockDb.clients[cIndex].active_jobs_count = (mockDb.clients[cIndex].active_jobs_count || 0) + newReq.num_posts_requested;
              }
            }

            // log activity
            mockDb.activityLogs.unshift({
              id: `act-${Date.now()}`,
              actor_id: "usr-1",
              actor_name: "Alex Mercer",
              action: "requirement_created",
              entity_type: "requirements",
              entity_id: newReq.id,
              metadata: { req_title: newReq.title },
              created_at: new Date().toISOString()
            });

            return resolve(newReq as unknown as T);
          }
        }
        if (path.startsWith("/requirements/") && method === "GET") {
          const id = path.split("/")[2];
          const req = mockDb.requirements.find(r => r.id === id);
          if (!req) return reject(new Error("Not found"));
          // Attach linked openings
          const openings = mockDb.jobOpenings.filter(o => o.requirement_id === id);
          return resolve({ ...req, job_openings: openings } as unknown as T);
        }

        // JOBS
        if (path === "/jobs") {
          if (method === "GET") {
            // Attach computed fields
            const list = mockDb.jobOpenings.map(j => {
              const appList = mockDb.applications.filter(a => a.job_opening_id === j.id);
              const top = appList.reduce((max, a) => (a.fuzzy_score || 0) > max ? (a.fuzzy_score || 0) : max, 0);
              return {
                ...j,
                candidate_count: appList.length,
                top_score: top,
                last_activity: new Date(j.created_at).toLocaleDateString()
              };
            });
            return resolve(list as unknown as T);
          }
          if (method === "POST") {
            const newJob: JobOpening = {
              id: `job-${Date.now()}`,
              requirement_id: data.requirement_id || "req-1",
              client_id: data.client_id || "cli-1",
              client_name: "Google",
              requirement_title: "Manual Job Insertion",
              post_index: 99,
              title: data.title || "Untitled Role",
              description: data.description || "",
              responsibilities: data.responsibilities || [],
              qualifications: data.qualifications || [],
              salary_range: data.salary_range || "",
              keywords: data.keywords || [],
              source: "manual",
              status: "draft",
              processing_status: "ready",
              error_message: null,
              created_by: "usr-1",
              created_at: new Date().toISOString(),
              published_at: null
            };
            mockDb.jobOpenings.push(newJob);
            // activity
            mockDb.activityLogs.unshift({
              id: `act-${Date.now()}`,
              actor_id: "usr-1",
              actor_name: "Alex Mercer",
              action: "job_created_manual",
              entity_type: "job_openings",
              entity_id: newJob.id,
              metadata: { job_title: newJob.title },
              created_at: new Date().toISOString()
            });
            return resolve(newJob as unknown as T);
          }
        }
        if (path.startsWith("/jobs/") && path.endsWith("/confirm") && method === "POST") {
          const id = path.split("/")[2];
          const job = mockDb.jobOpenings.find(j => j.id === id);
          if (!job) return reject(new Error("Job not found"));
          job.status = "confirmed";
          
          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: "usr-1",
            actor_name: "Alex Mercer",
            action: "job_confirmed",
            entity_type: "job_openings",
            entity_id: job.id,
            metadata: { job_title: job.title },
            created_at: new Date().toISOString()
          });
          return resolve(job as unknown as T);
        }
        if (path.startsWith("/jobs/") && path.endsWith("/scan-and-publish") && method === "POST") {
          const id = path.split("/")[2];
          const job = mockDb.jobOpenings.find(j => j.id === id);
          if (!job) return reject(new Error("Job not found"));
          
          job.processing_status = "skill_approval";
          
          // Generate 5 default skills for this job
          const defaultSkills = (job.keywords && job.keywords.length >= 3)
            ? job.keywords.slice(0, 5)
            : ["React", "Next.js", "TypeScript", "Tailwind CSS", "Systems Design"];
          
          const weights = [0.30, 0.25, 0.15, 0.15, 0.15];
          
          // Clear previous skills
          mockDb.jobOpeningSkills = mockDb.jobOpeningSkills.filter(s => s.job_opening_id !== id);
          
          defaultSkills.forEach((sk, idx) => {
            mockDb.jobOpeningSkills.push({
              id: `sk-${Date.now()}-${idx}`,
              job_opening_id: id,
              skill_name: sk,
              weight: weights[idx] || 0.15,
              skill_order: idx + 1,
              approved: false,
              created_at: new Date().toISOString()
            });
          });

          return resolve(job as unknown as T);
        }
        if (path.startsWith("/jobs/") && path.endsWith("/skills") && method === "GET") {
          const id = path.split("/")[2];
          const skills = mockDb.jobOpeningSkills.filter(s => s.job_opening_id === id);
          return resolve(skills as unknown as T);
        }
        if (path.startsWith("/jobs/") && path.endsWith("/skills") && method === "PUT") {
          const id = path.split("/")[2];
          const incomingSkills = data.skills as JobOpeningSkill[];
          
          // Save and mark approved
          mockDb.jobOpeningSkills = mockDb.jobOpeningSkills.filter(s => s.job_opening_id !== id);
          incomingSkills.forEach(s => {
            mockDb.jobOpeningSkills.push({
              ...s,
              approved: true
            });
          });

          // Trigger async candidate scanning
          const job = mockDb.jobOpenings.find(j => j.id === id);
          if (job) {
            job.processing_status = "matching";
            
            setTimeout(() => {
              // Populate Job Candidates by mapping and matching each candidate
              mockDb.jobCandidates = mockDb.jobCandidates.filter(jc => jc.job_opening_id !== id);
              
              // Score all candidates in the candidate list
              const jobSkills = mockDb.jobOpeningSkills.filter(s => s.job_opening_id === id);
              
              mockDb.candidates.forEach((cand, cIdx) => {
                // Fuzzy matching logic simulation
                let score = 50; // base score
                const matches = cand.skills.filter(s => 
                  jobSkills.some(js => js.skill_name.toLowerCase() === s.toLowerCase())
                );
                score += matches.length * 10;
                if (cand.experience_years && cand.experience_years >= 5) score += 10;
                if (score > 100) score = 100;

                // Check if application exists, else create
                let app = mockDb.applications.find(a => a.candidate_id === cand.id && a.job_opening_id === id);
                if (!app) {
                  app = {
                    id: `app-gen-${Date.now()}-${cIdx}`,
                    candidate_id: cand.id,
                    job_opening_id: id,
                    candidate_cv: cand.resume_url,
                    fuzzy_score: score,
                    match_score: score,
                    match_reason: `Calculated fuzzy score matching resume skills ${cand.skills.join(", ")} with approved skills.`,
                    strengths: matches.slice(0, 3),
                    skill_gaps: jobSkills.filter(js => !cand.skills.includes(js.skill_name)).map(js => js.skill_name),
                    screening_status: "pending",
                    stage: "screening",
                    stage_status: "pending",
                    stage_notes: null,
                    priority: 0,
                    reviewed_by: null,
                    reviewed_at: null,
                    created_at: new Date().toISOString()
                  };
                  mockDb.applications.push(app);
                } else {
                  app.fuzzy_score = score;
                  app.match_score = score;
                  app.strengths = matches.slice(0, 3);
                  app.skill_gaps = jobSkills.filter(js => !cand.skills.includes(js.skill_name)).map(js => js.skill_name);
                }

                // Add to Job Candidates
                mockDb.jobCandidates.push({
                  id: `jc-${Date.now()}-${cIdx}`,
                  job_opening_id: id,
                  application_id: app.id,
                  fuzzy_score: score,
                  rank_order: cIdx + 1,
                  created_at: new Date().toISOString(),
                  candidate_id: cand.id,
                  candidate_name: cand.full_name,
                  experience_years: cand.experience_years || 0,
                  skills: cand.skills,
                  strengths: app.strengths,
                  skill_gaps: app.skill_gaps,
                  stage: app.stage,
                  stage_status: app.stage_status
                });
              });

              // Sort by score
              const relevantCandidates = mockDb.jobCandidates.filter(jc => jc.job_opening_id === id);
              relevantCandidates.sort((a,b) => b.fuzzy_score - a.fuzzy_score);
              relevantCandidates.forEach((jc, order) => {
                jc.rank_order = order + 1;
              });

              job.processing_status = "ready";
              job.status = "published";
              job.published_at = new Date().toISOString();

              // Log audit
              mockDb.activityLogs.unshift({
                id: `act-${Date.now()}`,
                actor_id: "usr-1",
                actor_name: "Alex Mercer",
                action: "candidates_matched",
                entity_type: "job_openings",
                entity_id: id,
                metadata: { job_title: job.title, count: relevantCandidates.length },
                created_at: new Date().toISOString()
              });
            }, 3000);
          }
          return resolve({ success: true } as unknown as T);
        }
        if (path.startsWith("/jobs/") && path.endsWith("/candidates") && method === "GET") {
          const id = path.split("/")[2];
          const candList = mockDb.jobCandidates.filter(jc => jc.job_opening_id === id);
          return resolve(candList as unknown as T);
        }
        if (path.startsWith("/jobs/") && method === "GET") {
          const id = path.split("/")[2];
          const job = mockDb.jobOpenings.find(j => j.id === id);
          if (!job) return reject(new Error("Job not found"));
          return resolve(job as unknown as T);
        }
        if (path.startsWith("/jobs/") && method === "PATCH") {
          const id = path.split("/")[2];
          const jobIndex = mockDb.jobOpenings.findIndex(j => j.id === id);
          if (jobIndex === -1) return reject(new Error("Job not found"));
          mockDb.jobOpenings[jobIndex] = {
            ...mockDb.jobOpenings[jobIndex],
            ...data
          };
          return resolve(mockDb.jobOpenings[jobIndex] as unknown as T);
        }
        if (path.startsWith("/jobs/") && path.endsWith("/regenerate") && method === "POST") {
          const id = path.split("/")[2];
          const job = mockDb.jobOpenings.find(j => j.id === id);
          if (!job) return reject(new Error("Job not found"));
          
          job.processing_status = "generating";
          
          setTimeout(() => {
            job.title = `${job.title} (Regenerated)`;
            job.description = `${job.description}\n\n[Regenerated with instruction: "${data.instruction}"]`;
            job.processing_status = "ready";
          }, 3000);
          return resolve(job as unknown as T);
        }

        // CANDIDATES
        if (path === "/candidates" && method === "GET") {
          return resolve(mockDb.candidates as unknown as T);
        }
        if (path.startsWith("/candidates/") && path.endsWith("/resume-url") && method === "GET") {
          return resolve({ url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" } as unknown as T);
        }
        if (path.startsWith("/candidates/") && method === "GET") {
          const id = path.split("/")[2];
          const cand = mockDb.candidates.find(c => c.id === id);
          if (!cand) return reject(new Error("Not found"));
          return resolve(cand as unknown as T);
        }
        if (path === "/candidates" && method === "POST") {
          // Check duplicate email
          const exists = mockDb.candidates.find(c => c.email.toLowerCase() === data.email.toLowerCase());
          if (exists) {
            return reject(new Error("Email already exists"));
          }
          const newCand: Candidate = {
            id: `cand-${Date.now()}`,
            full_name: data.full_name,
            email: data.email,
            phone: data.phone || "",
            skills: data.skills || [],
            experience_years: Number(data.experience_years) || 0,
            resume_url: null,
            raw_text: data.raw_text || `Manual candidate profile: ${data.full_name}`,
            source: "manual",
            uploaded_by: "usr-1",
            created_at: new Date().toISOString(),
            linked_jobs: []
          };
          mockDb.candidates.push(newCand);
          // Activity
          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: "usr-1",
            actor_name: "Alex Mercer",
            action: "candidate_created_manual",
            entity_type: "candidates",
            entity_id: newCand.id,
            metadata: { candidate_name: newCand.full_name },
            created_at: new Date().toISOString()
          });
          return resolve(newCand as unknown as T);
        }
        if ((path === "/candidates/upload/csv" || path.startsWith("/jobs/")) && method === "POST") {
          // Bulk uploader CSV parser mockup
          // Returns summary
          const jobId = path.includes("/jobs/") ? path.split("/")[3] : undefined;
          const items = data.items || [];
          let inserted = 0;
          let skipped = 0;
          
          items.forEach((item: any, idx: number) => {
            if (!item.email || !item.full_name) return;
            const exists = mockDb.candidates.find(c => c.email.toLowerCase() === item.email.toLowerCase());
            if (exists) {
              skipped++;
              if (jobId && !mockDb.applications.some(a => a.candidate_id === exists.id && a.job_opening_id === jobId)) {
                // Link existing candidate to new job
                const app = {
                  id: `app-csv-${Date.now()}-${idx}`,
                  candidate_id: exists.id,
                  job_opening_id: jobId,
                  candidate_cv: exists.resume_url,
                  fuzzy_score: 65,
                  match_score: 65,
                  match_reason: "Direct csv upload link. System matched base skills.",
                  strengths: ["Matching profile"],
                  skill_gaps: [],
                  screening_status: "pending" as const,
                  stage: "screening" as const,
                  stage_status: "pending" as const,
                  stage_notes: null,
                  priority: 0,
                  reviewed_by: null,
                  reviewed_at: null,
                  created_at: new Date().toISOString()
                };
                mockDb.applications.push(app);
              }
            } else {
              inserted++;
              const newCand: Candidate = {
                id: `cand-${Date.now()}-${idx}`,
                full_name: item.full_name,
                email: item.email,
                phone: item.phone || null,
                skills: item.skills ? item.skills.split(",").map((s: string) => s.trim()) : [],
                experience_years: Number(item.experience_years) || 0,
                resume_url: null,
                raw_text: `Parsed from CSV: ${item.full_name}`,
                source: "csv",
                uploaded_by: "usr-1",
                created_at: new Date().toISOString()
              };
              mockDb.candidates.push(newCand);
              
              if (jobId) {
                const app = {
                  id: `app-csv-${Date.now()}-${idx}`,
                  candidate_id: newCand.id,
                  job_opening_id: jobId,
                  candidate_cv: null,
                  fuzzy_score: 75,
                  match_score: 75,
                  match_reason: "Parsed CSV profile. Matched core qualifications.",
                  strengths: ["Valid experience criteria"],
                  skill_gaps: [],
                  screening_status: "pending" as const,
                  stage: "screening" as const,
                  stage_status: "pending" as const,
                  stage_notes: null,
                  priority: 0,
                  reviewed_by: null,
                  reviewed_at: null,
                  created_at: new Date().toISOString()
                };
                mockDb.applications.push(app);
              }
            }
          });

          return resolve({ inserted, skipped, errors: [] } as unknown as T);
        }

        // APPLICATIONS
        if (path.startsWith("/applications/") && path.endsWith("/accept") && method === "PATCH") {
          const id = path.split("/")[2];
          const app = mockDb.applications.find(a => a.id === id);
          if (!app) return reject(new Error("Application not found"));
          app.screening_status = "accepted";
          
          // Trigger screening question generation mock
          setTimeout(() => {
            const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
            const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
            
            mockDb.screeningQuestions = mockDb.screeningQuestions.filter(q => q.application_id !== id);
            const generated = [
              {
                id: `q-g1-${Date.now()}`,
                application_id: id,
                requirement_id: app.job_opening_id ? job?.requirement_id || null : null,
                job_opening_id: app.job_opening_id,
                question: `Based on your resume, can you detail a project where you solved a ${cand?.skills[0] || "React"} challenge?`,
                difficulty: "easy" as const,
                question_order: 1,
                modified: false, modified_by: null, modified_at: null, created_at: new Date().toISOString()
              },
              {
                id: `q-g2-${Date.now()}`,
                application_id: id,
                requirement_id: app.job_opening_id ? job?.requirement_id || null : null,
                job_opening_id: app.job_opening_id,
                question: `Explain how you would handle low latency state synchronization in micro-frontends.`,
                difficulty: "medium" as const,
                question_order: 2,
                modified: false, modified_by: null, modified_at: null, created_at: new Date().toISOString()
              },
              {
                id: `q-g3-${Date.now()}`,
                application_id: id,
                requirement_id: app.job_opening_id ? job?.requirement_id || null : null,
                job_opening_id: app.job_opening_id,
                question: `Describe your technical strategy for monitoring Core Web Vitals inside enterprise cloud applications.`,
                difficulty: "hard" as const,
                question_order: 3,
                modified: false, modified_by: null, modified_at: null, created_at: new Date().toISOString()
              }
            ];
            mockDb.screeningQuestions.push(...generated);
          }, 2000);

          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: "usr-1",
            actor_name: "Alex Mercer",
            action: "candidate_accepted",
            entity_type: "applications",
            entity_id: app.id,
            metadata: { application_id: app.id },
            created_at: new Date().toISOString()
          });

          return resolve(app as unknown as T);
        }
        if (path.startsWith("/applications/") && path.endsWith("/reject") && method === "PATCH") {
          const id = path.split("/")[2];
          const app = mockDb.applications.find(a => a.id === id);
          if (!app) return reject(new Error("Application not found"));
          app.screening_status = "rejected";
          app.stage = "rejected";
          app.stage_status = "failed";
          
          if (data && data.reason) {
            app.stage_notes = data.reason;
          }

          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: "usr-1",
            actor_name: "Alex Mercer",
            action: "candidate_rejected",
            entity_type: "applications",
            entity_id: app.id,
            metadata: { application_id: app.id, reason: data?.reason },
            created_at: new Date().toISOString()
          });

          return resolve(app as unknown as T);
        }
        if (path.startsWith("/applications/") && path.endsWith("/stage") && method === "PATCH") {
          const id = path.split("/")[2];
          const app = mockDb.applications.find(a => a.id === id);
          if (!app) return reject(new Error("Application not found"));
          
          app.stage = data.stage;
          app.stage_status = data.stage_status;
          if (data.notes) app.stage_notes = data.notes;

          // If failed, enforce notes (rejection reason)
          if (data.stage_status === "failed") {
            app.stage = "rejected";
          }

          // Update stage in job candidate cache
          const jc = mockDb.jobCandidates.find(j => j.application_id === id);
          if (jc) {
            jc.stage = app.stage;
            jc.stage_status = app.stage_status;
          }

          // Add to stages tracking list
          const nextOrder = mockDb.interviewStages.filter(s => s.application_id === id).length + 1;
          mockDb.interviewStages.push({
            id: `stg-${Date.now()}`,
            application_id: id,
            stage_name: data.stage,
            stage_order: nextOrder,
            status: "completed",
            outcome: data.stage_status === "passed" ? "passed" : data.stage_status === "failed" ? "failed" : "pending",
            scheduled_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            notes: data.notes || "Stage state updated.",
            updated_by: "usr-1",
            created_at: new Date().toISOString()
          });

          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: "usr-1",
            actor_name: "Alex Mercer",
            action: "stage_updated",
            entity_type: "applications",
            entity_id: id,
            metadata: { stage: data.stage, status: data.stage_status },
            created_at: new Date().toISOString()
          });

          return resolve(app as unknown as T);
        }
        if (path.startsWith("/applications/") && path.endsWith("/questions") && method === "GET") {
          const id = path.split("/")[2];
          const qs = mockDb.screeningQuestions.filter(q => q.application_id === id);
          return resolve(qs as unknown as T);
        }
        if (path.startsWith("/applications/") && path.endsWith("/stages") && method === "GET") {
          const id = path.split("/")[2];
          const stages = mockDb.interviewStages.filter(s => s.application_id === id);
          return resolve(stages as unknown as T);
        }
        if (path.startsWith("/applications/") && method === "GET") {
          const id = path.split("/")[2];
          const app = mockDb.applications.find(a => a.id === id);
          if (!app) return reject(new Error("Application not found"));
          
          // Hydrate name & email
          const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
          return resolve({
            ...app,
            candidate_name: cand?.full_name,
            candidate_email: cand?.email,
            candidate_experience: cand?.experience_years,
            candidate_skills: cand?.skills
          } as unknown as T);
        }

        // QUESTIONS MANUAL EDIT
        if (path.startsWith("/questions/") && method === "PATCH") {
          const id = path.split("/")[2];
          const q = mockDb.screeningQuestions.find(sq => sq.id === id);
          if (!q) return reject(new Error("Question not found"));
          q.question = data.question;
          q.modified = true;
          q.modified_at = new Date().toISOString();
          q.modified_by = "usr-1";
          return resolve(q as unknown as T);
        }
        if (path.startsWith("/questions/") && path.endsWith("/ai-edit") && method === "POST") {
          const id = path.split("/")[2];
          const q = mockDb.screeningQuestions.find(sq => sq.id === id);
          if (!q) return reject(new Error("Question not found"));
          
          // Simulate Claude editing the question based on instructions
          q.question = `${q.question} (Refined with: "${data.instruction}")`;
          q.modified = true;
          q.modified_at = new Date().toISOString();
          q.modified_by = "usr-1";
          return resolve(q as unknown as T);
        }

        // CHATBOT MESSAGE
        if (path === "/chatbot/message" && method === "POST") {
          const { message, current_page } = data;
          let reply = "";
          
          if (message.toLowerCase().includes("job") || message.toLowerCase().includes("openings")) {
            reply = `Currently, you have ${mockDb.jobOpenings.filter(j => j.status === 'published').length} active job openings published, and ${mockDb.jobOpenings.filter(j => j.status === 'draft').length} drafts awaiting review. You are looking for skills like React, Next.js, and Distributed Systems.`;
          } else if (message.toLowerCase().includes("candidate") || message.toLowerCase().includes("pool")) {
            reply = `The Candidate Pool currently has ${mockDb.candidates.length} unique profiles uploaded. Rohan Sharma has the highest match score of 94.5% for the Senior UI Developer position.`;
          } else if (message.toLowerCase().includes("stage") || message.toLowerCase().includes("interview")) {
            reply = `There is 1 candidate in the Technical interview stage (Rohan Sharma) and 1 candidate who passed the initial Recruiter Screen (Priya Patel). Ready to coordinate their next stages.`;
          } else {
            reply = `I am your Kozker Recruiter AI assistant. You are currently viewing the ${current_page || "Dashboard"}. I can help you search candidate skills, check candidate ranks, and track recruitment stage outcomes. Note: I am read-only. Let me know what you'd like to check!`;
          }

          return resolve({
            role: "assistant",
            content: reply
          } as unknown as T);
        }

        // ACTIVITY LOG
        if (path === "/activity_log" && method === "GET") {
          return resolve(mockDb.activityLogs as unknown as T);
        }

        // Generic 404
        return reject(new Error(`Endpoint mock not found: ${method} ${path}`));
      } catch (err) {
        return reject(err);
      }
    }, 400);
  });
};
