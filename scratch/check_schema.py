import os
from supabase import create_client, ClientOptions

SUPABASE_URL = "https://covhcpsyliesrgkjxhai.supabase.co"
SUPABASE_KEY = "sb_publishable_V69YOpwZKjrT1BT8k609nQ_MBzXV80b"

def get_safe_supabase_client(url: str, key: str) -> create_client:
    dummy_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.key"
    client = create_client(
        url, 
        dummy_jwt, 
        options=ClientOptions()
    )
    client.supabase_key = key
    client.options.headers["apiKey"] = key
    client.options.headers["Authorization"] = f"Bearer {key}"
    return client

db = get_safe_supabase_client(SUPABASE_URL, SUPABASE_KEY)

# Fetch a sample job opening
res_job = db.table("job_openings").select("*").limit(1).execute()
print("Job Opening fields:", res_job.data[0].keys() if res_job.data else "No job openings found")

# Fetch a sample application
res_app = db.table("applications").select("*").limit(1).execute()
print("Application fields:", res_app.data[0].keys() if res_app.data else "No applications found")
