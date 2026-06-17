#!/bin/bash

# Terminate background processes on exit
trap "kill 0" EXIT

echo "Starting Kozker Recruiter AI Backend..."
cd backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

echo "Starting Kozker Recruiter AI Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
