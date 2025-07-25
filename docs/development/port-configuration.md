# Port Configuration Guide

Last Updated: 2025-01-20

## Default Ports

JournalGraph uses the following ports by default:

| Service | Port | Purpose |
|---------|------|---------|
| Neo4j Browser | 7475 | Web interface for Neo4j |
| Neo4j Bolt | 7688 | Database connection protocol |
| Backend API | 8000 | Python FastAPI server |
| Electron Dev | 5173 | Frontend development server |

## Why Non-Standard Ports?

We use ports 7475/7688 instead of the standard Neo4j ports (7474/7687) to avoid conflicts with existing Neo4j installations or other projects.

## Checking Port Availability

Before starting services:
```bash
./scripts/check-ports.sh
```

## Changing Ports

If you need to use different ports:

### 1. Update docker-compose.yml
```yaml
services:
  neo4j:
    ports:
      - "YOUR_BROWSER_PORT:7474"
      - "YOUR_BOLT_PORT:7687"
```

### 2. Update .env
```bash
NEO4J_URI=bolt://localhost:YOUR_BOLT_PORT
```

### 3. Update startup scripts
Edit `start.sh` and `start.bat` to reflect new ports.

## Common Port Conflicts

### Neo4j Already Running
```bash
# Check what's using Neo4j ports
docker ps | grep neo4j

# Stop specific container
docker stop container-name

# Or use different ports (see above)
```

### Backend Port in Use
```bash
# Check what's using port 8000
lsof -i :8000

# Common culprits:
# - Another FastAPI/Django app
# - Jupyter notebook
# - Previous JournalGraph instance
```

## Docker Network Mode

Inside Docker, services communicate using:
- `neo4j:7687` (internal network)
- `backend:8000` (internal network)

From your host machine, access via:
- `localhost:7475` (Neo4j Browser)
- `localhost:7688` (Neo4j Bolt)
- `localhost:8000` (Backend API)

## Troubleshooting

### "Port already allocated" Error
1. Run `./scripts/check-ports.sh`
2. Stop conflicting services
3. Or modify ports in docker-compose.yml

### Can't Connect to Neo4j
1. Verify Neo4j is running: `docker ps`
2. Check logs: `docker-compose logs neo4j`
3. Try browser: http://localhost:7475
4. Ensure .env has correct bolt URL

### Backend Connection Issues
1. Check if backend is healthy:
   ```bash
   curl http://localhost:8000/api/health/
   ```
2. Verify environment variables are loaded
3. Check logs: `docker-compose logs backend`

## Port Forwarding for Remote Access

To access JournalGraph from another machine:

```bash
# SSH tunnel for all services
ssh -L 7475:localhost:7475 \
    -L 7688:localhost:7688 \
    -L 8000:localhost:8000 \
    -L 5173:localhost:5173 \
    user@remote-host
```

## Security Note

The default configuration binds to `0.0.0.0`, making services accessible from any network interface. For production or sensitive data:

1. Bind to localhost only:
   ```yaml
   ports:
     - "127.0.0.1:7475:7474"
   ```

2. Use Docker networks without exposed ports
3. Set up proper authentication and firewall rules