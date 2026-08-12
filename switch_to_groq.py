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

# Resolve active Groq credential ID
GROQ_CRED = os.getenv("GROQ_CRED_ID", "")
if not GROQ_CRED:
    try:
        cred_res = requests.get(f"{BASE_API}/credentials", headers=headers)
        if cred_res.status_code == 200:
            for c in cred_res.json().get("data", []):
                if c.get("type") == "groqApi":
                    GROQ_CRED = c.get("id")
                    break
    except Exception as e:
        print(f"Error fetching groq credentials: {e}")

if not GROQ_CRED:
    GROQ_CRED = "Iqm7o3JNtJ9xBHBH"

resp = requests.get(API_URL, headers=headers)
workflows = resp.json().get("data", [])

for wf in workflows:
    wf_id = wf["id"]
    wf_resp = requests.get(f"{API_URL}/{wf_id}", headers=headers)
    wf_data = wf_resp.json()
    
    nodes = wf_data.get("nodes", [])
    updated = False
    
    for node in nodes:
        if node.get("type") == "@n8n/n8n-nodes-langchain.lmChatOpenRouter" or node.get("type") == "@n8n/n8n-nodes-langchain.lmChatGroq":
            node["type"] = "@n8n/n8n-nodes-langchain.lmChatGroq"
            if "credentials" not in node:
                node["credentials"] = {}
            if "openRouterApi" in node["credentials"]:
                del node["credentials"]["openRouterApi"]
            node["credentials"]["groqApi"] = {"id": GROQ_CRED, "name": "Groq account"}
            
            if "parameters" in node and "model" in node["parameters"]:
                node["parameters"]["model"] = "llama-3.3-70b-versatile"
                
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
            print(f"Switched {wf_data['name']} to Groq successfully.")
        else:
            print(f"Failed to update {wf_data['name']}: {res.text}")
