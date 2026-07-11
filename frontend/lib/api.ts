import { 
  User, Client, Requirement, JobOpening, JobOpeningSkill, 
  Candidate, Application, ScreeningQuestion, InterviewStage, 
  ActivityLog, ChatMessage, JobCandidate, Notification, CandidateQuery
} from "../types";
import { createClient } from "./supabase/client";

// Base Configuration - Dynamic Browser/Server Resolving
const isBrowser = typeof window !== "undefined";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  || (isBrowser ? `${window.location.origin}/api/v1` : "http://backend:8000/api/v1");

// Persistent memory-store for mock fallback
// Serves as a local stateful database to make the UI completely interactive
class MockDatabase {
  notifications: Notification[] = [
    {
      id: "not-1",
      recruiter_id: "usr-1",
      title: "System Live",
      message: "Welcome to Kozker Recruiter Operations Command Center! Dynamic pipeline monitoring and candidate matching agent is active.",
      type: "upload",
      is_read: false,
      metadata: {},
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ];
  users: User[] = [
    {
      id: "usr-1",
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
      status: "ready",
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
      status: "ready",
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
      education: "Bachelor's in Computer Science",
      working_or_not: true,
      academic_details: "Bachelor of Technology in Computer Science and Engineering, IIT Delhi (2016-2020) - CGPA: 8.9/10. Key coursework: Data Structures, Advanced Algorithms, Web Engineering.",
      achievements: "Winner of Smart India Hackathon (2019) for constructing an optimized logistics tracking system. Published a research paper on responsive UI rendering algorithms.",
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
      education: "Bachelor's in Information Technology",
      working_or_not: false,
      academic_details: "Bachelor of Science in Information Technology, Mumbai University (2017-2020) - GPA: 3.8/4.0. Completed Advanced Frontend Specialization Certification.",
      achievements: "Recognized as 'Best Performer of the Quarter' twice at TCS for UI modularization projects. Open-source contributor to React-based routing utilities.",
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
      education: "Master's in Software Engineering",
      working_or_not: true,
      academic_details: "Master of Science in Software Systems, BITS Pilani (2013-2015) - CGPA: 9.2/10. Thesis focused on Distributed Transaction Isolation Levels.",
      achievements: "Designed Swiggy's high-concurrency ledger backend scaling to 15,000 QPS. Optimized transaction consensus loops, saving 20% in infrastructure cloud costs.",
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
      id: "app-3",
      candidate_id: "cand-1",
      job_opening_id: "job-2",
      candidate_cv: "resumes/cand-1/rohan_sharma_resume.pdf",
      fuzzy_score: 88.0,
      match_score: 88,
      match_reason: "Very strong technical architectural alignment. Handled Flipkart check-out transition matching console microservices goals. Needs checking on module federation.",
      strengths: ["Check-out migraton leader", "Strong framework foundations"],
      skill_gaps: ["No explicit Module Federation experience listed"],
      screening_status: "pending",
      stage: "screening",
      stage_status: "in_progress",
      stage_notes: "Under consideration for core micro-frontend architect options.",
      priority: 0,
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

  candidateQueries: CandidateQuery[] = [
    {
      id: "q-mock-1",
      job_id: "job-1",
      candidate_email: "eager.applicant@example.com",
      query_text: "What is the expected salary range? Is it remote?",
      ai_response: "The salary range for the Senior UI/Frontend Developer - Cloud Platform position is ₹18 - ₹24 LPA. The role description mentions hybrid/office, but remote policies are determined during later rounds.",
      is_resolved: false,
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "q-mock-2",
      job_id: "job-1",
      candidate_email: "tech.wizard@example.com",
      query_text: "Does the GCP team require Kubernetes experience?",
      ai_response: "The key technologies and skills mentioned for this role are: React, Next.js, TypeScript, Performance, GCP, Tailwind CSS. Kubernetes is not explicitly listed as a mandatory requirement.",
      is_resolved: true,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }
  ];
}

const mockDb = new MockDatabase();

function calculateMockFuzzyMatchScore(cand: Candidate, jobId: string) {
  const jobSkills = mockDb.jobOpeningSkills.filter(s => s.job_opening_id === jobId);
  let score = 50; // base score
  const matches = cand.skills.filter(s => 
    jobSkills.some(js => js.skill_name.toLowerCase() === s.toLowerCase())
  );
  score += matches.length * 10;
  if (cand.experience_years && cand.experience_years >= 5) score += 10;
  
  // Apply previous performance adjustments from mockDb
  const otherApps = mockDb.applications.filter(a => a.candidate_id === cand.id && a.job_opening_id !== jobId);
  const otherAppIds = otherApps.map(a => a.id);
  const otherStages = mockDb.interviewStages ? mockDb.interviewStages.filter(s => otherAppIds.includes(s.application_id)) : [];
  
  let scoreAdjustment = 0;
  const perfSummaries: string[] = [];
  
  otherApps.forEach(app => {
    const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
    const jobTitle = job ? job.title : "Other Role";
    
    if (app.stage === "hired") {
      scoreAdjustment += 12;
      perfSummaries.push(`Successfully Hired for '${jobTitle}'`);
    } else if (app.stage === "rejected" || app.stage_status === "failed") {
      scoreAdjustment -= 10;
      perfSummaries.push(`Rejected/Failed for '${jobTitle}'`);
    } else if (app.stage_notes) {
      perfSummaries.push(`Applied to '${jobTitle}' (Notes: ${app.stage_notes})`);
    }
    
    const appStages = otherStages.filter(s => s.application_id === app.id);
    appStages.forEach(stg => {
      if (stg.outcome === "passed") {
        scoreAdjustment += 3;
      } else if (stg.outcome === "failed") {
        scoreAdjustment -= 6;
        if (stg.notes) {
          perfSummaries.push(`Failed ${stg.stage_name} stage (Notes: ${stg.notes})`);
        } else {
          perfSummaries.push(`Failed ${stg.stage_name} stage`);
        }
      } else if (stg.outcome === "on_hold") {
        scoreAdjustment += 1;
        if (stg.notes) {
          perfSummaries.push(`On hold in ${stg.stage_name} stage (Notes: ${stg.notes})`);
        }
      }
    });
  });
  
  score += scoreAdjustment;
  score = Math.max(0, Math.min(100, score));
  
  const strengths = matches.slice(0, 3);
  const skillGaps = jobSkills.filter(js => !cand.skills.some(s => s.toLowerCase() === js.skill_name.toLowerCase())).map(js => js.skill_name);
  
  let matchReason = `Calculated fuzzy score matching resume skills ${cand.skills.join(", ")} with approved skills.`;
  if (perfSummaries.length > 0) {
    matchReason += ` Previous Performance Considerations: ${perfSummaries.join("; ")}.`;
  }
  
  return {
    fuzzy_score: score,
    match_score: score,
    match_reason: matchReason,
    strengths,
    skill_gaps: skillGaps
  };
}

// API fetch wrapper with absolute error propagation (no mock fallback)
export async function apiRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  data?: any
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Retrieve Supabase token if available
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch (tokenErr) {
    console.warn("Could not retrieve supabase token for API request", tokenErr);
  }
  
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    
    const text = await res.text();
    let responseData: any = {};
    try {
      responseData = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      responseData = {};
    }

    if (!res.ok) {
      const errMsg = responseData.detail || `Request failed with status ${res.status}`;
      throw new Error(errMsg);
    }
    
    return responseData as T;
  } catch (err) {
    console.error(`API Request to ${path} failed:`, err);
    throw new Error(
      err instanceof Error 
        ? err.message 
        : "Failed to connect to the backend server. Please make sure the service is online."
    );
  }
}

// Route matching patterns for the mock layer
// Route matching patterns for the mock layer
async function handleMockRequest<T>(
  method: string,
  path: string,
  data: any
): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id || "usr-1";
  const currentUserEmail = session?.user?.email || "recruiter@kozker.ai";
  const currentUserFullName = session?.user?.user_metadata?.full_name || "Alex Mercer";

