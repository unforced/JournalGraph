#!/bin/bash

# JournalGraph Stop Script
# This script stops all services

echo "🛑 Stopping JournalGraph services..."

# Stop Docker Compose services
docker-compose down

echo "✅ All services stopped!"
echo ""
echo "To completely remove data volumes, run:"
echo "  docker-compose down -v"