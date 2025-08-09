#!/bin/bash

# Exit if any command fails
set -e

# Activate virtual environment
source .venv/bin/activate

pip install -r requirements.txt

# Run FastAPI using uvicorn
uvicorn app:app --reload --host 0.0.0.0 --port 8000