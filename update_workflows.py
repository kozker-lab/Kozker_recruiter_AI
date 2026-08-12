import os
import json
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

API_URL = os.getenv("N8N_API_URL", "http://localhost:5678/api/v1/workflows")
BASE_API = API_URL.rsplit('/workflows', 1)[0]
API_KEY = os.getenv("N8N_API_KEY", os.getenv("N8N_KEY", ""))

headers = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json"
}

NEW_SUPABASE_CRED = "s8Meus35Lwz3uPt0"
try:
    cred_res = requests.get(f"{BASE_API}/credentials", headers=headers)
    if cred_res.status_code == 200:
        for c in cred_res.json().get("data", []):
            if c.get("type") == "supabaseApi":
                NEW_SUPABASE_CRED = c.get("id")
                break
except Exception as e:
    print(f"Error fetching Supabase credentials: {e}")

resp = requests.get(API_URL, headers=headers)
workflows = resp.json().get("data", [])

for wf in workflows:
    wf_id = wf["id"]
    wf_resp = requests.get(f"{API_URL}/{wf_id}", headers=headers)
    wf_data = wf_resp.json()
    
    nodes = wf_data.get("nodes", [])
    updated = False
    for node in nodes:
        if "credentials" in node:
            for cred_type, cred_obj in node["credentials"].items():
                if cred_type == "supabaseApi":
                    cred_obj["id"] = NEW_SUPABASE_CRED
                    updated = True
                
    if updated:
        put_payload = {
            "name": wf_data["name"],
            "nodes": nodes,
            "connections": wf_data.get("connections", {}),
            "settings": wf_data.get("settings", {})
        }
        res = requests.put(f"{API_URL}/{wf_id}", headers=headers, json=put_payload)
        if res.status_code == 200:
            print(f"Updated {wf_data['name']} successfully.")
        else:
            print(f"Failed to update {wf_data['name']}: {res.text}")
    else:
        print(f"No Supabase credentials found in {wf_data['name']}.")
