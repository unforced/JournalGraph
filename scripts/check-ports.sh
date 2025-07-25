#!/bin/bash

# Check if required ports are available
# Returns 0 if all ports are free, 1 if any are in use

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "Port $port is already in use by:"
        lsof -Pi :$port -sTCP:LISTEN 2>/dev/null | grep -v PID
        return 1
    fi
    return 0
}

# Check all required ports
failed=0
echo "Checking required ports..."

# Neo4j ports
if ! check_port 7475; then
    echo "⚠️  Port 7475 (Neo4j Browser) is in use"
    failed=1
fi

if ! check_port 7688; then
    echo "⚠️  Port 7688 (Neo4j Bolt) is in use"
    failed=1
fi

# Backend port
if ! check_port 8000; then
    echo "⚠️  Port 8000 (Backend API) is in use"
    failed=1
fi

if [ $failed -eq 0 ]; then
    echo "✅ All ports are available"
    exit 0
else
    echo ""
    echo "❌ Some ports are already in use!"
    echo ""
    echo "Options:"
    echo "1. Stop the conflicting services"
    echo "2. Modify docker-compose.yml to use different ports"
    echo "3. Use 'docker ps' to check for existing containers"
    exit 1
fi