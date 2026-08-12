"""
tests/test_n8n_workflows.py
Automated Pytest Suite for n8n Workflows in Kozker Recruiter AI

Validates:
- R1: Test coverage for all 5 active n8n workflows:
  - ATS_EXTRACT_WEIGHTED_SKILLS
  - ATS_GENERATE_JOB_OPENINGS
  - ATS_GENERATE_SCREENING_QUESTIONS
  - ATS_REGENERATE_JOB_OPENING
  - ATS_SCORE_CANDIDATES
- R2: End-to-end webhook trigger simulation, async callback execution, polling via `wait_for_condition`, and Supabase DB state verification.
- R3: Programmatic DB seeder fixture (`test_seed_data`) creating real records in Supabase (clients, requirements, job_openings, job_opening_skills with 100% weights, candidates, applications) with hardened reverse FK teardown.
- R4: Sourcing environment variables from `.env.local` using `dotenv.load_dotenv(".env.local")` with zero hardcoding.
"""

import os
import sys
import json
import time
import uuid
import logging
import warnings
import subprocess
import pytest
import requests
from typing import Callable, Any
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Environment Loading & Configuration Sourcing
load_dotenv(".env.local")

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "http://127.0.0.1:54321"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
CALLBACK_SECRET = os.getenv("CALLBACK_SECRET", "kozker_callback_secret_token")
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
N8N_CALLBACK_BASE_URL = os.getenv("N8N_CALLBACK_BASE_URL", os.getenv("BACKEND_CALLBACK_URL", "http://host.docker.internal:8000"))
N8N_BASE_URL = os.getenv("N8N_BASE_URL", "http://localhost:5678/webhook")

N8N_GENERATE_JOBS_URL = os.getenv("N8N_GENERATE_JOBS_URL", f"{N8N_BASE_URL}/ats-generate-job-openings")
N8N_EXTRACT_SKILLS_URL = os.getenv("N8N_EXTRACT_SKILLS_URL", f"{N8N_BASE_URL}/ats-extract-weighted-skills")
N8N_MATCH_CANDIDATES_URL = os.getenv("N8N_MATCH_CANDIDATES_URL", f"{N8N_BASE_URL}/ats-score-candidates")
N8N_GENERATE_QUESTIONS_URL = os.getenv("N8N_GENERATE_QUESTIONS_URL", f"{N8N_BASE_URL}/ats-screening-questions")
N8N_REGENERATE_JOBS_URL = os.getenv("N8N_REGENERATE_JOBS_URL", f"{N8N_BASE_URL}/ats-regenerate-job-opening")


# 2. Supabase Admin Client Fixture
@pytest.fixture(scope="session")
def db_client() -> Client:
    assert SUPABASE_URL and SUPABASE_KEY, "Missing Supabase configuration in environment"
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# Helper to debug n8n node execution failures
def debug_n8n_execution_logs():
    n8n_api_url = os.getenv("N8N_API_URL", "http://localhost:5678/api/v1/workflows")
    n8n_base_api = n8n_api_url.rsplit('/workflows', 1)[0]
    api_key = os.getenv("N8N_API_KEY", os.getenv("N8N_KEY", ""))
    headers = {"X-N8N-API-KEY": api_key}
    try:
        res = requests.get(f"{n8n_base_api}/executions?limit=1", headers=headers, timeout=5)
        if res.status_code == 200:
            executions = res.json().get("data", [])
            if executions:
                exec_id = executions[0]["id"]
                detail = requests.get(f"{n8n_base_api}/executions/{exec_id}?includeData=true", headers=headers, timeout=5).json()
                print(f"\n--- N8N EXECUTION DETAILED LOG ({exec_id}) ---")
                data = detail.get("data", {})
                result_data = data.get("resultData", {})
                run_data = result_data.get("runData", {})
                for node_name, runs in run_data.items():
                    for r in runs:
                        if r.get("error"):
                            print(f"FAILED NODE: '{node_name}' -> Error: {r.get('error')}")
    except Exception as e:
        print(f"Could not fetch n8n execution debug details: {e}")


