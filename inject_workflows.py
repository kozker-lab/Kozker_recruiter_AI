import sqlite3
import json
import uuid
import os

conn = sqlite3.connect('/tmp/database.sqlite')
cursor = conn.cursor()

for filename in os.listdir("n8n-workflows"):
    if not filename.endswith(".json"): continue
    
    with open(os.path.join("n8n-workflows", filename)) as f:
        data = json.load(f)
        
    workflow_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())
    name = filename.replace(".json", "")
    
    nodes = json.dumps(data.get("nodes", []))
    connections = json.dumps(data.get("connections", {}))
    settings = json.dumps(data.get("settings", {}))
    pinData = json.dumps(data.get("pinData", {}))
    meta = json.dumps(data.get("meta", None))
    
    try:
        cursor.execute("""
            INSERT INTO workflow_entity 
            (id, name, active, nodes, connections, settings, pinData, versionId, meta, versionCounter)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (workflow_id, name, False, nodes, connections, settings, pinData, version_id, meta, 1))
    except Exception as e:
        print(f"Error inserting {name}: {e}")

conn.commit()
conn.close()
print("Injection complete.")
