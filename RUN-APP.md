# Running JournalGraph

## ✅ Your Docker services are already running!

Backend API: http://localhost:8000
Neo4j Browser: http://localhost:7475

## 🚀 Now start the Electron app:

```bash
npm run dev
```

This should now work! The Electron app will:
- Connect to the backend API at localhost:8000
- Open a desktop window with the JournalGraph interface
- Allow you to import and analyze your journal entries

## ❓ Why isn't Electron in Docker?

Electron is a desktop GUI application that needs direct access to your display. Docker containers can't easily provide this without complex setup that would hurt performance. See [detailed explanation](docs/development/electron-docker-explanation.md).

## 🛠️ If you still have issues:

1. Make sure you're in the project root directory
2. Try cleaning and rebuilding:
   ```bash
   rm -rf dist out node_modules
   npm install
   npm run dev
   ```

3. Check that backend is healthy:
   ```bash
   ./scripts/health-check.sh
   ```

## 📝 Daily Workflow

1. Start services (if not running):
   ```bash
   ./start.sh
   ```

2. The script will:
   - ✅ Start Neo4j and Backend in Docker
   - ✅ Launch the Electron app
   - ✅ Open JournalGraph on your desktop

3. To stop everything:
   ```bash
   ./stop.sh
   ```

That's it! Enjoy transforming your journals into knowledge graphs! 🎉