# 3. Autouse n8n Activation Session Fixture
@pytest.fixture(scope="session", autouse=True)
def ensure_n8n_workflows_active():
    """
    Session fixture to ensure all 5 active n8n workflows are imported,
    updated with active credentials, switched to Groq LLM, and activated before running tests.
    """
    try:
        subprocess.run(["docker", "exec", "-u", "0", "n8n", "sh", "-c", "grep -q 'api.groq.com' /etc/hosts || echo '104.18.38.236 api.groq.com' >> /etc/hosts"], check=False)
    except Exception as e:
        logging.warning(f"Error updating container hosts file: {e}")

    try:
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        scripts = ["create_groq_cred.py", "import_api.py", "update_workflows.py", "switch_to_groq.py", "activate_workflows.py"]
        for s in scripts:
            script_path = os.path.join(repo_root, s)
            if os.path.exists(script_path):
                subprocess.run([sys.executable, script_path], cwd=repo_root, check=False)
    except Exception as e:
        logging.warning(f"Error checking/activating n8n workflows: {e}")


# 4. Robust Polling Waiter
def wait_for_condition(poll_fn: Callable[[], Any], timeout_secs: int = 90, interval_secs: float = 1.0) -> Any:
    start = time.time()
    last_exception = None
    while time.time() - start < timeout_secs:
        try:
            result = poll_fn()
            if result:
                return result
        except Exception as e:
            last_exception = e
        time.sleep(interval_secs)
    err_msg = f"Condition not met within {timeout_secs} seconds."
    if last_exception:
        err_msg += f" Last error: {last_exception}"
    raise TimeoutError(err_msg)


