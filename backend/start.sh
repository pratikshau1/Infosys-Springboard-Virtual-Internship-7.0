#!/bin/sh
set -e

echo "Initializing database schema..."
python create_db.py

echo "Starting FastAPI server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2
