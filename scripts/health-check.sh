#!/bin/bash

# JournalGraph Health Check Script
# Checks if all services are running properly

echo "🔍 JournalGraph Health Check"
echo "============================"

# Check Docker
echo -n "Docker: "
if docker info > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
    exit 1
fi

# Check Neo4j
echo -n "Neo4j: "
if curl -s http://localhost:7475 > /dev/null 2>&1; then
    echo "✅ Running (http://localhost:7475)"
else
    echo "❌ Not accessible"
fi

# Check Backend API
echo -n "Backend API: "
if curl -s http://localhost:8000/api/health/ > /dev/null 2>&1; then
    response=$(curl -s http://localhost:8000/api/health/ | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "error")
    if [ "$response" = "healthy" ]; then
        echo "✅ Healthy (http://localhost:8000)"
    else
        echo "⚠️  Running but not healthy"
    fi
else
    echo "❌ Not accessible"
fi

# Check container status
echo ""
echo "📦 Container Status:"
docker-compose ps

echo ""
echo "💡 Tips:"
echo "  - View logs: docker-compose logs -f"
echo "  - Restart services: docker-compose restart"
echo "  - Stop everything: ./stop.sh"