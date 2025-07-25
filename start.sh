#!/bin/bash

# JournalGraph Startup Script
# This script starts all services with a single command

set -e

echo "🚀 Starting JournalGraph..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your OPENAI_API_KEY"
    echo "   Then run this script again."
    exit 1
fi

# Check if OPENAI_API_KEY is set
if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "⚠️  OPENAI_API_KEY not set in .env file"
    echo "   Please add your OpenAI API key and run again."
    exit 1
fi

# Export environment variables
export $(grep -v '^#' .env | xargs)

# Start backend services with Docker Compose
echo "🐳 Starting backend services (Neo4j + Python API)..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Check if backend is healthy
echo "🔍 Checking backend health..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:8000/api/health > /dev/null; then
        echo "✅ Backend is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Waiting for backend... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend failed to start. Check logs with: docker-compose logs backend"
    exit 1
fi

# Check if Neo4j is accessible
if curl -s http://localhost:7475 > /dev/null; then
    echo "✅ Neo4j is ready! Browser available at http://localhost:7475"
else
    echo "⚠️  Neo4j browser not accessible, but this might be normal"
fi

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Start Electron app
echo "🖥️  Starting Electron app..."
echo ""
echo "==============================================="
echo "  JournalGraph is starting!"
echo "  "
echo "  Backend API: http://localhost:8000"
echo "  Neo4j Browser: http://localhost:7475"
echo "  "
echo "  To stop all services: ./stop.sh"
echo "  To view logs: docker-compose logs -f"
echo "==============================================="
echo ""

npm run dev