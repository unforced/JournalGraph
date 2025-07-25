# Debugging Journal Import Issues

## Common Issues

### 1. "Failed to fetch" Error

This usually means the frontend can't connect to the backend. Check:

1. **Backend is running**:
   ```bash
   docker-compose ps
   # Should show journalgraph-backend as "Up"
   ```

2. **Check backend logs**:
   ```bash
   docker-compose logs -f backend
   ```

3. **Test backend directly**:
   ```bash
   curl http://localhost:8000/api/health/
   ```

4. **Open browser console** (Ctrl+Shift+I in Electron):
   - Look for CORS errors
   - Check network tab for failed requests
   - Look for "Backend not accessible" in console

### 2. CORS Issues

If you see CORS errors in the console:

1. Backend should allow all origins in development (already configured)
2. Try restarting the Electron app
3. Make sure you're using `http://localhost:8000` not `127.0.0.1:8000`

### 3. No Files Found

If import says "0 files processed":

1. Check your files are named `YYYY-MM-DD.md` (e.g., `2024-01-15.md`)
2. Make sure you selected the right folder
3. Files must be in the root of selected folder (not subdirectories)

### 4. Network Blocked

Some Electron security settings might block requests:

1. Try opening Chrome DevTools in Electron (View → Toggle Developer Tools)
2. Go to Network tab
3. Try the import again
4. Look for red failed requests

## Quick Fixes

### Restart Everything
```bash
# Stop all
./stop.sh

# Start fresh
./start.sh
```

### Check All Services
```bash
./scripts/health-check.sh
```

### View Real-time Logs
```bash
# In one terminal
docker-compose logs -f backend

# In another terminal  
npm run dev

# Try import and watch both logs
```

## Testing Backend Manually

```bash
# Test with a real folder path
curl -X POST http://localhost:8000/api/journal/import \
  -H "Content-Type: application/json" \
  -d '{"folder_path": "/Users/YOUR_USERNAME/path/to/journals"}'
```

## Still Having Issues?

1. Check if you have any browser extensions that might block requests
2. Try disabling Windows Defender / antivirus temporarily
3. Make sure no firewall is blocking port 8000
4. Check Docker Desktop has enough resources allocated