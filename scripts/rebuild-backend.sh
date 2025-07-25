#!/bin/bash

# Quick script to rebuild backend after code changes

echo "🔄 Rebuilding backend container..."

docker-compose build backend
docker-compose up -d backend

echo "⏳ Waiting for backend to be ready..."
sleep 3

# Check if backend is healthy
if curl -s http://localhost:8000/api/health/ > /dev/null; then
    echo "✅ Backend rebuilt and running!"
else
    echo "❌ Backend health check failed"
    echo "Check logs with: docker-compose logs backend"
fi