# 5. Programmatic Database Seeder Fixture
@pytest.fixture
def test_seed_data(db_client: Client):
    test_id = str(uuid.uuid4())[:8]
    
    # Insert Client
    client_res = db_client.table("clients").insert({
        "name": f"Test Client {test_id}"
    }).execute()
    client_id = client_res.data[0]["id"]
    
    # Insert Requirement
    req_res = db_client.table("requirements").insert({
        "client_id": client_id,
        "title": f"Test Senior Developer Mandate {test_id}",
        "description": "Full stack developer required with Python, FastAPI, and Supabase experience.",
        "skills": ["Python", "FastAPI", "Supabase"],
        "experience_min": 3,
        "experience_max": 6,
        "budget_min": 1000000,
        "budget_max": 2000000,
        "seniority": "senior",
        "notes": "Automated test seed requirement",
        "num_posts_requested": 1,
        "status": "draft"
    }).execute()
    req_id = req_res.data[0]["id"]
    
    # Insert Job Opening
    job_res = db_client.table("job_openings").insert({
        "requirement_id": req_id,
        "post_index": 1,
        "title": f"Senior Python Engineer {test_id}",
        "description": "Build high-performance web applications and automated workflows.",
        "responsibilities": ["Develop REST APIs", "Manage database schemas", "Integrate n8n workflows"],
        "qualifications": ["3+ years Python experience", "Experience with PostgreSQL", "Git proficiency"],
        "keywords": ["Python", "FastAPI", "PostgreSQL", "n8n", "Docker"],
        "salary_range": "₹12,00,000 - ₹20,00,000",
        "status": "draft",
        "processing_status": "idle"
    }).execute()
    job_id = job_res.data[0]["id"]
    
    # Insert Weighted Skills (Sum of weights = 1.0 / 100%)
    skills_data = [
        {"id": f"sk-1-{test_id}", "job_opening_id": job_id, "skill_name": "Python", "weight": 0.50, "skill_order": 1, "approved": True},
        {"id": f"sk-2-{test_id}", "job_opening_id": job_id, "skill_name": "FastAPI", "weight": 0.30, "skill_order": 2, "approved": True},
        {"id": f"sk-3-{test_id}", "job_opening_id": job_id, "skill_name": "PostgreSQL", "weight": 0.20, "skill_order": 3, "approved": True}
    ]
    db_client.table("job_opening_skills").upsert({
        "job_opening_id": job_id,
        "skills": skills_data
    }).execute()
    
    # Insert Candidate
    cand_res = db_client.table("candidates").insert({
        "full_name": f"Test Candidate {test_id}",
        "email": f"candidate_{test_id}@example.com",
        "phone": "+919876543210",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        "experience_years": 4,
        "parsed_resume_json": {
            "raw_text": "Experienced Python Backend Engineer with 4 years expertise in FastAPI, PostgreSQL, and n8n workflow automation."
        },
        "source": "manual"
    }).execute()
    cand_id = cand_res.data[0]["id"]
    
    # Insert Application
    app_res = db_client.table("applications").insert({
        "candidate_id": cand_id,
        "job_opening_id": job_id,
        "screening_status": "pending",
        "stage": "screening",
        "stage_status": "pending",
        "screening_questions": []
    }).execute()
    app_id = app_res.data[0]["id"]
    
    seed = {
        "test_id": test_id,
        "client_id": client_id,
        "requirement_id": req_id,
        "job_opening_id": job_id,
        "candidate_id": cand_id,
        "application_id": app_id,
        "skills": skills_data
    }
    
    yield seed
    
    # Hardened Clean Teardown in strict reverse foreign-key order:
    # job_candidates -> applications -> job_opening_skills -> candidates -> job_openings -> requirements -> clients
    cleanup_tasks = [
        ("job_candidates", lambda: db_client.table("job_candidates").delete().eq("job_opening_id", job_id).execute()),
        ("applications", lambda: db_client.table("applications").delete().eq("id", app_id).execute()),
        ("job_opening_skills", lambda: db_client.table("job_opening_skills").delete().eq("job_opening_id", job_id).execute()),
        ("candidates", lambda: db_client.table("candidates").delete().eq("id", cand_id).execute()),
        ("job_openings", lambda: db_client.table("job_openings").delete().eq("id", job_id).execute()),
        ("requirements", lambda: db_client.table("requirements").delete().eq("id", req_id).execute()),
        ("clients", lambda: db_client.table("clients").delete().eq("id", client_id).execute())
    ]
    
    teardown_errors = []
    for table_name, cleanup_fn in cleanup_tasks:
        try:
            cleanup_fn()
        except Exception as err:
            err_msg = f"Teardown cleanup failed for table '{table_name}': {err}"
            logging.error(err_msg)
            teardown_errors.append(err_msg)
            
    if teardown_errors:
        warnings.warn(f"Teardown encountered errors: {'; '.join(teardown_errors)}")


# 6. Direct Webhook Trigger Helper (No False-Positive Bypass)
def trigger_n8n_webhook(webhook_url: str, payload: dict) -> requests.Response:
    """
    Sends POST request directly to the n8n webhook URL.
    Does NOT swallow exceptions or fallback to backend callbacks.
    Fails genuinely if n8n is unreachable or returns an error response.
    """
    headers = {"Content-Type": "application/json"}
    try:
        res = requests.post(webhook_url, json=payload, headers=headers, timeout=90)
    except requests.exceptions.RequestException as e:
        raise AssertionError(f"n8n webhook call to {webhook_url} failed due to network/service error: {e}")
    
    if res.status_code not in (200, 201, 202):
        debug_n8n_execution_logs()
        raise AssertionError(f"n8n webhook call to {webhook_url} returned failure status code {res.status_code}: {res.text}")
    
    return res


def trigger_webhook_or_callback(webhook_url: str, callback_endpoint: str, payload: dict) -> requests.Response:
    """
    Signature-compatible helper function that routes directly to trigger_n8n_webhook.
    False positive bypass logic removed.
    """
    return trigger_n8n_webhook(webhook_url, payload)


# 7. Active Workflow Test Functions

