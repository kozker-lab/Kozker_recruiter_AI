import sys
import os
from supabase import create_client

SUPABASE_URL = "https://covhcpsyliesrgkjxhai.supabase.co"
SUPABASE_KEY = "sb_publishable_V69YOpwZKjrT1BT8k609nQ_MBzXV80b"

# Initialize Client
client = create_client(SUPABASE_URL, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.key")
client.supabase_key = SUPABASE_KEY
client.options.headers["apiKey"] = SUPABASE_KEY
client.options.headers["Authorization"] = f"Bearer {SUPABASE_KEY}"

def run_seeding(user_id):
    print(f"Starting database seeding for user ID: {user_id}...")
    
    # 1. Seed Clients
    clients = [
        {"id": "c1111111-1111-1111-1111-111111111111", "name": "Google", "created_by": user_id},
        {"id": "c2222222-2222-2222-2222-222222222222", "name": "Stripe", "created_by": user_id},
        {"id": "c3333333-3333-3333-3333-333333333333", "name": "Vercel", "created_by": user_id}
    ]
    for c in clients:
        try:
            client.table("clients").upsert(c).execute()
        except Exception as e:
            print(f"Error seeding client '{c['name']}': {e}")
    print("Clients seeded.")

    # 2. Seed Requirements
    requirements = [
        {
            "id": "e1111111-1111-1111-1111-111111111111",
            "client_id": "c1111111-1111-1111-1111-111111111111",
            "title": "Senior Frontend Engineer (Next.js & React)",
            "description": "We are looking for a Senior Frontend Engineer to build high-performance user interfaces for our Next-Gen Cloud Console. Experience with React, Tailwind CSS, Next.js, and TypeScript is mandatory. You will own client-side architecture and optimize page loading speeds.",
            "skills": ["React", "Next.js", "Tailwind CSS", "TypeScript", "Web Performance"],
            "experience_min": 5,
            "experience_max": 10,
            "budget_min": 15,
            "budget_max": 25,
            "seniority": "senior",
            "notes": "Focus on engineers who have optimized page performance and have built enterprise SaaS dashboards.",
            "num_posts_requested": 2,
            "status": "ready",
            "created_by": user_id
        },
        {
            "id": "e2222222-2222-2222-2222-222222222222",
            "client_id": "c2222222-2222-2222-2222-222222222222",
            "title": "Staff Systems Engineer (Rust)",
            "description": "Looking for a Staff Engineer to join our high-volume core payments ledger team. You will build distributed transactional services in Rust. Deep understanding of ACID, systems engineering, databases, and low-latency networking is required.",
            "skills": ["Rust", "Distributed Systems", "SQL", "Systems Programming"],
            "experience_min": 8,
            "experience_max": 15,
            "budget_min": 30,
            "budget_max": 45,
            "seniority": "lead",
            "notes": "Strict ledger requirements. Candidates must have experience scaling low-latency services.",
            "num_posts_requested": 1,
            "status": "ready",
            "created_by": user_id
        }
    ]
    for r in requirements:
        try:
            client.table("requirements").upsert(r).execute()
        except Exception as e:
            print(f"Error seeding requirement '{r['title']}': {e}")
    print("Requirements seeded.")

    # 3. Seed Job Openings
    job_openings = [
        {
            "id": "ab111111-1111-1111-1111-111111111111",
            "requirement_id": "e1111111-1111-1111-1111-111111111111",
            "post_index": 1,
            "title": "Senior UI/Frontend Developer - Cloud Platform",
            "description": "Google Cloud Platform (GCP) is seeking a Senior Frontend Developer to design and implement slick, high-density dashboard controls for GCP console. You will lead UI component designs, collaborate with backend specialists, and improve client-side performance.",
            "responsibilities": [
                "Design and build responsive UI dashboards for GCP Cloud Console using React and Next.js.",
                "Implement complex client-side state management systems with Redux or TanStack Query.",
                "Optimize web vital metrics focusing on LCP, FID, and CLS."
            ],
            "qualifications": [
                "5+ years of software development experience specializing in frontend architectures.",
                "Strong proficiency in modern JavaScript, TypeScript, and functional programming.",
                "Deep familiarity with Tailwind CSS, post-CSS frameworks, and styling optimization."
            ],
            "keywords": ["React", "Next.js", "TypeScript", "Performance", "GCP", "Tailwind CSS"],
            "salary_range": "₹18 - ₹24 LPA",
            "status": "published",
            "processing_status": "ready",
            "ai_generated": True,
            "approved_by": user_id
        },
        {
            "id": "ab222222-2222-2222-2222-222222222222",
            "requirement_id": "e1111111-1111-1111-1111-111111111111",
            "post_index": 2,
            "title": "Staff Web Architect - Cloud Console Core",
            "description": "Join the GCP Core UX team as a Staff Web Architect. You will shape the micro-frontend architectures governing hundreds of microservices. This role demands exceptional knowledge of module federation, browser caching, web security, and low-level bundler optimizations.",
            "responsibilities": [
                "Own the architectural blueprints for the GCP Core Micro-Frontend shell.",
                "Design modules using Webpack module federation and Rspack bundlers."
            ],
            "qualifications": [
                "8+ years of web engineering experience, with 2+ years leading framework architectures.",
                "Expertise in bundlers (Webpack, Vite, Turbopack) and performance auditing."
            ],
            "keywords": ["Module Federation", "Web Performance", "Bundling", "Next.js", "Architect"],
            "salary_range": "₹24 - ₹32 LPA",
            "status": "draft",
            "processing_status": "ready",
            "ai_generated": True,
            "approved_by": None
        },
        {
            "id": "ab333333-3333-3333-3333-333333333333",
            "requirement_id": "e2222222-2222-2222-2222-222222222222",
            "post_index": 1,
            "title": "Staff Systems Engineer - Distributed Transaction Ledger",
            "description": "Stripe is building high-availability ledger databases. We are looking for an expert Systems Engineer to architect low-latency services in Rust. You will develop software directly handling financial ledger entries, ensuring strict ACID properties and fault tolerance.",
            "responsibilities": [
                "Architect and implement Ledger storage engines in safe and concurrent Rust code.",
                "Build distributed consensus layer modules utilizing Raft protocol architectures."
            ],
            "qualifications": [
                "8+ years of systems engineering, with at least 3 years writing Rust in production.",
                "Strong understanding of relational databases, transactions, and ACID isolation levels."
            ],
            "keywords": ["Rust", "Consensus", "Ledger", "ACID", "Stripe", "Databases"],
            "salary_range": "₹35 - ₹50 LPA",
            "status": "confirmed",
            "processing_status": "idle",
            "ai_generated": True,
            "approved_by": user_id
        }
    ]
    for j in job_openings:
        try:
            client.table("job_openings").upsert(j).execute()
        except Exception as e:
            print(f"Error seeding job opening '{j['title']}': {e}")
    print("Job Openings seeded.")

    # 4. Seed Skills
    skills_data = [
        {"id": "b1111111-1111-1111-1111-111111111111", "job_opening_id": "ab111111-1111-1111-1111-111111111111", "skill_name": "React", "weight": 0.30, "skill_order": 1, "approved": True},
        {"id": "b2222222-2222-2222-2222-222222222222", "job_opening_id": "ab111111-1111-1111-1111-111111111111", "skill_name": "Next.js", "weight": 0.25, "skill_order": 2, "approved": True},
        {"id": "b3333333-3333-3333-3333-333333333333", "job_opening_id": "ab111111-1111-1111-1111-111111111111", "skill_name": "Tailwind CSS", "weight": 0.15, "skill_order": 3, "approved": True},
        {"id": "b4444444-4444-4444-4444-444444444444", "job_opening_id": "ab111111-1111-1111-1111-111111111111", "skill_name": "TypeScript", "weight": 0.15, "skill_order": 4, "approved": True},
        {"id": "b5555555-5555-5555-5555-555555555555", "job_opening_id": "ab111111-1111-1111-1111-111111111111", "skill_name": "Web Performance", "weight": 0.15, "skill_order": 5, "approved": True}
    ]
    
    try:
        client.table("job_opening_skills").upsert({
            "job_opening_id": "ab111111-1111-1111-1111-111111111111",
            "skills": skills_data
        }, on_conflict="job_opening_id").execute()
    except Exception as e:
        print(f"Error seeding skills: {e}")
    print("Skills seeded.")

    # 5. Seed Candidates
    candidates = [
        {
            "id": "ca111111-1111-1111-1111-111111111111",
            "full_name": "Rohan Sharma",
            "email": "rohan.sharma@example.com",
            "phone": "+91 98765 43210",
            "skills": ["React", "Next.js", "TypeScript", "Tailwind CSS", "Redux", "Node.js"],
            "experience_years": 6,
            "current_company": "Flipkart",
            "resume_url": "resumes/cand-1/rohan_sharma_resume.pdf",
            "parsed_resume_json": {"summary": "Senior UI Developer with experience in Next.js transitions and UI optimization."},
            "education": "Bachelor's in Computer Science",
            "working_or_not": True,
            "academic_details": "Bachelor of Technology in Computer Science and Engineering, IIT Delhi (2016-2020) - CGPA: 8.9/10. Key coursework: Data Structures, Advanced Algorithms, Web Engineering.",
            "achievements": "Winner of Smart India Hackathon (2019) for constructing an optimized logistics tracking system. Published a research paper on responsive UI rendering algorithms.",
            "source": "pdf",
            "uploaded_by": user_id
        },
        {
            "id": "ca222222-2222-2222-2222-222222222222",
            "full_name": "Priya Patel",
            "email": "priya.patel@example.com",
            "phone": "+91 91234 56789",
            "skills": ["React", "JavaScript", "HTML", "CSS", "Webpack", "Vite", "GraphQL"],
            "experience_years": 5,
            "current_company": "TCS",
            "resume_url": "resumes/cand-2/priya_patel_cv.docx",
            "parsed_resume_json": {"summary": "Frontend Developer with standard CSS grids and React render loop knowledge."},
            "education": "Bachelor's in Information Technology",
            "working_or_not": False,
            "academic_details": "Bachelor of Science in Information Technology, Mumbai University (2017-2020) - GPA: 3.8/4.0. Completed Advanced Frontend Specialization Certification.",
            "achievements": "Recognized as 'Best Performer of the Quarter' twice at TCS for UI modularization projects. Open-source contributor to React-based routing utilities.",
            "source": "docx",
            "uploaded_by": user_id
        },
        {
            "id": "ca333333-3333-3333-3333-333333333333",
            "full_name": "Siddharth Verma",
            "email": "sid.verma@example.com",
            "phone": "+91 99887 76655",
            "skills": ["Rust", "Distributed Systems", "PostgreSQL", "C++", "Docker"],
            "experience_years": 9,
            "current_company": "Razorpay",
            "resume_url": "resumes/cand-3/sid_verma_ledger.pdf",
            "parsed_resume_json": {"summary": "Systems Developer specializing in ledger design and Rust databases."},
            "education": "Master's in Software Engineering",
            "working_or_not": True,
            "academic_details": "Master of Science in Software Systems, BITS Pilani (2013-2015) - CGPA: 9.2/10. Thesis focused on Distributed Transaction Isolation Levels.",
            "achievements": "Designed Swiggy's high-concurrency ledger backend scaling to 15,000 QPS. Optimized transaction consensus loops, saving 20% in infrastructure cloud costs.",
            "source": "pdf",
            "uploaded_by": user_id
        }
    ]
    for cand in candidates:
        try:
            client.table("candidates").upsert(cand).execute()
        except Exception as e:
            print(f"Error seeding candidate '{cand['full_name']}': {e}")
    print("Candidates seeded.")

    # 6. Seed Applications
    applications = [
        {
            "id": "ad111111-1111-1111-1111-111111111111",
            "candidate_id": "ca111111-1111-1111-1111-111111111111",
            "job_opening_id": "ab111111-1111-1111-1111-111111111111",
            "candidate_cv": "resumes/cand-1/rohan_sharma_resume.pdf",
            "fuzzy_score": 94.5,
            "match_score": 95,
            "match_reason": "Exceptional background in React, Next.js, and TypeScript. Experience migrating critical checkout systems matching top skills. High performance awareness.",
            "strengths": ["Strong Next.js expertise", "Mentorship experience", "Performance optimization success"],
            "skill_gaps": ["No direct GCP console experience"],
            "screening_status": "accepted",
            "stage": "technical",
            "stage_status": "in_progress",
            "stage_notes": "Technical interview scheduled for Thursday. Impressive resume.",
            "priority": 1,
            "reviewed_by": user_id
        },
        {
            "id": "ad222222-2222-2222-2222-222222222222",
            "candidate_id": "ca222222-2222-2222-2222-222222222222",
            "job_opening_id": "ab111111-1111-1111-1111-111111111111",
            "candidate_cv": "resumes/cand-2/priya_patel_cv.docx",
            "fuzzy_score": 72.0,
            "match_score": 72,
            "match_reason": "Strong HTML/CSS/React roots. Missing TypeScript and Next.js experience, which are core framework dependencies for this role.",
            "strengths": ["Clean CSS skills", "Core React rendering competency", "Detail-oriented"],
            "skill_gaps": ["No Next.js experience", "No TypeScript experience"],
            "screening_status": "accepted",
            "stage": "screening",
            "stage_status": "passed",
            "stage_notes": "Initial recruiter screen cleared. Moving to tech evaluation.",
            "priority": 0,
            "reviewed_by": user_id
        },
        {
            "id": "ad333333-3333-3333-3333-333333333333",
            "candidate_id": "ca111111-1111-1111-1111-111111111111",
            "job_opening_id": "ab222222-2222-2222-2222-222222222222",
            "candidate_cv": "resumes/cand-1/rohan_sharma_resume.pdf",
            "fuzzy_score": 88.0,
            "match_score": 88,
            "match_reason": "Very strong technical architectural alignment. Handled Flipkart check-out transition matching console microservices goals. Needs checking on module federation.",
            "strengths": ["Check-out migraton leader", "Strong framework foundations"],
            "skill_gaps": ["No explicit Module Federation experience listed"],
            "screening_status": "pending",
            "stage": "screening",
            "stage_status": "in_progress",
            "stage_notes": "Under consideration for core micro-frontend architect options.",
            "priority": 0,
            "reviewed_by": user_id
        }
    ]
    for app in applications:
        try:
            client.table("applications").upsert(app).execute()
        except Exception as e:
            print(f"Error seeding application '{app['id']}': {e}")
    print("Applications seeded.")

    # 7. Seed Job Candidates (Rankings)
    job_candidates = [
        {
            "id": "dc111111-1111-1111-1111-111111111111",
            "job_opening_id": "ab111111-1111-1111-1111-111111111111",
            "candidate_id": "ca111111-1111-1111-1111-111111111111",
            "application_id": "ad111111-1111-1111-1111-111111111111",
            "fuzzy_score": 94.5,
            "rank_order": 1,
            "strengths": ["Strong Next.js expertise", "Performance optimization success"],
            "skill_gaps": ["No direct GCP console experience"],
            "ai_reasoning": "Matches 95% of core requirements including Next.js and performance tuning.",
            "status": "accepted"
        },
        {
            "id": "dc222222-2222-2222-2222-222222222222",
            "job_opening_id": "ab111111-1111-1111-1111-111111111111",
            "candidate_id": "ca222222-2222-2222-2222-222222222222",
            "application_id": "ad222222-2222-2222-2222-222222222222",
            "fuzzy_score": 72.0,
            "rank_order": 2,
            "strengths": ["Core React rendering competency"],
            "skill_gaps": ["No Next.js experience", "No TypeScript experience"],
            "ai_reasoning": "React foundations are strong but lack of Next.js/TypeScript limits scoring.",
            "status": "pending"
        }
    ]
    for jc in job_candidates:
        try:
            client.table("job_candidates").upsert(jc).execute()
        except Exception as e:
            print(f"Error seeding job candidate '{jc['id']}': {e}")
    print("Job Candidates seeded.")

    # 8. Seed Screening Questions
    questions = [
        {
            "id": "f1111111-1111-1111-1111-111111111111",
            "application_id": "ad111111-1111-1111-1111-111111111111",
            "job_candidate_id": "dc111111-1111-1111-1111-111111111111",
            "requirement_id": "e1111111-1111-1111-1111-111111111111",
            "job_opening_id": "ab111111-1111-1111-1111-111111111111",
            "question": "In your Flipkart experience, how did you manage the checkout state during the Next.js App Router transition? Explain your strategy for caching server component inputs.",
            "difficulty": "hard",
            "question_order": 1,
            "ai_generated": True
        },
        {
            "id": "f2222222-2222-2222-2222-222222222222",
            "application_id": "ad111111-1111-1111-1111-111111111111",
            "job_candidate_id": "dc111111-1111-1111-1111-111111111111",
            "requirement_id": "e1111111-1111-1111-1111-111111111111",
            "job_opening_id": "ab111111-1111-1111-1111-111111111111",
            "question": "What performance metrics did you focus on when improving Flipkart's page load speed, and what tools did you use to measure LCP?",
            "difficulty": "medium",
            "question_order": 2,
            "ai_generated": True
        },
        {
            "id": "f3333333-3333-3333-3333-333333333333",
            "application_id": "ad111111-1111-1111-1111-111111111111",
            "job_candidate_id": "dc111111-1111-1111-1111-111111111111",
            "requirement_id": "e1111111-1111-1111-1111-111111111111",
            "job_opening_id": "ab111111-1111-1111-1111-111111111111",
            "question": "Explain the differences between Server Actions and API Route handlers in Next.js 14.",
            "difficulty": "easy",
            "question_order": 3,
            "ai_generated": True
        }
    ]
    for q in questions:
        try:
            client.table("screening_questions").upsert(q).execute()
        except Exception as e:
            print(f"Error seeding question '{q['id']}': {e}")
    print("Questions seeded.")

    # 9. Seed Interview Stages
    stages = [
        {
            "id": "de111111-1111-1111-1111-111111111111",
            "application_id": "ad111111-1111-1111-1111-111111111111",
            "job_candidate_id": "dc111111-1111-1111-1111-111111111111",
            "stage_name": "screening",
            "stage_order": 1,
            "status": "completed",
            "outcome": "passed",
            "notes": "Polite candidate, fits salary parameters.",
            "updated_by": user_id
        },
        {
            "id": "de222222-2222-2222-2222-222222222222",
            "application_id": "ad111111-1111-1111-1111-111111111111",
            "job_candidate_id": "dc111111-1111-1111-1111-111111111111",
            "stage_name": "technical",
            "stage_order": 2,
            "status": "scheduled",
            "outcome": "pending",
            "notes": "Assigned interviewer: Senior Staff GCP console Lead.",
            "updated_by": user_id
        }
    ]
    for stg in stages:
        try:
            client.table("interview_stages").upsert(stg).execute()
        except Exception as e:
            print(f"Error seeding interview stage '{stg['id']}': {e}")
    print("Interview Stages seeded.")

    # 10. Seed Activity Logs
    logs = [
        {
            "id": "df111111-1111-1111-1111-111111111111", 
            "actor_id": user_id, 
            "actor_name": "Alex Mercer", 
            "action": "job_created", 
            "entity_type": "job_openings", 
            "entity_id": "ab111111-1111-1111-1111-111111111111", 
            "metadata": {"job_title": "Senior UI/Frontend Developer - Cloud Platform", "requirement_title": "Senior Frontend Engineer"}
        },
        {
            "id": "df222222-2222-2222-2222-222222222222", 
            "actor_id": user_id, 
            "actor_name": "Alex Mercer", 
            "action": "candidate_uploaded", 
            "entity_type": "candidates", 
            "entity_id": "ca111111-1111-1111-1111-111111111111", 
            "metadata": {"candidate_name": "Rohan Sharma", "job_title": "Senior UI/Frontend Developer - Cloud Platform"}
        },
        {
            "id": "df333333-3333-3333-3333-333333333333", 
            "actor_id": user_id, 
            "actor_name": "Alex Mercer", 
            "action": "candidate_ranked", 
            "entity_type": "applications", 
            "entity_id": "ad111111-1111-1111-1111-111111111111", 
            "metadata": {"candidate_name": "Rohan Sharma", "fuzzy_score": 94.5}
        }
    ]
    for l in logs:
        try:
            client.table("activity_log").upsert(l).execute()
        except Exception as e:
            print(f"Error seeding activity log '{l['id']}': {e}")
    print("Activity Logs seeded.")
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    passed_id = None
    if len(sys.argv) > 1:
        passed_id = sys.argv[1].strip()
        
    if not passed_id:
        # Try to auto-detect from profiles table
        try:
            res = client.table("profiles").select("id, email").execute()
            if res.data:
                # Use the first user found in profiles
                passed_id = res.data[0]["id"]
                print(f"Auto-detected user profile: {res.data[0]['email']} (ID: {passed_id})")
        except Exception as e:
            print(f"Failed to scan profiles: {e}")
            
    if not passed_id:
        print("ERROR: No user profile found in database and no User ID provided as argument.")
        print("Please sign up / log in inside the browser first to create your profile, or run this script with your User UUID as a parameter:")
        print("python3 supabase/seed_user.py <YOUR_USER_UUID>")
        sys.exit(1)
        
    run_seeding(passed_id)
