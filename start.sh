#!/bin/bash

# Terminate background processes on exit
trap "kill 0" EXIT

echo "Starting Backend on port 8000..."
cd backend
source venv/bin/activate 2>/dev/null || true
python main.py &
BACKEND_PID=$!

echo "Starting Frontend on port 3000..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Starting Admin Console on port 3001..."
cd ../admin-console
npm run dev &
ADMIN_PID=$!

wait $BACKEND_PID $FRONTEND_PID $ADMIN_PID
