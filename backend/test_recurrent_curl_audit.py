import os
import sys
import time
import httpx

base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base_dir)

from main import get_admin_supabase_client, get_recruiter_owner_ids, filter_valid_uuids

BACKEND_URL = "http://localhost:8000"
ITERATIONS = 10

def run_recurrent_tests():
    print(f"=== Starting Recurrent Repetitive API & Database Audit ({ITERATIONS} Iterations) ===")
    admin_db = get_admin_supabase_client()
    
    # 1. Fetch all raw DB data
    profs = admin_db.table("profiles").select("id, email, full_name").execute().data or []
    all_cands = admin_db.table("candidates").select("id, uploaded_by, job_id").eq("is_deleted", False).execute().data or []
    all_reqs = admin_db.table("requirements").select("id, created_by, client_id").eq("is_deleted", False).execute().data or []
    all_jobs = admin_db.table("job_openings").select("id, requirement_id").eq("is_deleted", False).execute().data or []
    all_cls = admin_db.table("clients").select("id, created_by").eq("is_deleted", False).execute().data or []

    # Filter distinct non-empty emails
    test_emails = sorted(list(set(p["email"].strip().lower() for p in profs if p.get("email") and p.get("email").strip())))
    
    # Calculate exact expected DB counts per account
    account_expectations = {}
    for email in test_emails:
        owner_ids, org_id = get_recruiter_owner_ids(x_user_email=email)
        valid_uuids = filter_valid_uuids(owner_ids)
        
        # Expected requirements
        exp_reqs = [r for r in all_reqs if r.get("created_by") in owner_ids]
        exp_req_ids = set(r["id"] for r in exp_reqs)
        
        # Expected jobs
        exp_jobs = [j for j in all_jobs if j.get("requirement_id") in exp_req_ids]
        exp_job_ids = set(j["id"] for j in exp_jobs)
        
        # Expected app candidates
        exp_app_cands = set()
        if exp_job_ids:
            exp_apps = admin_db.table("applications").select("candidate_id").in_("job_opening_id", list(exp_job_ids)).execute().data or []
            for a in exp_apps:
                if a.get("candidate_id"):
                    exp_app_cands.add(a["candidate_id"])
                    
        # Expected candidates
        exp_cands = [
            c for c in all_cands 
            if c.get("uploaded_by") in owner_ids 
            or (not c.get("uploaded_by") and c.get("id") in exp_app_cands)
            or (c.get("job_id") and c.get("job_id") in exp_job_ids)
        ]
        
        # Expected clients
        exp_client_ids = set(r["client_id"] for r in exp_reqs if r.get("client_id"))
        exp_cls = [c for c in all_cls if c.get("created_by") in owner_ids or c["id"] in exp_client_ids]
        
        account_expectations[email] = {
            "cands": len(exp_cands),
            "reqs": len(exp_reqs),
            "jobs": len(exp_jobs),
            "clients": len(exp_cls)
        }

    print(f"Auditing {len(test_emails)} registered recruiter accounts in database:")
    for email, exp in account_expectations.items():
        if exp['cands'] > 0 or exp['reqs'] > 0:
            print(f"  • {email:35s} | Exp Candidates: {exp['cands']:2d} | Exp Reqs: {exp['reqs']:2d} | Exp Jobs: {exp['jobs']:2d} | Exp Clients: {exp['clients']:2d}")

    with httpx.Client(base_url=BACKEND_URL, timeout=30.0) as client:
        for iteration in range(1, ITERATIONS + 1):
            print(f"\n--- Iteration {iteration}/{ITERATIONS} ---")
            for email in test_emails:
                exp = account_expectations[email]
                headers = {"x-user-email": email}
                
                # API requests
                res_cand = client.get("/api/v1/candidates", headers=headers)
                assert res_cand.status_code == 200, f"Iteration {iteration} GET /api/v1/candidates failed for {email}: {res_cand.status_code}"
                api_cands = res_cand.json()
                
                res_req = client.get("/api/v1/requirements", headers=headers)
                assert res_req.status_code == 200, f"Iteration {iteration} GET /api/v1/requirements failed for {email}: {res_req.status_code}"
                api_reqs = res_req.json()
                
                res_jobs = client.get("/api/v1/jobs", headers=headers)
                assert res_jobs.status_code == 200
                api_jobs = res_jobs.json()

                res_cls = client.get("/api/v1/clients", headers=headers)
                assert res_cls.status_code == 200
                api_cls = res_cls.json()

                res_apps = client.get("/api/v1/applications", headers=headers)
                assert res_apps.status_code == 200

                res_logs = client.get("/api/v1/activity_log", headers=headers)
                assert res_logs.status_code == 200

                # Strict equality assertions against DB expectations
                assert len(api_cands) == exp["cands"], f"Mismatch for {email} candidates: DB={exp['cands']}, API={len(api_cands)}"
                assert len(api_reqs) == exp["reqs"], f"Mismatch for {email} requirements: DB={exp['reqs']}, API={len(api_reqs)}"
                assert len(api_jobs) == exp["jobs"], f"Mismatch for {email} jobs: DB={exp['jobs']}, API={len(api_jobs)}"
                assert len(api_cls) == exp["clients"], f"Mismatch for {email} clients: DB={exp['clients']}, API={len(api_cls)}"

                if exp["cands"] > 0 or exp["reqs"] > 0:
                    print(f"✓ [{email:35s}] Cands: {len(api_cands):2d} | Reqs: {len(api_reqs):2d} | Jobs: {len(api_jobs):2d} | Clients: {len(api_cls):2d} | Status: OK")

            time.sleep(0.2)

    print(f"\n🎉 RECURRENT REPETITIVE API AUDIT PASSED 100% FOR ALL {len(test_emails)} ACCOUNTS ACROSS ALL {ITERATIONS} ITERATIONS!")

if __name__ == "__main__":
    run_recurrent_tests()