  // Dynamically register active user in mock users if not present
  if (session?.user && !mockDb.users.some(u => u.id === session.user.id)) {
    mockDb.users.push({
      id: session.user.id,
      email: session.user.email || "",
      full_name: session.user.user_metadata?.full_name || "Recruiter",
      role: "recruiter",
      is_onboarded: false,
      created_at: new Date().toISOString()
    });
  }
  
  // Dynamically map seeded data to current logged-in user in mock mode
  if (currentUserId !== "usr-1") {
    mockDb.candidates.forEach(c => {
      if (c.uploaded_by === "usr-1") c.uploaded_by = currentUserId;
    });
    mockDb.clients.forEach(c => {
      if (c.created_by === "usr-1") c.created_by = currentUserId;
    });
    mockDb.requirements.forEach(r => {
      if (r.created_by === "usr-1") r.created_by = currentUserId;
    });
    mockDb.jobOpenings.forEach(j => {
      if (j.created_by === "usr-1") j.created_by = currentUserId;
    });
    mockDb.applications.forEach(a => {
      if (a.reviewed_by === "usr-1") a.reviewed_by = currentUserId;
    });
    mockDb.activityLogs.forEach(l => {
      if (l.actor_id === "usr-1") {
        l.actor_id = currentUserId;
        l.actor_name = currentUserFullName;
      }
    });
  }

