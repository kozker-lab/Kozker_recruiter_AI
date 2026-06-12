# Kozker Recruiter AI - n8n Webhook & Callback Integration Specifications

This document outlines the authentication, callback endpoint URLs, and JSON payload formats used for delegating AI/LLM operations to n8n asynchronously.

---

## 1. FastAPI Callback Endpoints
All inbound callback URLs require the following header for authentication:
* **Header**: `Authorization: Bearer <CALLBACK_SECRET>` (e.g. `Bearer kozker_callback_secret_token`)

| Event / Workflow Completed | HTTP Method | Endpoint URL Path |
| :--- | :--- | :--- |
| **Job Openings Generation** | `POST` | `/api/v1/callbacks/job-openings` |
| **Skill Extraction** | `POST` | `/api/v1/callbacks/job-skills` |
| **Candidate Matching** | `POST` | `/api/v1/callbacks/candidate-matches` |
| **Screening Questions** | `POST` | `/api/v1/callbacks/screening-questions` |

---

## 2. JSON Payload Formats

### A. Outbound Webhooks (FastAPI ➡️ n8n)

#### 1. Job openings generation (`N8N_GENERATE_JOBS_URL`)
```json
{
  "id": "e1111111-1111-1111-1111-111111111111",
  "client_id": "c1111111-1111-1111-1111-111111111111",
  "title": "Senior Frontend Engineer (Next.js & React)",
  "description": "We are looking for a Senior Frontend Engineer...",
  "skills": ["React", "Next.js", "TypeScript"],
  "experience_min": 5,
  "experience_max": 10,
  "budget_min": 15.0,
  "budget_max": 25.0,
  "seniority": "senior",
  "notes": "Focus on page load optimizations.",
  "num_posts_requested": 2,
  "created_by": "f3dcea71-25c3-431b-8f51-7f8699421cfd"
}
```

#### 2. Skills extraction (`N8N_EXTRACT_SKILLS_URL`)
```json
{
  "job_opening_id": "ab111111-1111-1111-1111-111111111111",
  "title": "Senior UI/Frontend Developer - Cloud Platform",
  "description": "Google Cloud Platform is seeking a Senior Frontend...",
  "responsibilities": ["Design and build responsive UI dashboards...", "Optimize web vitals..."],
  "qualifications": ["5+ years of software development experience...", "Proficiency in modern JS..."],
  "keywords": ["React", "Next.js", "TypeScript", "Performance"],
  "salary_range": "₹18 - ₹24 LPA"
}
```

#### 3. Candidate matching (`N8N_MATCH_CANDIDATES_URL`)
```json
{
  "job_opening_id": "ab111111-1111-1111-1111-111111111111",
  "approved_skills": [
    { "skill_name": "React", "weight": 40.0 },
    { "skill_name": "Next.js", "weight": 30.0 }
  ],
  "candidates": [
    {
      "id": "ca111111-1111-1111-1111-111111111111",
      "full_name": "Rohan Sharma",
      "email": "rohan.sharma@example.com",
      "phone": "+91 98765 43210",
      "skills": ["React", "Next.js", "TypeScript", "Redux"],
      "experience_years": 6,
      "current_company": "Flipkart",
      "resume_url": "resumes/cand-1/rohan_sharma_resume.pdf",
      "parsed_resume_json": {},
      "education": "Bachelor's in Computer Science",
      "working_or_not": true,
      "academic_details": "IIT Delhi...",
      "achievements": "Winner of Hackathon...",
      "source": "pdf",
      "uploaded_by": "f3dcea71-25c3-431b-8f51-7f8699421cfd",
      "applications_history": [
        {
          "id": "ad222222-2222-2222-2222-222222222222",
          "job_opening_id": "ab222222-2222-2222-2222-222222222222",
          "fuzzy_score": 88.0,
          "match_score": 88,
          "screening_status": "pending",
          "stage": "screening",
          "stage_status": "in_progress",
          "stages": [
            {
              "stage_name": "screening",
              "status": "completed",
              "outcome": "passed",
              "notes": "Excellent candidate."
            }
          ]
        }
      ]
    }
  ]
}
```

#### 4. Screening question generation (`N8N_GENERATE_QUESTIONS_URL`)
```json
{
  "application_id": "ad111111-1111-1111-1111-111111111111",
  "candidate": {
    "id": "ca111111-1111-1111-1111-111111111111",
    "full_name": "Rohan Sharma",
    "email": "rohan.sharma@example.com",
    "skills": ["React", "Next.js", "TypeScript"],
    "experience_years": 6,
    "raw_text": "Experienced Senior UI developer..."
  },
  "job_details": {
    "id": "ab111111-1111-1111-1111-111111111111",
    "title": "Senior UI/Frontend Developer",
    "description": "We are seeking a developer...",
    "responsibilities": ["Build Next.js web application..."],
    "qualifications": ["5+ years experience..."],
    "keywords": ["React", "Next.js"]
  },
  "requirement_details": {
    "id": "e1111111-1111-1111-1111-111111111111",
    "title": "Senior Frontend Engineer",
    "description": "We are looking for...",
    "skills": ["React", "Next.js"],
    "experience_min": 5,
    "experience_max": 10,
    "seniority": "senior"
  }
}
```

---

### B. Inbound Callbacks (n8n ➡️ FastAPI)

#### 1. Job Openings Completed (`POST /api/v1/callbacks/job-openings`)
```json
{
  "requirement_id": "e1111111-1111-1111-1111-111111111111",
  "job_openings": [
    {
      "title": "Senior Frontend Developer",
      "overview": "Exciting role to build cloud platform dashboards...",
      "responsibilities": ["Lead dashboard UI component design", "Optimize core web vitals"],
      "qualifications": ["5+ years experience with React", "Expertise in Next.js & TS"],
      "budget": "₹18 - ₹24 LPA",
      "seniority": "senior",
      "keywords": ["React", "Next.js", "TypeScript", "Performance"]
    }
  ]
}
```

#### 2. Skill Extraction Completed (`POST /api/v1/callbacks/job-skills`)
```json
{
  "job_opening_id": "ab111111-1111-1111-1111-111111111111",
  "skills": [
    { "name": "React", "weight": 30.0, "category": "Frontend" },
    { "name": "Next.js", "weight": 25.0, "category": "Frontend" },
    { "name": "TypeScript", "weight": 20.0, "category": "Languages" },
    { "name": "Tailwind CSS", "weight": 15.0, "category": "Styling" },
    { "name": "Web Performance", "weight": 10.0, "category": "Optimization" }
  ]
}
```

#### 3. Candidate Matching Completed (`POST /api/v1/callbacks/candidate-matches`)
```json
{
  "job_opening_id": "ab111111-1111-1111-1111-111111111111",
  "matches": [
    {
      "candidate_id": "ca111111-1111-1111-1111-111111111111",
      "fuzzy_score": 94.5,
      "strengths": ["Strong Next.js expertise", "Performance tuning experience"],
      "skill_gaps": ["No direct GCP Console experience"],
      "reasoning": "Fits 95% of job requirements with excellent experience at Flipkart."
    }
  ]
}
```

#### 4. Screening Questions Completed (`POST /api/v1/callbacks/screening-questions`)
```json
{
  "application_id": "ad111111-1111-1111-1111-111111111111",
  "questions": [
    {
      "question": "Can you explain your strategy for managing state using Next.js App Router server components?",
      "difficulty": "hard",
      "category": "Next.js"
    },
    {
      "question": "What metrics do you measure to diagnose rendering bottlenecks in React?",
      "difficulty": "medium",
      "category": "React"
    }
  ]
}
```
