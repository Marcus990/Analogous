#!/bin/bash

# Function to cleanup background processes on exit
cleanup() {
    echo "Shutting down servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up cleanup on script exit
trap cleanup EXIT

# Start backend server
echo "Starting backend server..."
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py &
BACKEND_PID=$!

# Start frontend server
echo "Starting frontend server..."
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 