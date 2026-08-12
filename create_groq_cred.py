import os
import requests
import json
from dotenv import load_dotenv

load_dotenv(".env.local")

N8N_API_URL = os.getenv("N8N_API_URL", "http://localhost:5678/api/v1/workflows")
BASE_API = N8N_API_URL.rsplit('/workflows', 1)[0]
API_KEY = os.getenv("N8N_API_KEY", os.getenv("N8N_KEY", ""))

headers = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json"
}

groq_key = os.getenv("GROQ_API_KEY", "")

res = requests.get(f"{BASE_API}/credentials", headers=headers)
if res.status_code == 200:
    for c in res.json().get("data", []):
        if c.get("type") == "groqApi":
            requests.delete(f"{BASE_API}/credentials/{c.get('id')}", headers=headers)

payload = {
    "name": "Groq account",
    "type": "groqApi",
    "data": {
        "apiKey": groq_key
    }
}

resp = requests.post(f"{BASE_API}/credentials", headers=headers, json=payload)
print(resp.status_code)
print(resp.text)
