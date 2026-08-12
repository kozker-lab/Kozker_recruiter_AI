import os
import json
import time
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_n8n_flow():
    print("Testing ATS_SCORE_CANDIDATES n8n flow...")
    
    # Get a valid requirement_id
    req_res = supabase.table("requirements").select("id").limit(1).execute()
    requirement_id = req_res.data[0]["id"] if req_res.data else None
    
    if not requirement_id:
        # Create one if none exists
        req_insert = supabase.table("requirements").insert({
            "title": "Test Requirement"
        }).execute()
        requirement_id = req_insert.data[0]["id"]

    job_res = supabase.table("job_openings").insert({
        "requirement_id": requirement_id,
        "title": "Senior AI Tester",
        "description": "Must test n8n workflows.",
        "status": "published"
    }).execute()
    job_id = job_res.data[0]["id"]
    print(f"Using Job: {job_id}")

    # Insert a skill with 100% weight
    supabase.table("job_opening_skills").insert({
        "job_opening_id": job_id,
        "skills": [{"name": "Python", "weight": 100}]
    }).execute()

    # 3. Create a candidate
    cand_res = supabase.table("candidates").insert({
        "full_name": "John Doe",
        "email": f"johndoe_{int(time.time())}@example.com",
        "parsed_resume_json": {"text": "I am great at Python and Testing."}
    }).execute()
    cand_id = cand_res.data[0]["id"]
    print(f"Created Candidate: {cand_id}")

    # 4. Trigger Webhook Manually (simulating Supabase Trigger)
    payload = {
        "job_opening": {
            "job_opening_id": job_id,
            "title": "Senior AI Tester",
            "description": "Must test n8n workflows."
        },
        "approved_skills": [{"name": "Python"}, {"name": "Testing"}],
        "candidate_ids": [cand_id],
        "callback_url": "http://backend:8000/api/v1/callbacks/candidate-matches",
        "authorization": f"Bearer {os.environ.get('CALLBACK_SECRET', 'kozker_callback_secret_token')}"
    }
    
    print("Triggering webhook...")
    res = requests.post("http://localhost:5678/webhook/ats-score-candidates", json=payload)
    print(f"Webhook response: {res.status_code}")
    print(res.text)

if __name__ == "__main__":
    test_n8n_flow()
