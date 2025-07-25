# JournalGraph Troubleshooting Guide

## 🚨 Common Issues & Quick Fixes

### Port Already In Use Error

**Symptom**: When running `./start.sh`, you see:
```
Error: Bind for 0.0.0.0:7475 failed: port is already allocated
```

**Solution**:
1. Check what's using the ports:
   ```bash
   ./scripts/check-ports.sh
   ```

2. If you have another Neo4j running:
   ```bash
   docker ps | grep neo4j
   docker stop [container-name]
   ```

3. Or just stop all JournalGraph services and restart:
   ```bash
   ./stop.sh
   docker-compose down -v  # Removes volumes too
   ./start.sh
   ```

### Neo4j Connection Failed

**Symptom**: Backend can't connect to Neo4j

**Solution**:
1. Verify Neo4j is running:
   ```bash
   docker-compose ps
   # Should show "healthy" for neo4j
   ```

2. Check Neo4j browser: http://localhost:7475
   - Username: neo4j
   - Password: password

3. Verify .env has correct URI:
   ```
   NEO4J_URI=bolt://localhost:7688
   ```

### Backend Won't Start

**Symptom**: Backend container keeps restarting

**Solution**:
1. Check logs:
   ```bash
   docker-compose logs backend -f
   ```

2. Common issues:
   - Missing GEMINI_API_KEY in .env
   - Python syntax error
   - Missing dependencies

3. Rebuild if needed:
   ```bash
   docker-compose build backend
   docker-compose up -d
   ```

### Electron App Won't Launch

**Symptom**: `npm run dev` fails

**Solution**:
1. Check Node version:
   ```bash
   node --version  # Should be 18+
   ```

2. Clean install:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

### Import Fails

**Symptom**: Journal import doesn't work

**Solution**:
1. Check file format:
   - Files must be named `YYYY-MM-DD.md`
   - Example: `2024-01-15.md`

2. Verify backend is running:
   ```bash
   curl http://localhost:8000/api/health/
   ```

3. Check Gemini API key:
   - Must start with `AIza`
   - Must have valid Gemini API access
   - Check for billing issues on Google Cloud Console

### No Entities Extracted

**Symptom**: Import succeeds but no knowledge graph

**Solution**:
1. Check Graphiti logs:
   ```bash
   docker-compose logs backend | grep -i graphiti
   ```

2. Try with a single file first
3. Ensure journal has meaningful content
4. Verify Gemini API is working:
   ```bash
   docker-compose logs backend | grep -i gemini
   ```

### Gemini Rate Limit Errors

**Symptom**: "Rate limit exceeded" errors during import

**Solution**:
1. Check your Google Cloud billing status
2. Verify API key has proper permissions
3. The app uses gemini-2.5-flash model which has generous limits
4. If persistent, wait a few minutes and retry

## 🔧 Advanced Debugging

### Full System Reset
```bash
# Stop everything
./stop.sh

# Remove all data
docker-compose down -v
docker system prune -f

# Fresh start
./start.sh
```

### Check All Services Health
```bash
./scripts/health-check.sh
```

### View Real-time Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f neo4j
```

### Manual Service Control
```bash
# Restart a service
docker-compose restart backend

# Stop a service
docker-compose stop neo4j

# Start a service
docker-compose start neo4j
```

## 📞 Still Stuck?

1. Check existing issues: [GitHub Issues](https://github.com/journalgraph/journalgraph/issues)
2. Review logs carefully - the error is usually there
3. Try the full system reset (above)
4. Create a new issue with:
   - Your OS and Docker version
   - Complete error message
   - Output of `./scripts/health-check.sh`
   - Relevant logs from `docker-compose logs`

## 💡 Pro Tips

- Always check logs first: `docker-compose logs -f`
- Port conflicts are the #1 issue - use `./scripts/check-ports.sh`
- When in doubt, restart: `./stop.sh && ./start.sh`
- Keep your .env file safe - it has your API keys