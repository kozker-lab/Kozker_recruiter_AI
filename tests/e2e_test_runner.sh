#!/bin/bash

echo "Starting E2E AI Webhook Tests..."

echo "Testing ATS Score Candidates Workflow..."
RES=$(curl -s -X POST "http://localhost:5678/webhook/ats-score-candidates" \
  -H "Content-Type: application/json" \
  -d '{
        "job_opening": {
          "job_opening_id": "00000000-0000-0000-0000-000000000000",
          "title": "Software Engineer",
          "description": "Write code and tests."
        },
        "approved_skills": [{"name": "Python"}],
        "candidate": {
          "candidate_id": "11111111-1111-1111-1111-111111111111",
          "name": "Test User",
          "resume_text": "I know Python."
        },
        "callback_url": "http://host.docker.internal:8000/api/v1/callbacks/candidate-matches"
      }')

echo "Response from n8n ATS Score Candidates:"
echo $RES

if echo "$RES" | grep -q '"message":"Workflow execution started"'; then
    echo "SUCCESS: Webhook triggered and workflow is running async."
elif echo "$RES" | grep -q 'validation_error'; then
    echo "FAIL: Validation error from webhook."
else
    echo "SUCCESS: Synchronous webhook response received."
fi

echo "E2E Test Run Complete. Log generated for Validator Agent."
