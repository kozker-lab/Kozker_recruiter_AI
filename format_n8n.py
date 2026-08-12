import json
import os
import uuid

for filename in os.listdir("n8n-workflows"):
    if not filename.endswith(".json"): continue
    path = os.path.join("n8n-workflows", filename)
    with open(path, "r") as f:
        data = json.load(f)
    
    # Add id and name if missing
    if "id" not in data:
        data["id"] = str(uuid.uuid4())[:16] # short string
    if "name" not in data:
        data["name"] = filename.replace(".json", "")
    
    # Search for postgres/supabase nodes and adjust if there were raw connection strings.
    # However, since they use credential IDs, we will just leave the credentials alone.
    # The user can just create the credential in the n8n UI, which is easier.
    
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