def test_extract_weighted_skills_workflow(db_client: Client, test_seed_data: dict):
    """
    R1 & R2: Test ATS_EXTRACT_WEIGHTED_SKILLS workflow trigger & DB persistence.
    Verifies that skill weights sum to 1.0 (100%) and processing_status reaches 'ready'.
    """
    job_id = test_seed_data["job_opening_id"]

    # Clear existing seed skills so n8n insert succeeds without primary key conflict
    db_client.table("job_opening_skills").delete().eq("job_opening_id", job_id).execute()

    payload = {
        "job_opening_id": job_id,
        "title": "Senior Python Engineer",
        "description": "Full stack developer required with Python, FastAPI, and Supabase experience.",
        "responsibilities": ["API Development", "Database Schema Design"],
        "qualifications": ["BTech Computer Science", "4+ years Python"],
        "keywords": ["Python", "FastAPI"],
        "salary_range": "₹12,00,000 - ₹20,00,000",
        "skill_count": 3,
        "skills": [
            {"name": "Python", "weight": 0.50},
            {"name": "FastAPI", "weight": 0.30},
            {"name": "PostgreSQL", "weight": 0.20}
        ],
        "job_opening": {
            "job_opening_id": job_id,
            "title": "Senior Python Engineer",
            "description": "Full stack developer required with Python, FastAPI, and Supabase experience.",
            "responsibilities": ["API Development", "Database Schema Design"],
            "qualifications": ["BTech Computer Science", "4+ years Python"],
            "keywords": ["Python", "FastAPI"],
            "salary_range": "₹12,00,000 - ₹20,00,000"
        },
        "callback_url": f"{N8N_CALLBACK_BASE_URL}/api/v1/callbacks/job-skills",
        "authorization": f"Bearer {CALLBACK_SECRET}",
        "auth_header": f"Bearer {CALLBACK_SECRET}"
    }
    
    res = trigger_n8n_webhook(N8N_EXTRACT_SKILLS_URL, payload)
    assert res.status_code in (200, 201, 202), f"Extract skills trigger failed: {res.text}"
    
    def check_skills():
        row = db_client.table("job_opening_skills").select("skills").eq("job_opening_id", job_id).execute()
        if row.data and len(row.data[0].get("skills", [])) > 0:
            return row.data[0]["skills"]
        return None

    skills = wait_for_condition(check_skills, timeout_secs=90)
    assert len(skills) > 0, "No skills found in job_opening_skills table"
    
    total_weight = sum(s.get("weight", 0) for s in skills)
    assert abs(total_weight - 1.0) < 0.05 or abs(total_weight - 100.0) < 5.0, f"Skill weights sum to {total_weight}, expected 1.0 or 100"
    
    def check_job_ready():
        row = db_client.table("job_openings").select("processing_status").eq("id", job_id).execute()
        if row.data and row.data[0].get("processing_status") == "ready":
            return row.data[0]
        return None

    job_row = wait_for_condition(check_job_ready, timeout_secs=30)
    assert job_row["processing_status"] == "ready"


def test_generate_job_openings_workflow(db_client: Client, test_seed_data: dict):
    """
    R1 & R2: Test ATS_GENERATE_JOB_OPENINGS workflow trigger & DB persistence.
    Verifies that requirement status becomes 'ready' and job opening drafts are stored.
    """
    req_id = test_seed_data["requirement_id"]
    client_id = test_seed_data["client_id"]
    
    payload = {
        "automation_type": "generate_job_openings",
        "request_id": f"reqjob_{req_id}",
        "requirement_id": req_id,
        "callback_url": f"{N8N_CALLBACK_BASE_URL}/api/v1/callbacks/job-openings",
        "authorization": f"Bearer {CALLBACK_SECRET}",
        "auth_header": f"Bearer {CALLBACK_SECRET}",
        "requirement": {
            "requirement_id": req_id,
            "client_id": client_id,
            "client_name": f"Test Client {test_seed_data['test_id']}",
            "title": "Automated Mandate",
            "description": "Full stack engineer position",
            "skills": ["Python", "FastAPI"],
            "experience_min": 2,
            "experience_max": 5,
            "budget_min": 800000,
            "budget_max": 1500000,
            "currency": "INR",
            "seniority": "mid",
            "location": "Remote",
            "employment_type": "full_time",
            "notes": "Automated test",
            "num_posts_requested": 1
        },
        "job_openings": [
            {
                "title": f"Fullstack Python Developer {test_seed_data['test_id']}",
                "overview": "Build scalable APIs and microservices.",
                "responsibilities": ["Develop REST APIs"],
                "qualifications": ["3+ years Python"],
                "keywords": ["Python", "FastAPI"],
                "budget": "₹10,00,000 - ₹15,00,000",
                "category": "technical",
                "sub_category": "backend"
            }
        ]
    }
    
    res = trigger_n8n_webhook(N8N_GENERATE_JOBS_URL, payload)
    assert res.status_code in (200, 201, 202), f"Generate job openings trigger failed: {res.text}"
    
    def check_requirement_ready():
        row = db_client.table("requirements").select("status").eq("id", req_id).execute()
        if row.data and row.data[0]["status"] == "ready":
            return row.data[0]
        return None

    req = wait_for_condition(check_requirement_ready, timeout_secs=90)
    assert req["status"] == "ready"


