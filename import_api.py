import os
import json
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

API_URL = os.getenv("N8N_API_URL", "http://localhost:5678/api/v1/workflows")
API_KEY = os.getenv("N8N_API_KEY", os.getenv("N8N_KEY", ""))

headers = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json"
}

# Fetch existing workflows to avoid duplicates
existing_workflows = {}
resp = requests.get(API_URL, headers=headers)
if resp.status_code == 200:
    for wf in resp.json().get("data", []):
        name = wf.get("name")
        if name not in existing_workflows:
            existing_workflows[name] = []
        existing_workflows[name].append(wf.get("id"))

for filename in os.listdir("n8n-workflows"):
    if not filename.endswith(".json"): continue
    path = os.path.join("n8n-workflows", filename)
    
    with open(path) as f:
        data = json.load(f)
    
    wf_name = data.get("name", filename.replace(".json", ""))
    
    payload = {
        "name": wf_name,
        "nodes": data.get("nodes", []),
        "connections": data.get("connections", {}),
        "settings": data.get("settings", {}),
        "staticData": data.get("staticData", None),
        "pinData": data.get("pinData", {}),
    }
    
    if wf_name in existing_workflows and existing_workflows[wf_name]:
        target_id = existing_workflows[wf_name][0]
        extra_ids = existing_workflows[wf_name][1:]
        for extra_id in extra_ids:
            requests.delete(f"{API_URL}/{extra_id}", headers=headers)
        
        res = requests.put(f"{API_URL}/{target_id}", headers=headers, json=payload)
        if res.status_code == 200:
            print(f"Updated existing workflow {wf_name} (ID: {target_id})")
        else:
            print(f"Failed to update {wf_name}: {res.text}")
    else:
        res = requests.post(API_URL, headers=headers, json=payload)
        if res.status_code == 200:
            print(f"Successfully imported {filename} - ID: {res.json().get('id')}")
        else:
            print(f"Failed to import {filename}: {res.text}")
