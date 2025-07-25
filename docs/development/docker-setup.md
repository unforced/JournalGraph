# Docker Setup Guide

Last Updated: 2025-01-20

## Overview

JournalGraph uses Docker Compose to simplify the development environment. With a single command, you can start all required services.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Electron App   │────▶│  Backend API    │────▶│     Neo4j       │
│  (Host Machine) │     │   (Container)   │     │   (Container)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       Port:5173             Port:8000            Port:7474/7687
```

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ (for Electron app)

### Start Everything
```bash
./start.sh         # macOS/Linux
start.bat          # Windows
```

### Stop Everything
```bash
./stop.sh          # macOS/Linux
stop.bat           # Windows
```

## Service Details

### Neo4j Database
- **Image**: neo4j:5-community
- **Ports**: 7474 (browser), 7687 (bolt)
- **Credentials**: neo4j/password
- **Browser**: http://localhost:7474

### Python Backend
- **Base Image**: python:3.12-slim
- **Port**: 8000
- **API Docs**: http://localhost:8000/docs
- **Hot Reload**: Enabled in development

### Electron App
- **Runs on**: Host machine (not containerized)
- **Port**: 5173 (development)
- **Why not Docker?**: Electron needs display access

## Configuration

### Environment Variables
- `.env` - Your local configuration (git-ignored)
- `.env.example` - Template with all variables
- `.env.docker` - Docker-specific overrides

### Key Variables
```bash
OPENAI_API_KEY=sk-your-key-here  # Required
NEO4J_URI=bolt://neo4j:7687      # Set in .env.docker
BACKEND_URL=http://localhost:8000 # For frontend
```

## Development Workflow

### 1. Make Backend Changes
Changes to Python files are auto-reloaded:
```bash
# View logs
docker-compose logs -f backend

# Restart if needed
docker-compose restart backend
```

### 2. Rebuild After Requirements Change
```bash
docker-compose build backend
docker-compose up -d
```

### 3. Access Neo4j Browser
- URL: http://localhost:7474
- Username: neo4j
- Password: password
- Connect URL: bolt://localhost:7687

### 4. Run Backend Tests
```bash
# Run tests inside container
docker-compose exec backend pytest -v

# Or locally
cd backend && source venv/bin/activate
pytest -v
```

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common issues:
# - Missing OPENAI_API_KEY in .env
# - Port 8000 already in use
# - Python syntax error
```

### Neo4j connection issues
```bash
# Check if Neo4j is healthy
docker-compose ps

# Restart Neo4j
docker-compose restart neo4j

# Check Neo4j logs
docker-compose logs neo4j
```

### Clean restart
```bash
# Stop and remove containers
docker-compose down

# Remove volumes (deletes data!)
docker-compose down -v

# Rebuild and start fresh
docker-compose build
./start.sh
```

### Health Check
```bash
# Run health check script
./scripts/health-check.sh
```

## Advanced Usage

### Custom Docker Compose Override
Create `docker-compose.override.yml` for local overrides:
```yaml
version: '3.8'

services:
  backend:
    environment:
      - DEBUG=true
    ports:
      - "8001:8000"  # Different port
```

### Production Build
```bash
# Build optimized images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Run production stack
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Tips

1. **Logs**: Always check logs first when debugging
2. **Volumes**: Data persists between restarts in Docker volumes
3. **Performance**: Docker on Mac/Windows may be slower than Linux
4. **Memory**: Ensure Docker has at least 4GB RAM allocated
5. **Ports**: Make sure ports 7474, 7687, and 8000 are free