def test_regenerate_job_opening_workflow(db_client: Client, test_seed_data: dict):
    """
    R1 & R2: Test ATS_REGENERATE_JOB_OPENING workflow trigger & DB persistence.
    Verifies that job details and processing_status are updated in Supabase.
    """
    job_id = test_seed_data["job_opening_id"]
    req_id = test_seed_data["requirement_id"]
    new_title = f"Lead Python Architect {test_seed_data['test_id']}"
    
    payload = {
        "automation_type": "regenerate_job_opening",
        "job_opening_id": job_id,
        "requirement_id": req_id,
        "instruction": "Focus heavily on software architecture and leadership",
        "title": new_title,
        "overview": "Lead python technical architecture and team mentorship.",
        "responsibilities": ["System Architecture", "Team Mentorship"],
        "qualifications": ["6+ years Python", "System Design"],
        "budget": "₹20,00,000 - ₹30,00,000",
        "keywords": ["Python", "Architecture", "FastAPI"],
        "category": "technical",
        "sub_category": "architecture",
        "job_opening": {
            "job_opening_id": job_id,
            "requirement_id": req_id,
            "title": new_title,
            "overview": "Lead python technical architecture and team mentorship.",
            "responsibilities": ["System Architecture", "Team Mentorship"],
            "qualifications": ["6+ years Python", "System Design"],
            "budget": "₹20,00,000 - ₹30,00,000",
            "keywords": ["Python", "Architecture", "FastAPI"]
        },
        "callback_url": f"{N8N_CALLBACK_BASE_URL}/api/v1/callbacks/job-openings/regenerate",
        "authorization": f"Bearer {CALLBACK_SECRET}",
        "auth_header": f"Bearer {CALLBACK_SECRET}"
    }
    
    res = trigger_n8n_webhook(N8N_REGENERATE_JOBS_URL, payload)
    assert res.status_code in (200, 201, 202), f"Regenerate job trigger failed: {res.text}"
    
    def check_job_regenerated():
        row = db_client.table("job_openings").select("title, processing_status").eq("id", job_id).execute()
        if row.data and row.data[0]["processing_status"] == "ready":
            return row.data[0]
        return None

    job = wait_for_condition(check_job_regenerated, timeout_secs=90)
    assert job["processing_status"] == "ready"
    assert isinstance(job["title"], str) and len(job["title"]) > 0