  return new Promise((resolve, reject) => {
    // Artificial Latency
    setTimeout(() => {
      try {
        // CALLBACKS
        if (path === "/callbacks/job-openings" && method === "POST") {
          const { requirement_id, job_openings } = data;
          const req = mockDb.requirements.find(r => r.id === requirement_id);
          if (!req) return reject(new Error("Requirement not found"));
          
          // Clear existing drafts
          mockDb.jobOpenings = mockDb.jobOpenings.filter(j => !(j.requirement_id === requirement_id && j.status === "draft"));
          
          // Insert drafts
          job_openings.forEach((jo: any, idx: number) => {
            mockDb.jobOpenings.push({
              id: `job-gen-${Date.now()}-${idx}`,
              requirement_id,
              client_id: req.client_id,
              post_index: idx + 1,
              title: jo.title,
              description: jo.overview,
              responsibilities: jo.responsibilities,
              qualifications: jo.qualifications,
              salary_range: jo.budget,
              keywords: jo.keywords,
              source: "ai",
              status: "draft",
              processing_status: "ready",
              error_message: null,
              created_by: currentUserId,
              created_at: new Date().toISOString(),
              published_at: null
            });
          });
          
          req.status = "ready";
          return resolve({ status: "success" } as unknown as T);
        }

        if (path === "/callbacks/job-skills" && method === "POST") {
          const { job_opening_id, skills } = data;
          const job = mockDb.jobOpenings.find(j => j.id === job_opening_id);
          if (!job) return reject(new Error("Job opening not found"));
          
          // Clear existing skills
          mockDb.jobOpeningSkills = mockDb.jobOpeningSkills.filter(s => s.job_opening_id !== job_opening_id);
          
          // Save skills
          skills.forEach((sk: any, idx: number) => {
            mockDb.jobOpeningSkills.push({
              id: `sk-cb-${Date.now()}-${idx}`,
              job_opening_id,
              skill_name: sk.name,
              weight: sk.weight,
              skill_order: idx + 1,
              approved: false,
              created_at: new Date().toISOString()
            });
          });
          
          job.processing_status = "ready";
          return resolve({ status: "success" } as unknown as T);
        }

        if (path === "/callbacks/candidate-matches" && method === "POST") {
          const { job_opening_id, matches } = data;
          const job = mockDb.jobOpenings.find(j => j.id === job_opening_id);
          if (!job) return reject(new Error("Job opening not found"));
          
          // Clear existing job candidates
          mockDb.jobCandidates = mockDb.jobCandidates.filter(jc => jc.job_opening_id !== job_opening_id);
          
          const scoredCandidates: any[] = [];
          matches.forEach((match: any, idx: number) => {
            const cand = mockDb.candidates.find(c => c.id === match.candidate_id);
            if (!cand) return;
            
            // Upsert application
            let app = mockDb.applications.find(a => a.candidate_id === match.candidate_id && a.job_opening_id === job_opening_id);
            if (!app) {
              app = {
                id: `app-cb-${Date.now()}-${idx}`,
                candidate_id: match.candidate_id,
                job_opening_id,
                candidate_cv: cand.resume_url,
                fuzzy_score: match.fuzzy_score,
                match_score: Math.round(match.fuzzy_score),
                match_reason: match.reasoning || "",
                strengths: match.strengths,
                skill_gaps: match.skill_gaps,
                screening_status: "pending",
                stage: "screening",
                stage_status: "pending",
                stage_notes: null,
                priority: 0,
                reviewed_by: currentUserId,
                reviewed_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              };
              mockDb.applications.push(app);
            } else {
              app.fuzzy_score = match.fuzzy_score;
              app.match_score = Math.round(match.fuzzy_score);
              app.match_reason = match.reasoning || "";
              app.strengths = match.strengths;
              app.skill_gaps = match.skill_gaps;
            }
            
            scoredCandidates.push({
              id: `jc-cb-${Date.now()}-${idx}`,
              job_opening_id,
              candidate_id: match.candidate_id,
              application_id: app.id,
              fuzzy_score: match.fuzzy_score,
              rank_order: 1,
              created_at: new Date().toISOString(),
              candidate_name: cand.full_name,
              experience_years: cand.experience_years || 0,
              skills: cand.skills,
              strengths: app.strengths,
              skill_gaps: app.skill_gaps,
              stage: app.stage,
              stage_status: app.stage_status
            });
          });
          
          // Sort and rank
          scoredCandidates.sort((a, b) => b.fuzzy_score - a.fuzzy_score);
          scoredCandidates.forEach((jc, rank) => {
            jc.rank_order = rank + 1;
            mockDb.jobCandidates.push(jc);
          });
          
          job.processing_status = "ready";
          return resolve({ status: "success" } as unknown as T);
        }

        if (path === "/callbacks/screening-questions" && method === "POST") {
          const { application_id, questions } = data;
          const app = mockDb.applications.find(a => a.id === application_id);
          if (!app) return reject(new Error("Application not found"));
          
          const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
          const reqId = job ? job.requirement_id : null;
          
          // Clear existing questions
          mockDb.screeningQuestions = mockDb.screeningQuestions.filter(q => q.application_id !== application_id);
          
          // Insert questions
          questions.forEach((q: any, idx: number) => {
            mockDb.screeningQuestions.push({
              id: `q-cb-${Date.now()}-${idx}`,
              application_id,
              requirement_id: reqId,
              job_opening_id: app.job_opening_id,
              question: q.question,
              difficulty: q.difficulty,
              question_order: idx + 1,
              modified: false,
              modified_by: null,
              modified_at: null,
              created_at: new Date().toISOString()
            });
          });
          
          return resolve({ status: "success" } as unknown as T);
        }

        // AUTH
        if (path === "/auth/me") {
          const userObj = mockDb.users.find(u => u.id === currentUserId) || mockDb.users[0];
          return resolve(userObj as unknown as T);
        }
        if (path === "/auth/onboarded" && method === "PATCH") {
          const userObj = mockDb.users.find(u => u.id === currentUserId);
          if (userObj) userObj.is_onboarded = true;
          return resolve((userObj || mockDb.users[0]) as unknown as T);
        }
        if (path === "/auth/login" || path === "/auth/signup") {
          const userObj = mockDb.users.find(u => u.id === currentUserId) || mockDb.users[0];
          return resolve({
            user: userObj,
            session: { access_token: "mock-jwt-token", refresh_token: "mock-refresh-token" }
          } as unknown as T);
        }

        // CLIENTS
        if (path === "/clients") {
          if (method === "GET") {
            const list = mockDb.clients.filter(c => c.created_by === currentUserId);
            return resolve(list as unknown as T);
          }
          if (method === "POST") {
            const newClient: Client = {
              id: `cli-${Date.now()}`,
              name: data.name,
              created_by: currentUserId,
              created_at: new Date().toISOString(),
              requirements_count: 0,
              active_jobs_count: 0
            };
            mockDb.clients.push(newClient);
            // log activity
            mockDb.activityLogs.unshift({
              id: `act-${Date.now()}`,
              actor_id: currentUserId,
              actor_name: currentUserFullName,
              action: "client_created",
              entity_type: "clients",
              entity_id: newClient.id,
              metadata: { client_name: newClient.name },
              created_at: new Date().toISOString()
            });
            return resolve(newClient as unknown as T);
          }
        }
        if (path.startsWith("/clients/") && method === "PUT") {
          const id = path.split("/")[2];
          const idx = mockDb.clients.findIndex(c => c.id === id && c.created_by === currentUserId);
          if (idx === -1) return reject(new Error("Client not found"));
          mockDb.clients[idx] = { ...mockDb.clients[idx], name: data.name };
          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: currentUserId,
            actor_name: currentUserFullName,
            action: "client_updated",
            entity_type: "clients",
            entity_id: id,
            metadata: { client_name: data.name },
            created_at: new Date().toISOString()
          });
          return resolve(mockDb.clients[idx] as unknown as T);
        }
        if (path.startsWith("/clients/") && method === "DELETE") {
          const id = path.split("/")[2];
          mockDb.clients = mockDb.clients.filter(c => c.id !== id || c.created_by === currentUserId);
          return resolve({ success: true } as unknown as T);
        }

        // REQUIREMENTS
        if (path === "/requirements") {
          if (method === "GET") {
            const list = mockDb.requirements.filter(r => r.created_by === currentUserId && !r.is_deleted);
            return resolve(list as unknown as T);
          }
          if (method === "POST") {
            const client = mockDb.clients.find(c => c.id === data.client_id && c.created_by === currentUserId) || { name: data.client_id };
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
              status: "ready",
              created_by: currentUserId,
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
                created_by: currentUserId,
                created_at: new Date().toISOString(),
                published_at: null
              };
              
              mockDb.jobOpenings.push(draftJob);
              
              // Simulate async generation status update to "ready"
              setTimeout(() => {
                const liveJob = mockDb.jobOpenings.find(j => j.id === draftJob.id);
                if (liveJob) {
                  liveJob.processing_status = "ready";
                  // Add unread notification
                  mockDb.notifications.unshift({
                    id: `not-${Date.now()}-${i}`,
                    recruiter_id: currentUserId,
                    title: "Job Generation Completed",
                    message: `Successfully generated job opening option ${i} for mandate '${newReq.title}'.`,
                    type: "job_generation",
                    is_read: false,
                    metadata: { requirement_id: newReq.id, job_opening_id: liveJob.id },
                    created_at: new Date().toISOString()
                  });
                  // Log to activity log
                  mockDb.activityLogs.unshift({
                    id: `act-${Date.now()}-${i}`,
                    actor_id: currentUserId,
                    actor_name: currentUserFullName,
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
              const cIndex = mockDb.clients.findIndex(c => c.id === newReq.client_id && c.created_by === currentUserId);
              if (cIndex !== -1) {
                mockDb.clients[cIndex].requirements_count = (mockDb.clients[cIndex].requirements_count || 0) + 1;
                mockDb.clients[cIndex].active_jobs_count = (mockDb.clients[cIndex].active_jobs_count || 0) + newReq.num_posts_requested;
              }
            }

            // log activity
            mockDb.activityLogs.unshift({
              id: `act-${Date.now()}`,
              actor_id: currentUserId,
              actor_name: currentUserFullName,
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
          const req = mockDb.requirements.find(r => r.id === id && r.created_by === currentUserId);
          if (!req) return reject(new Error("Not found"));
          // Attach linked openings
          const openings = mockDb.jobOpenings.filter(o => o.requirement_id === id);
          return resolve({ ...req, job_openings: openings } as unknown as T);
        }
        if (path.startsWith("/requirements/") && method === "PUT") {
          const id = path.split("/")[2];
          const index = mockDb.requirements.findIndex(r => r.id === id && r.created_by === currentUserId);
          if (index === -1) return reject(new Error("Not found"));
          
          const oldStatus = mockDb.requirements[index].status;
          const newStatus = data.status;
          mockDb.requirements[index] = {
            ...mockDb.requirements[index],
            ...data,
            updated_at: new Date().toISOString()
          };
          
          // Trigger job generation in mock mode if status is approved/generating
          if ((newStatus === "generating" || newStatus === "ready") && oldStatus === "draft") {
            const existingJobs = mockDb.jobOpenings.filter(j => j.requirement_id === id);
            if (existingJobs.length === 0) {
              const req = mockDb.requirements[index];
              req.status = "generating";
              
              for (let i = 1; i <= (req.num_posts_requested || 1); i++) {
                const draftJob: JobOpening = {
                  id: `job-${Date.now()}-${i}`,
                  requirement_id: req.id,
                  client_id: req.client_id,
                  client_name: req.client_name,
                  requirement_title: req.title,
                  post_index: i,
                  title: `${req.title} - Option ${i}`,
                  description: `AI-Generated draft option ${i} based on: ${req.description}`,
                  responsibilities: [
                    "Own key workflow modules and align layout structures.",
                    "Collaborate with internal design squads to build performant widgets.",
                    "Deliver clean, high-performance TypeScript components."
                  ],
                  qualifications: [
                    "Relevant developer background in this engineering discipline.",
                    "Competence with our core skill keywords."
                  ],
                  salary_range: `₹${(req.budget_min || 10)} - ${(req.budget_max || 20)} LPA`,
                  keywords: req.skills,
                  source: "ai",
                  status: "draft",
                  processing_status: "generating",
                  error_message: null,
                  created_by: currentUserId,
                  created_at: new Date().toISOString(),
                  published_at: null
                };
                
                mockDb.jobOpenings.push(draftJob);
                
                setTimeout(() => {
                  const liveJob = mockDb.jobOpenings.find(j => j.id === draftJob.id);
                  if (liveJob) {
                    liveJob.processing_status = "ready";
                    req.status = "ready";
                    
                    mockDb.notifications.unshift({
                      id: `not-${Date.now()}-${i}`,
                      recruiter_id: currentUserId,
                      title: "Job Generation Completed",
                      message: `Successfully generated job opening option ${i} for mandate '${req.title}'.`,
                      type: "job_generation",
                      is_read: false,
                      metadata: { requirement_id: req.id, job_opening_id: liveJob.id },
                      created_at: new Date().toISOString()
                    });
                    
                    mockDb.activityLogs.unshift({
                      id: `act-${Date.now()}-${i}`,
                      actor_id: currentUserId,
                      actor_name: currentUserFullName,
                      action: "job_draft_ready",
                      entity_type: "job_openings",
                      entity_id: liveJob.id,
                      metadata: { job_title: liveJob.title },
                      created_at: new Date().toISOString()
                    });
                  }
                }, 4000);
              }
            }
          }
          
          // log activity
          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: currentUserId,
            actor_name: currentUserFullName,
            action: "requirement_updated",
            entity_type: "requirements",
            entity_id: id,
            metadata: { req_title: mockDb.requirements[index].title },
            created_at: new Date().toISOString()
          });
          
          return resolve(mockDb.requirements[index] as unknown as T);
        }
        if (path.startsWith("/requirements/") && method === "DELETE") {
          const id = path.split("/")[2];
          const index = mockDb.requirements.findIndex(r => r.id === id && r.created_by === currentUserId);
          if (index === -1) return reject(new Error("Not found"));
          
          mockDb.requirements[index].is_deleted = true;
          
          // Cascading delete job openings
          mockDb.jobOpenings.forEach(j => {
            if (j.requirement_id === id) {
              j.is_deleted = true;
            }
          });
          
          // log activity
          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: currentUserId,
            actor_name: currentUserFullName,
            action: "requirement_deleted",
            entity_type: "requirements",
            entity_id: id,
            metadata: { req_title: mockDb.requirements[index].title },
            created_at: new Date().toISOString()
          });
          
          return resolve({ success: true } as unknown as T);
        }

        // JOBS
        if (path === "/jobs") {
          if (method === "GET") {
            // Attach computed fields, filtering by user requirements/created jobs
            const list = mockDb.jobOpenings
              .filter(j => !j.is_deleted && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId && !r.is_deleted)))
              .map(j => {
                const appList = mockDb.applications.filter(a => a.job_opening_id === j.id);
                const top = appList.reduce((max, a) => (a.fuzzy_score || 0) > max ? (a.fuzzy_score || 0) : max, 0);
                const req = mockDb.requirements.find(r => r.id === j.requirement_id);
                const cli = req ? mockDb.clients.find(c => c.id === req.client_id) : null;
                return {
                  ...j,
                  client_name: j.client_name || cli?.name || "Generic Client",
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
              created_by: currentUserId,
              created_at: new Date().toISOString(),
              published_at: null
            };
            mockDb.jobOpenings.push(newJob);
            // activity
            mockDb.activityLogs.unshift({
              id: `act-${Date.now()}`,
              actor_id: currentUserId,
              actor_name: currentUserFullName,
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
          const job = mockDb.jobOpenings.find(j => j.id === id && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId)));
          if (!job) return reject(new Error("Job not found"));
          job.status = "confirmed";
          
          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: currentUserId,
            actor_name: currentUserFullName,
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
          const job = mockDb.jobOpenings.find(j => j.id === id && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId)));
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
          const job = mockDb.jobOpenings.find(j => j.id === id && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId)));
          if (!job) return reject(new Error("Job not found"));
          const skills = mockDb.jobOpeningSkills.filter(s => s.job_opening_id === id);
          return resolve(skills as unknown as T);
        }
        if (path.startsWith("/jobs/") && path.endsWith("/skills") && method === "PUT") {
          const id = path.split("/")[2];
          const job = mockDb.jobOpenings.find(j => j.id === id && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId)));
          if (!job) return reject(new Error("Job not found"));
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
          job.processing_status = "matching";
          
          setTimeout(() => {
            // Populate Job Candidates by mapping and matching each candidate
            mockDb.jobCandidates = mockDb.jobCandidates.filter(jc => jc.job_opening_id !== id);
            
            // Score all candidates in the candidate list
            mockDb.candidates.forEach((cand, cIdx) => {
              const matchResult = calculateMockFuzzyMatchScore(cand, id);

              // Check if application exists, else create
              let app = mockDb.applications.find(a => a.candidate_id === cand.id && a.job_opening_id === id);
              if (!app) {
                app = {
                  id: `app-gen-${Date.now()}-${cIdx}`,
                  candidate_id: cand.id,
                  job_opening_id: id,
                  candidate_cv: cand.resume_url,
                  fuzzy_score: matchResult.fuzzy_score,
                  match_score: matchResult.match_score,
                  match_reason: matchResult.match_reason,
                  strengths: matchResult.strengths,
                  skill_gaps: matchResult.skill_gaps,
                  screening_status: "pending",
                  stage: "screening",
                  stage_status: "pending",
                  stage_notes: null,
                  priority: 0,
                  reviewed_by: currentUserId,
                  reviewed_at: new Date().toISOString(),
                  created_at: new Date().toISOString()
                };
                mockDb.applications.push(app);
              } else {
                app.fuzzy_score = matchResult.fuzzy_score;
                app.match_score = matchResult.match_score;
                app.match_reason = matchResult.match_reason;
                app.strengths = matchResult.strengths;
                app.skill_gaps = matchResult.skill_gaps;
              }

              // Add to Job Candidates
              mockDb.jobCandidates.push({
                id: `jc-${Date.now()}-${cIdx}`,
                job_opening_id: id,
                application_id: app.id,
                fuzzy_score: matchResult.fuzzy_score,
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
              actor_id: currentUserId,
              actor_name: currentUserFullName,
              action: "candidates_matched",
              entity_type: "job_openings",
              entity_id: id,
              metadata: { job_title: job.title, count: relevantCandidates.length },
              created_at: new Date().toISOString()
            });
          }, 3000);

          return resolve({ success: true } as unknown as T);
        }
        if (path.startsWith("/jobs/") && path.includes("/queries") && method === "GET") {
          const cleanPath = path.split("?")[0];
          if (cleanPath.endsWith("/queries")) {
            const id = cleanPath.split("/")[2];
            const urlParams = new URLSearchParams(path.split("?")[1] || "");
            const email = urlParams.get("email");
            
            let list = mockDb.candidateQueries.filter(q => q.job_id === id);
            if (email) {
              list = list.filter(q => q.candidate_email.toLowerCase() === email.toLowerCase());
            }
            return resolve(list as unknown as T);
          }
        }
        if (path.startsWith("/jobs/") && path.endsWith("/queries") && method === "POST") {
          const id = path.split("/")[2];
          const job = mockDb.jobOpenings.find(j => j.id === id);
          const title = job?.title || "this role";
          const queryText = data.query_text || "";
          const queryLower = queryText.toLowerCase();
          
          let ai_response = `Thanks for your question regarding the ${title} position. We have recorded your query and forwarded it to our hiring team. They will get back to you at ${data.candidate_email} if further details are needed.`;
          if (queryLower.includes("salary") || queryLower.includes("pay") || queryLower.includes("package") || queryLower.includes("lpa") || queryLower.includes("compensation")) {
            ai_response = `The salary range for the ${title} position is ${job?.salary_range || "not explicitly specified"}.`;
          } else if (queryLower.includes("skill") || queryLower.includes("tech") || queryLower.includes("language") || queryLower.includes("framework")) {
            ai_response = `The key technologies and skills mentioned for this role are: ${job?.keywords?.join(", ") || "React, TypeScript"}.`;
          } else if (queryLower.includes("responsibility") || queryLower.includes("do") || queryLower.includes("duty")) {
            ai_response = `Key responsibilities for this role include: ${job?.responsibilities?.slice(0, 3).join("; ") || "delivering on goals outlined in the description"}.`;
          }
          
          const newQuery: CandidateQuery = {
            id: `q-mock-${Date.now()}`,
            job_id: id,
            candidate_email: data.candidate_email,
            query_text: queryText,
            ai_response,
            is_resolved: false,
            created_at: new Date().toISOString()
          };
          mockDb.candidateQueries.unshift(newQuery);
          
          mockDb.notifications.unshift({
            id: `not-q-${Date.now()}`,
            recruiter_id: currentUserId,
            title: "New Candidate Query",
            message: `Candidate (${data.candidate_email}) submitted a query for role '${job?.title || "Active Opening"}': '${queryText}'`,
            type: "upload",
            is_read: false,
            metadata: { job_id: id, query_id: newQuery.id },
            created_at: new Date().toISOString()
          });
          
          return resolve(newQuery as unknown as T);
        }
        if (path.startsWith("/queries/") && path.endsWith("/resolve") && method === "POST") {
          const queryId = path.split("/")[2];
          const query = mockDb.candidateQueries.find(q => q.id === queryId);
          if (!query) return reject(new Error("Query not found"));
          query.is_resolved = data.is_resolved !== undefined ? data.is_resolved : true;
          return resolve(query as unknown as T);
        }
        if (path.startsWith("/queries/") && path.endsWith("/answer") && method === "POST") {
          const queryId = path.split("/")[2];
          const query = mockDb.candidateQueries.find(q => q.id === queryId);
          if (!query) return reject(new Error("Query not found"));
          query.ai_response = data.response_text;
          query.is_resolved = true;
          
          console.log(`[MOCK EMAIL DISPATCH] To: ${query.candidate_email} | Subject: Answer to your query | Body: ${data.response_text}`);
          
          return resolve(query as unknown as T);
        }
        if (path.startsWith("/jobs/") && path.endsWith("/candidates") && method === "GET") {
          const id = path.split("/")[2];
          const job = mockDb.jobOpenings.find(j => j.id === id && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId)));
          if (!job) return reject(new Error("Job not found"));
          const candList = mockDb.jobCandidates.filter(jc => jc.job_opening_id === id);
          return resolve(candList as unknown as T);
        }
        if (path.startsWith("/jobs/") && method === "GET") {
          const id = path.split("/")[2];
          const job = mockDb.jobOpenings.find(j => j.id === id && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId)));
          if (!job) return reject(new Error("Job not found"));
          return resolve(job as unknown as T);
        }
        if (path.startsWith("/jobs/") && method === "PATCH") {
          const id = path.split("/")[2];
          const jobIndex = mockDb.jobOpenings.findIndex(j => j.id === id && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId)));
          if (jobIndex === -1) return reject(new Error("Job not found"));
          mockDb.jobOpenings[jobIndex] = {
            ...mockDb.jobOpenings[jobIndex],
            ...data
          };
          return resolve(mockDb.jobOpenings[jobIndex] as unknown as T);
        }
        if (path.startsWith("/jobs/") && method === "DELETE") {
          const id = path.split("/")[2];
          const index = mockDb.jobOpenings.findIndex(j => j.id === id);
          if (index !== -1) {
            mockDb.jobOpenings[index].is_deleted = true;
            // log activity
            mockDb.activityLogs.unshift({
              id: `act-${Date.now()}`,
              actor_id: currentUserId,
              actor_name: currentUserFullName,
              action: "job_deleted",
              entity_type: "job_openings",
              entity_id: id,
              metadata: { job_title: mockDb.jobOpenings[index].title },
              created_at: new Date().toISOString()
            });
            return resolve({ success: true } as unknown as T);
          }
          return reject(new Error("Job not found"));
        }
        if (path.startsWith("/jobs/") && path.endsWith("/regenerate") && method === "POST") {
          const id = path.split("/")[2];
          const job = mockDb.jobOpenings.find(j => j.id === id && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId)));
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
          const candidateId = path.split("/")[2];
          const cand = mockDb.candidates.find(c => c.id === candidateId);
          if (!cand) return reject(new Error("Not found"));
          return resolve({ url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" } as unknown as T);
        }
        if (path.startsWith("/candidates/") && path.endsWith("/applications") && method === "GET") {
          const parts = path.split("/");
          const candidateId = parts[2];
          const cand = mockDb.candidates.find(c => c.id === candidateId);
          if (!cand) return reject(new Error("Not found"));
          const candidateApps = mockDb.applications
            .filter(a => a.candidate_id === candidateId)
            .map(a => {
              const job = mockDb.jobOpenings.find(j => j.id === a.job_opening_id);
              return {
                ...a,
                job_title: job?.title || "Unknown Job",
                client_name: job?.client_name || "Generic Client"
              };
            });
          return resolve(candidateApps as unknown as T);
        }
        if (path.startsWith("/candidates/") && path.endsWith("/history") && method === "GET") {
          const parts = path.split("/");
          const candidateId = parts[2];
          const cand = mockDb.candidates.find(c => c.id === candidateId);
          if (!cand) return reject(new Error("Not found"));
          const candidateApps = mockDb.applications.filter(a => a.candidate_id === candidateId);
          
          const history = candidateApps.map(app => {
            const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
            const appStages = mockDb.interviewStages ? mockDb.interviewStages.filter(stg => stg.application_id === app.id) : [];
            
            // Sort stages by order
            appStages.sort((a, b) => (a.stage_order || 1) - (b.stage_order || 1));
            
            return {
              application_id: app.id,
              job_id: job?.id,
              job_title: job?.title || "Unknown Job",
              client_name: job?.client_name || "Generic Client",
              fuzzy_score: app.fuzzy_score,
              match_score: app.match_score,
              match_reason: app.match_reason,
              screening_status: app.screening_status,
              stage: app.stage,
              stage_status: app.stage_status,
              stage_notes: app.stage_notes,
              stages: appStages,
              created_at: app.created_at
            };
          });
          
          return resolve(history as unknown as T);
        }
        if (path.startsWith("/candidates/") && method === "GET") {
          const id = path.split("/")[2];
          const cand = mockDb.candidates.find(c => c.id === id);
          if (!cand) {
            const allCands = mockDb.candidates.map(c => `(id:${c.id}, owner:${c.uploaded_by})`).join(", ");
            return reject(new Error(`Candidate not found for GET. Requested ID: "${id}", currentUserId: "${currentUserId}". Existing: [${allCands}]`));
          }
          return resolve(cand as unknown as T);
        }
        if (path.startsWith("/candidates/") && method === "PUT") {
          const id = path.split("/")[2];
          const cand = mockDb.candidates.find(c => c.id === id);
          if (!cand) {
            const allCands = mockDb.candidates.map(c => `(id:${c.id}, owner:${c.uploaded_by})`).join(", ");
            return reject(new Error(`Candidate not found for PUT. Requested ID: "${id}", currentUserId: "${currentUserId}". Existing: [${allCands}]`));
          }
          
          if (data.full_name !== undefined) cand.full_name = data.full_name;
          if (data.email !== undefined) cand.email = data.email;
          if (data.phone !== undefined) cand.phone = data.phone;
          if (data.skills !== undefined) cand.skills = data.skills;
          if (data.experience_years !== undefined) cand.experience_years = Number(data.experience_years);
          if (data.resume_url !== undefined) cand.resume_url = data.resume_url;
          if (data.education !== undefined) cand.education = data.education;
          if (data.working_or_not !== undefined) cand.working_or_not = data.working_or_not;
          if (data.academic_details !== undefined) cand.academic_details = data.academic_details;
          if (data.achievements !== undefined) cand.achievements = data.achievements;
          
          if (data.summary !== undefined || data.raw_text !== undefined) {
            if (!cand.parsed_resume_json) cand.parsed_resume_json = {};
            if (data.summary !== undefined) cand.parsed_resume_json.summary = data.summary;
            if (data.raw_text !== undefined) cand.parsed_resume_json.raw_text = data.raw_text;
          }

          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: currentUserId,
            actor_name: currentUserFullName,
            action: "candidate_updated",
            entity_type: "candidates",
            entity_id: cand.id,
            metadata: { candidate_name: cand.full_name },
            created_at: new Date().toISOString()
          });
          return resolve(cand as unknown as T);
        }
        if (path.startsWith("/candidates/") && method === "DELETE") {
          const id = path.split("/")[2];
          const candIdx = mockDb.candidates.findIndex(c => c.id === id);
          if (candIdx === -1) return reject(new Error("Not found"));
          const cand = mockDb.candidates[candIdx];
          mockDb.candidates.splice(candIdx, 1);
          
          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: currentUserId,
            actor_name: currentUserFullName,
            action: "candidate_deleted",
            entity_type: "candidates",
            entity_id: id,
            metadata: { candidate_name: cand.full_name },
            created_at: new Date().toISOString()
          });
          return resolve({ success: true } as unknown as T);
        }
        if (path === "/candidates" && method === "POST") {
          // Check duplicate email AND job_id -> MERGE IF EXISTS
          const exists = mockDb.candidates.find(c => 
            c.email.toLowerCase() === data.email.toLowerCase() && 
            (c.job_id || null) === (data.job_id || null) &&
            c.uploaded_by === currentUserId
          );
          if (exists) {
            exists.full_name = data.full_name || exists.full_name;
            exists.phone = data.phone || exists.phone;
            exists.skills = Array.from(new Set([...(exists.skills || []), ...(data.skills || [])]));
            exists.experience_years = Math.max(exists.experience_years || 0, Number(data.experience_years) || 0);
            exists.education = data.education || exists.education;
            exists.working_or_not = data.working_or_not !== undefined ? !!data.working_or_not : exists.working_or_not;
            exists.academic_details = data.academic_details || exists.academic_details;
            exists.achievements = data.achievements || exists.achievements;
            if (data.raw_text && !exists.raw_text?.includes(data.raw_text)) {
              exists.raw_text = `${exists.raw_text}\n\n[Updated Profile]:\n${data.raw_text}`;
            }
            if (data.summary) {
              if (!exists.parsed_resume_json) exists.parsed_resume_json = {};
              exists.parsed_resume_json.summary = data.summary;
            }
            return resolve(exists as unknown as T);
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
            education: data.education || null,
            working_or_not: data.working_or_not !== undefined ? !!data.working_or_not : true,
            academic_details: data.academic_details || null,
            achievements: data.achievements || null,
            parsed_resume_json: {
              summary: data.summary || "",
              raw_text: data.raw_text || ""
            },
            source: "manual",
            uploaded_by: currentUserId,
            job_id: data.job_id || null,
            created_at: new Date().toISOString(),
            linked_jobs: []
          };
          mockDb.candidates.push(newCand);
          // Activity
          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: currentUserId,
            actor_name: currentUserFullName,
            action: "candidate_created_manual",
            entity_type: "candidates",
            entity_id: newCand.id,
            metadata: { candidate_name: newCand.full_name },
            created_at: new Date().toISOString()
          });
          return resolve(newCand as unknown as T);
        }
        if (path.startsWith("/jobs/") && path.includes("/candidates/") && method === "POST") {
          const parts = path.split("/");
          const jobId = parts[2];
          const candId = parts[4];
          
          const cand = mockDb.candidates.find(c => c.id === candId && c.uploaded_by === currentUserId);
          if (!cand) return reject(new Error("Candidate not found"));
          
          const job = mockDb.jobOpenings.find(j => j.id === jobId && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId)));
          if (!job) return reject(new Error("Job not found"));
          
          // Check if already exists
          const exists = mockDb.applications.some(a => a.candidate_id === candId && a.job_opening_id === jobId);
          if (exists) return reject(new Error("Candidate is already linked to this job opening"));
          
          const matchResult = calculateMockFuzzyMatchScore(cand, jobId);
          
          const appId = `app-link-${Date.now()}`;
          const app = {
            id: appId,
            candidate_id: candId,
            job_opening_id: jobId,
            candidate_cv: cand.resume_url,
            fuzzy_score: matchResult.fuzzy_score,
            match_score: matchResult.match_score,
            match_reason: matchResult.match_reason,
            strengths: matchResult.strengths,
            skill_gaps: matchResult.skill_gaps,
            screening_status: "pending" as const,
            stage: "screening" as const,
            stage_status: "pending" as const,
            stage_notes: null,
            priority: 0,
            reviewed_by: currentUserId,
            reviewed_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          };
          mockDb.applications.push(app);
          
          const rank = mockDb.jobCandidates.filter(jc => jc.job_opening_id === jobId).length + 1;
          mockDb.jobCandidates.push({
            id: `jc-link-${Date.now()}`,
            job_opening_id: jobId,
            application_id: appId,
            fuzzy_score: matchResult.fuzzy_score,
            rank_order: rank,
            created_at: new Date().toISOString(),
            candidate_id: candId,
            candidate_name: cand.full_name,
            experience_years: cand.experience_years || 0,
            skills: cand.skills || [],
            strengths: matchResult.strengths,
            skill_gaps: matchResult.skill_gaps,
            priority: 0,
            stage: "screening",
            stage_status: "pending"
          });

          // Update candidate's linked_jobs list
          if (!cand.linked_jobs) {
            cand.linked_jobs = [];
          }
          if (!cand.linked_jobs.some(j => j.job_id === jobId)) {
            cand.linked_jobs.push({
              job_id: jobId,
              job_title: job.title || "Unknown Job",
              fuzzy_score: matchResult.fuzzy_score,
              stage: "screening",
              status: "pending"
            });
          }
          
          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: currentUserId,
            actor_name: currentUserFullName,
            action: "candidate_linked",
            entity_type: "applications",
            entity_id: appId,
            metadata: { candidate_name: cand.full_name },
            created_at: new Date().toISOString()
          });
          
          return resolve({ success: true, application: app } as unknown as T);
        }
        if ((path === "/candidates/upload/csv" || path.startsWith("/jobs/")) && method === "POST") {
          const jobId = path.includes("/jobs/") ? path.split("/")[3] : undefined;
          if (jobId) {
            const job = mockDb.jobOpenings.find(j => j.id === jobId && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId)));
            if (!job) return reject(new Error("Job opening not found or access denied"));
          }
          const items = data.items || [];
          let inserted = 0;
          let skipped = 0;
          
          items.forEach((item: any, idx: number) => {
            if (!item.email || !item.full_name) return;
            const exists = mockDb.candidates.find(c => c.email.toLowerCase() === item.email.toLowerCase() && c.uploaded_by === currentUserId);
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
                  reviewed_by: currentUserId,
                  reviewed_at: new Date().toISOString(),
                  created_at: new Date().toISOString()
                };
                mockDb.applications.push(app);
              }
              
              // MERGE CSV DETAILS IF EXISTS
              exists.full_name = item.full_name || exists.full_name;
              exists.phone = item.phone || exists.phone;
              const newSkills = item.skills ? item.skills.split(",").map((s: string) => s.trim()) : [];
              exists.skills = Array.from(new Set([...(exists.skills || []), ...newSkills]));
              exists.experience_years = Math.max(exists.experience_years || 0, Number(item.experience_years) || 0);
              exists.education = item.education || exists.education;
              exists.working_or_not = item.working_or_not !== undefined 
                ? (item.working_or_not === true || String(item.working_or_not).toLowerCase() === "true") 
                : exists.working_or_not;
              exists.academic_details = item.academic_details || exists.academic_details;
              exists.achievements = item.achievements || exists.achievements;
              exists.resume_url = item.resume_url || exists.resume_url;
              if (item.raw_text && !exists.raw_text?.includes(item.raw_text)) {
                exists.raw_text = `${exists.raw_text}\n\n[CSV Re-upload]:\n${item.raw_text}`;
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
                resume_url: item.resume_url || null,
                raw_text: `Parsed from CSV: ${item.full_name}`,
                education: item.education || null,
                working_or_not: item.working_or_not !== undefined ? (item.working_or_not === true || String(item.working_or_not).toLowerCase() === "true") : true,
                academic_details: item.academic_details || null,
                achievements: item.achievements || null,
                source: "csv",
                uploaded_by: currentUserId,
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
                  reviewed_by: currentUserId,
                  reviewed_at: new Date().toISOString(),
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
          const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
          const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
          const accessDenied = !((cand && cand.uploaded_by === currentUserId) || (job && (job.created_by === currentUserId || mockDb.requirements.some(r => r.id === job.requirement_id && r.created_by === currentUserId))));
          if (accessDenied) return reject(new Error("Access denied"));

          app.screening_status = "accepted";
          app.reviewed_by = currentUserId;
          app.reviewed_at = new Date().toISOString();
          
          // Trigger screening question generation mock
          setTimeout(() => {
            const jobObj = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
            const candObj = mockDb.candidates.find(c => c.id === app.candidate_id);
            
            mockDb.screeningQuestions = mockDb.screeningQuestions.filter(q => q.application_id !== id);
            const generated = [
              {
                id: `q-g1-${Date.now()}`,
                application_id: id,
                requirement_id: app.job_opening_id ? jobObj?.requirement_id || null : null,
                job_opening_id: app.job_opening_id,
                question: `Based on your resume, can you detail a project where you solved a ${candObj?.skills[0] || "React"} challenge?`,
                difficulty: "easy" as const,
                question_order: 1,
                modified: false, modified_by: null, modified_at: null, created_at: new Date().toISOString()
              },
              {
                id: `q-g2-${Date.now()}`,
                application_id: id,
                requirement_id: app.job_opening_id ? jobObj?.requirement_id || null : null,
                job_opening_id: app.job_opening_id,
                question: `Explain how you would handle low latency state synchronization in micro-frontends.`,
                difficulty: "medium" as const,
                question_order: 2,
                modified: false, modified_by: null, modified_at: null, created_at: new Date().toISOString()
              },
              {
                id: `q-g3-${Date.now()}`,
                application_id: id,
                requirement_id: app.job_opening_id ? jobObj?.requirement_id || null : null,
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
            actor_id: currentUserId,
            actor_name: currentUserFullName,
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
          const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
          const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
          const accessDenied = !((cand && cand.uploaded_by === currentUserId) || (job && (job.created_by === currentUserId || mockDb.requirements.some(r => r.id === job.requirement_id && r.created_by === currentUserId))));
          if (accessDenied) return reject(new Error("Access denied"));

          app.screening_status = "rejected";
          app.stage = "rejected";
          app.stage_status = "failed";
          app.reviewed_by = currentUserId;
          app.reviewed_at = new Date().toISOString();
          
          if (data && data.reason) {
            app.stage_notes = data.reason;
          }

          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: currentUserId,
            actor_name: currentUserFullName,
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
          const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
          const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
          const accessDenied = !((cand && cand.uploaded_by === currentUserId) || (job && (job.created_by === currentUserId || mockDb.requirements.some(r => r.id === job.requirement_id && r.created_by === currentUserId))));
          if (accessDenied) return reject(new Error("Access denied"));
          
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
            updated_by: currentUserId,
            created_at: new Date().toISOString()
          });

          mockDb.activityLogs.unshift({
            id: `act-${Date.now()}`,
            actor_id: currentUserId,
            actor_name: currentUserFullName,
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
          const app = mockDb.applications.find(a => a.id === id);
          if (!app) return reject(new Error("Application not found"));
          const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
          const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
          const accessDenied = !((cand && cand.uploaded_by === currentUserId) || (job && (job.created_by === currentUserId || mockDb.requirements.some(r => r.id === job.requirement_id && r.created_by === currentUserId))));
          if (accessDenied) return reject(new Error("Access denied"));

          const qs = mockDb.screeningQuestions.filter(q => q.application_id === id);
          return resolve(qs as unknown as T);
        }
        if (path.startsWith("/applications/") && path.endsWith("/questions") && method === "POST") {
          const appId = path.split("/")[2];
          const app = mockDb.applications.find(a => a.id === appId);
          if (!app) return reject(new Error("Application not found"));
          const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
          const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
          const accessDenied = !((cand && cand.uploaded_by === currentUserId) || (job && (job.created_by === currentUserId || mockDb.requirements.some(r => r.id === job.requirement_id && r.created_by === currentUserId))));
          if (accessDenied) return reject(new Error("Access denied"));

          const newQ = {
            id: `q-custom-${Date.now()}`,
            application_id: appId,
            job_candidate_id: `jc-custom-${Date.now()}`,
            requirement_id: `req-custom-${Date.now()}`,
            job_opening_id: `job-custom-${Date.now()}`,
            question: data.question,
            difficulty: data.difficulty || "medium",
            question_order: mockDb.screeningQuestions.filter(q => q.application_id === appId).length + 1,
            ai_generated: false,
            modified: false,
            modified_by: currentUserId,
            modified_at: null,
            created_at: new Date().toISOString()
          };
          mockDb.screeningQuestions.push(newQ);
          return resolve(newQ as unknown as T);
        }
        if (path.startsWith("/applications/") && path.endsWith("/stages") && method === "GET") {
          const id = path.split("/")[2];
          const app = mockDb.applications.find(a => a.id === id);
          if (!app) return reject(new Error("Application not found"));
          const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
          const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
          const accessDenied = !((cand && cand.uploaded_by === currentUserId) || (job && (job.created_by === currentUserId || mockDb.requirements.some(r => r.id === job.requirement_id && r.created_by === currentUserId))));
          if (accessDenied) return reject(new Error("Access denied"));

          const stages = mockDb.interviewStages.filter(s => s.application_id === id);
          return resolve(stages as unknown as T);
        }
        if (path === "/applications" && method === "GET") {
          const list = mockDb.applications
            .filter(app => {
              const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
              const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
              return (
                app.reviewed_by === currentUserId ||
                (cand && cand.uploaded_by === currentUserId) ||
                (job && (job.created_by === currentUserId || mockDb.requirements.some(r => r.id === job.requirement_id && r.created_by === currentUserId)))
              );
            })
            .map(app => {
              const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
              const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
              const clientObj = job ? mockDb.clients.find(c => c.id === job.client_id) : null;
              return {
                ...app,
                candidates: cand,
                job_openings: job ? {
                  ...job,
                  clients: clientObj ? { name: clientObj.name } : null
                } : null
              };
            });
          return resolve(list as unknown as T);
        }
        if (path.startsWith("/applications/") && method === "GET") {
          const id = path.split("/")[2];
          const app = mockDb.applications.find(a => a.id === id);
          if (!app) return reject(new Error("Application not found"));
          
          // Hydrate name & email
          const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
          const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
          const accessDenied = !((cand && cand.uploaded_by === currentUserId) || (job && (job.created_by === currentUserId || mockDb.requirements.some(r => r.id === job.requirement_id && r.created_by === currentUserId))));
          if (accessDenied) return reject(new Error("Access denied"));

          const qs = mockDb.screeningQuestions ? mockDb.screeningQuestions.filter(q => q.application_id === id) : [];
          return resolve({
            ...app,
            candidate_name: cand?.full_name,
            candidate_email: cand?.email,
            candidate_experience: cand?.experience_years,
            candidate_skills: cand?.skills,
            candidate_cv: cand?.raw_text || app.candidate_cv,
            screening_questions: qs
          } as unknown as T);
        }

        // QUESTIONS MANUAL EDIT
        if (path.startsWith("/questions/") && method === "PATCH") {
          const id = path.split("/")[2];
          const q = mockDb.screeningQuestions.find(sq => sq.id === id);
          if (!q) return reject(new Error("Question not found"));
          const app = mockDb.applications.find(a => a.id === q.application_id);
          if (!app) return reject(new Error("Application not found"));
          const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
          const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
          const accessDenied = !((cand && cand.uploaded_by === currentUserId) || (job && (job.created_by === currentUserId || mockDb.requirements.some(r => r.id === job.requirement_id && r.created_by === currentUserId))));
          if (accessDenied) return reject(new Error("Access denied"));

          if (data.question !== undefined) q.question = data.question;
          if (data.difficulty !== undefined) q.difficulty = data.difficulty;
          if (data.reason !== undefined) q.reason = data.reason;
          if (data.order !== undefined) q.question_order = data.order;
          if (data.question_order !== undefined) q.question_order = data.question_order;
          q.modified = true;
          q.modified_at = new Date().toISOString();
          q.modified_by = currentUserId;
          return resolve(q as unknown as T);
        }
        if (path.startsWith("/questions/") && path.endsWith("/ai-edit") && method === "POST") {
          const id = path.split("/")[2];
          const q = mockDb.screeningQuestions.find(sq => sq.id === id);
          if (!q) return reject(new Error("Question not found"));
          const app = mockDb.applications.find(a => a.id === q.application_id);
          if (!app) return reject(new Error("Application not found"));
          const cand = mockDb.candidates.find(c => c.id === app.candidate_id);
          const job = mockDb.jobOpenings.find(j => j.id === app.job_opening_id);
          const accessDenied = !((cand && cand.uploaded_by === currentUserId) || (job && (job.created_by === currentUserId || mockDb.requirements.some(r => r.id === job.requirement_id && r.created_by === currentUserId))));
          if (accessDenied) return reject(new Error("Access denied"));
          
          // Simulate Claude editing the question based on instructions
          q.question = `${q.question} (Refined with: "${data.instruction}")`;
          q.modified = true;
          q.modified_at = new Date().toISOString();
          q.modified_by = currentUserId;
          return resolve(q as unknown as T);
        }

        // CHATBOT MESSAGE
        if (path === "/chatbot/message" && method === "POST") {
          const { message, current_page } = data;
          let reply = "";
          
          const openJobsCount = mockDb.jobOpenings.filter(j => j.status === 'published' && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId))).length;
          const draftJobsCount = mockDb.jobOpenings.filter(j => j.status === 'draft' && (j.created_by === currentUserId || mockDb.requirements.some(r => r.id === j.requirement_id && r.created_by === currentUserId))).length;
          const candidateCount = mockDb.candidates.filter(c => c.uploaded_by === currentUserId).length;

          if (message.toLowerCase().includes("job") || message.toLowerCase().includes("openings")) {
            reply = `Currently, you have ${openJobsCount} active job openings published, and ${draftJobsCount} drafts awaiting review. You are looking for skills like React, Next.js, and Distributed Systems.`;
          } else if (message.toLowerCase().includes("candidate") || message.toLowerCase().includes("pool")) {
            reply = `The Candidate Pool currently has ${candidateCount} unique profiles uploaded.`;
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

        // NOTIFICATIONS
        if (path === "/notifications" && method === "GET") {
          const list = mockDb.notifications.filter(n => n.recruiter_id === currentUserId);
          return resolve(list as unknown as T);
        }

        if (path === "/notifications" && method === "DELETE") {
          mockDb.notifications = mockDb.notifications.filter(n => n.recruiter_id !== currentUserId);
          return resolve({ success: true } as unknown as T);
        }

        if (path === "/notifications/read-all" && method === "POST") {
          mockDb.notifications.forEach(n => {
            if (n.recruiter_id === currentUserId) {
              n.is_read = true;
            }
          });
          return resolve({ success: true } as unknown as T);
        }

        if (path.startsWith("/notifications/") && path.endsWith("/read") && method === "POST") {
          const id = path.split("/")[2];
          const notif = mockDb.notifications.find(n => n.id === id);
          if (notif) {
            notif.is_read = true;
          }
          return resolve({ success: true } as unknown as T);
        }
        if (path.startsWith("/notifications/") && method === "DELETE") {
          const id = path.split("/")[2];
          const index = mockDb.notifications.findIndex(n => n.id === id);
          if (index !== -1) {
            mockDb.notifications.splice(index, 1);
            return resolve({ success: true } as unknown as T);
          }
          return reject(new Error("Notification not found"));
        }

        // ACTIVITY LOG
        if (path === "/activity_log" && method === "GET") {
          const list = mockDb.activityLogs.filter(a => a.actor_id === currentUserId);
          return resolve(list as unknown as T);
        }

        if (path === "/activity_log" && method === "DELETE") {
          mockDb.activityLogs = mockDb.activityLogs.filter(a => a.actor_id !== currentUserId);
          return resolve({ success: true } as unknown as T);
        }

        if (path.startsWith("/activity_log/") && method === "DELETE") {
          const id = path.split("/")[2];
          const index = mockDb.activityLogs.findIndex(a => a.id === id);
          if (index !== -1) {
            mockDb.activityLogs.splice(index, 1);
            return resolve({ success: true } as unknown as T);
          }
          return reject(new Error("Activity log not found"));
        }

        // Generic 404
        return reject(new Error(`Endpoint mock not found: ${method} ${path}`));
      } catch (err) {
        return reject(err);
      }
    }, 400);
  });
}

// Helper function for uploading and parsing a PDF/DOCX file
export const apiUploadFile = async (path: string, file: File): Promise<{ text: string }> => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
    } catch (tokenErr) {
      console.warn("Could not retrieve supabase token for apiUploadFile", tokenErr);
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || "Failed to upload and parse file");
    }

    try {
      return text ? JSON.parse(text) : { text: "" };
    } catch {
      throw new Error("Invalid JSON response from server during file upload");
    }
  } catch (err) {
    console.error("Error in apiUploadFile:", err);
    throw err;
  }
};

