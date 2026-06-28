#!/bin/bash

# spotDL UI Startup Script

echo "Starting spotDL UI..."

# Start Backend
echo "Starting FastAPI backend on port 8000..."
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Vite React frontend on port 5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "Both servers started."
echo "UI is available at http://localhost:5173"
echo "Press Ctrl+C to stop both servers."

# Wait and catch Ctrl+C to kill both servers
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