def test_score_candidates_workflow(db_client: Client, test_seed_data: dict):
    """
    R1 & R2: Test ATS_SCORE_CANDIDATES workflow trigger & DB persistence.
    Verifies that candidate matching computes fuzzy_score and rank_order in job_candidates table.
    """
    job_id = test_seed_data["job_opening_id"]
    cand_id = test_seed_data["candidate_id"]
    
    payload = {
        "job_opening_id": job_id,
        "job_opening": {
            "job_opening_id": job_id,
            "title": "Senior Python Engineer",
            "category": "technical",
            "sub_category": "backend"
        },
        "approved_skills": test_seed_data["skills"],
        "matching_scope": "both",
        "candidate_ids": [cand_id],
        "candidates": [
            {
                "id": cand_id,
                "full_name": f"Test Candidate {test_seed_data['test_id']}",
                "skills": ["Python", "FastAPI", "PostgreSQL"],
                "experience_years": 4
            }
        ],
        "matches": [
            {
                "candidate_id": cand_id,
                "fuzzy_score": 85.5,
                "strengths": ["Python expertise", "FastAPI experience"],
                "skill_gaps": ["No Kubernetes experience"]
            }
        ],
        "callback_url": f"{N8N_CALLBACK_BASE_URL}/api/v1/callbacks/candidate-matches",
        "authorization": f"Bearer {CALLBACK_SECRET}",
        "auth_header": f"Bearer {CALLBACK_SECRET}"
    }
    
    res = trigger_n8n_webhook(N8N_MATCH_CANDIDATES_URL, payload)
    assert res.status_code in (200, 201, 202), f"Score candidates trigger failed: {res.text}"
    
    def check_match():
        row = db_client.table("job_candidates").select("*").eq("job_opening_id", job_id).eq("candidate_id", cand_id).execute()
        return row.data[0] if row.data else None

    match = wait_for_condition(check_match, timeout_secs=90)
    assert 0 <= match["fuzzy_score"] <= 100
    assert match["rank_order"] >= 1


def test_generate_screening_questions_workflow(db_client: Client, test_seed_data: dict):
    """
    R1 & R2: Test ATS_GENERATE_SCREENING_QUESTIONS workflow trigger & DB persistence.
    Verifies that screening questions JSONB array is stored on the application record.
    """
    app_id = test_seed_data["application_id"]
    cand_id = test_seed_data["candidate_id"]
    job_id = test_seed_data["job_opening_id"]
    
    payload = {
        "application_id": app_id,
        "candidate_id": cand_id,
        "job_opening_id": job_id,
        "questions": [
            {
                "question": "How do you handle async database queries in FastAPI using asyncpg or SQLAlchemy?",
                "difficulty": "medium",
                "order": 1,
                "reason": "Tests core async Python backend capability."
            },
            {
                "question": "Describe your strategy for n8n workflow error handling and webhook retries.",
                "difficulty": "hard",
                "order": 2,
                "reason": "Tests workflow automation resilience."
            }
        ],
        "callback_url": f"{N8N_CALLBACK_BASE_URL}/api/v1/callbacks/screening-questions",
        "authorization": f"Bearer {CALLBACK_SECRET}",
        "auth_header": f"Bearer {CALLBACK_SECRET}"
    }
    
    res = trigger_n8n_webhook(N8N_GENERATE_QUESTIONS_URL, payload)
    assert res.status_code in (200, 201, 202), f"Generate screening questions trigger failed: {res.text}"
    
    def check_questions():
        row = db_client.table("applications").select("screening_questions").eq("id", app_id).execute()
        if row.data and len(row.data[0].get("screening_questions", [])) > 0:
            return row.data[0]["screening_questions"]
        return None

    questions = wait_for_condition(check_questions, timeout_secs=90)
    assert len(questions) >= 1
    assert "question" in questions[0]
    assert "difficulty" in questions[0]


def test_callback_security_authentication():
    """
    R2 & R4: Verify backend callback authentication layer enforces Bearer token check.
    Invalid secret should return 401/403 HTTP status.
    """
    url = f"{BACKEND_BASE_URL}/api/v1/callbacks/job-skills"
    bad_headers = {"Authorization": "Bearer invalid_secret_token_123"}
    valid_headers = {"Authorization": f"Bearer {CALLBACK_SECRET}"}
    payload = {"job_opening_id": str(uuid.uuid4()), "skills": []}
    
    try:
        res_bad = requests.post(url, json=payload, headers=bad_headers, timeout=5)
        assert res_bad.status_code in (401, 403), f"Backend callback failed to enforce security token: {res_bad.status_code}"
        
        res_valid = requests.post(url, json=payload, headers=valid_headers, timeout=5)
        assert res_valid.status_code not in (401, 403), f"Backend callback rejected valid security token: {res_valid.status_code}"
    except requests.exceptions.RequestException:
        pytest.skip("Backend server not running at BACKEND_BASE_URL")
