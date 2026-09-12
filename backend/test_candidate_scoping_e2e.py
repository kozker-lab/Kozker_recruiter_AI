import os
import sys
import asyncio
import json
import httpx
from fastapi.testclient import TestClient

# Add backend directory to sys.path
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base_dir)

from main import app, SUPABASE_URL, SUPABASE_KEY

def get_token(email, password="12345678_K"):
    headers = {"apiKey": SUPABASE_KEY}
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    with httpx.Client() as client:
        res = client.post(url, json={"email": email, "password": password}, headers=headers)
        if res.status_code == 200:
            return res.json()["access_token"]
        else:
            raise Exception(f"Failed to log in as {email}: {res.status_code} {res.text}")

def run_tests():
    print("=== Launching E2E Recruiter Candidate Scoping & Feature Audit ===")
    
    # 1. Obtain Tokens
    smaran_token = get_token("smaranlm10@gmail.com")
    akshay_token = get_token("akshayjayesh2002@gmail.com")
    print("✓ Successfully authenticated Smaran & Akshay with Supabase Auth.")

    headers_smaran = {"Authorization": f"Bearer {smaran_token}"}
    headers_akshay = {"Authorization": f"Bearer {akshay_token}"}
    
    headers_smaran_email = {"x-user-email": "smaranlm10@gmail.com"}
    headers_akshay_email = {"x-user-email": "akshayjayesh2002@gmail.com"}

    with TestClient(app) as client:
        # Test 1: Querying candidates for Smaran & Akshay via JWT Bearer
        cands_smaran = client.get("/api/v1/candidates", headers=headers_smaran).json()
        jobs_smaran = client.get("/api/v1/jobs", headers=headers_smaran).json()
        reqs_smaran = client.get("/api/v1/requirements", headers=headers_smaran).json()
        cls_smaran = client.get("/api/v1/clients", headers=headers_smaran).json()
        apps_smaran = client.get("/api/v1/applications", headers=headers_smaran).json()
        log_smaran = client.get("/api/v1/activity_log", headers=headers_smaran).json()

        cands_akshay = client.get("/api/v1/candidates", headers=headers_akshay).json()
        jobs_akshay = client.get("/api/v1/jobs", headers=headers_akshay).json()
        reqs_akshay = client.get("/api/v1/requirements", headers=headers_akshay).json()
        cls_akshay = client.get("/api/v1/clients", headers=headers_akshay).json()
        apps_akshay = client.get("/api/v1/applications", headers=headers_akshay).json()
        log_akshay = client.get("/api/v1/activity_log", headers=headers_akshay).json()

        print(f"\n--- [JWT Bearer Auth Scoping Summary] ---")
        print(f"Smaran: {len(cands_smaran)} candidates | {len(jobs_smaran)} jobs | {len(reqs_smaran)} reqs | {len(cls_smaran)} clients | {len(apps_smaran)} apps | {len(log_smaran)} logs")
        print(f"Akshay: {len(cands_akshay)} candidates | {len(jobs_akshay)} jobs | {len(reqs_akshay)} reqs | {len(cls_akshay)} clients | {len(apps_akshay)} apps | {len(log_akshay)} logs")

        # Test 2: Querying via X-User-Email headers
        cands_smaran_hdr = client.get("/api/v1/candidates", headers=headers_smaran_email).json()
        cands_akshay_hdr = client.get("/api/v1/candidates", headers=headers_akshay_email).json()
        print(f"X-User-Email Header - Smaran: {len(cands_smaran_hdr)} candidates | Akshay: {len(cands_akshay_hdr)} candidates")

        # Test 3: Candidate Creation Isolation
        unique_cand_name = "Isolation Audit Candidate Test"
        cand_payload = {
            "full_name": unique_cand_name,
            "email": "audit_candidate_iso_test@example.com",
            "phone": "+18887776666",
            "skills": ["FastAPI", "React", "Python"],
            "experience_years": 4,
            "education": "BS Engineering",
            "working_or_not": True,
            "source": "manual"
        }

        res_create = client.post("/api/v1/candidates", json=cand_payload, headers=headers_smaran)
        assert res_create.status_code == 200, f"Candidate creation failed: {res_create.text}"
        created_cand = res_create.json()
        cand_id = created_cand["id"]
        print(f"\n✓ Created candidate for Smaran (ID: {cand_id})")

        # Verify candidate presence in Smaran's candidate pool
        smaran_cands_after = client.get("/api/v1/candidates", headers=headers_smaran).json()
        smaran_cand_ids = [c["id"] for c in smaran_cands_after]
        assert cand_id in smaran_cand_ids, "Created candidate must be visible to Smaran!"
        print("✓ Smaran can retrieve their own candidate in candidates pool.")

        # Verify candidate DOES NOT LEAK to Akshay's candidate pool
        akshay_cands_after = client.get("/api/v1/candidates", headers=headers_akshay).json()
        akshay_cand_ids = [c["id"] for c in akshay_cands_after]
        assert cand_id not in akshay_cand_ids, f"LEAK DETECTED! Smaran's candidate {cand_id} leaked to Akshay's pool!"
        print("✓ Verified zero leakage: Candidate is NOT present in Akshay's pool.")

        # Verify direct GET /api/v1/candidates/{cand_id} by Akshay returns 404
        res_direct_akshay = client.get(f"/api/v1/candidates/{cand_id}", headers=headers_akshay)
        assert res_direct_akshay.status_code == 404, f"LEAK DETECTED! Akshay accessed candidate via direct GET (status: {res_direct_akshay.status_code})"
        print("✓ Verified strict security: Akshay direct access to Smaran's candidate returns 404 Not Found.")

        # Clean up test candidate
        del_res = client.delete(f"/api/v1/candidates/{cand_id}", headers=headers_smaran)
        print(f"✓ Cleaned up test candidate (status: {del_res.status_code})")

    print("\n🎉 ALL E2E RECRUITER SCOPING AND CANDIDATE ISOLATION AUDIT TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
