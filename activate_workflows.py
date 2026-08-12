import os
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

API_URL = os.getenv("N8N_API_URL", "http://localhost:5678/api/v1/workflows")
API_KEY = os.getenv("N8N_API_KEY", os.getenv("N8N_KEY", ""))

headers = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json"
}

resp = requests.get(API_URL, headers=headers)
workflows = resp.json().get("data", [])

for wf in workflows:
    wf_id = wf["id"]
    requests.post(f"{API_URL}/{wf_id}/activate", headers=headers)
    print(f"Activated {wf['name']}")
