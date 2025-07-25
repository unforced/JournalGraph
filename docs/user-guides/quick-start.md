# JournalGraph Quick Start Guide

Last Updated: 2025-01-20

## Prerequisites

- macOS, Windows, or Linux  
- Docker Desktop installed and running
- Node.js 18+ (will be auto-installed if missing)

## 🚀 Fastest Start (Recommended)

### One Command to Rule Them All

```bash
# Clone the repository, then:
./start.sh
```

This single command will:
✅ Check all prerequisites  
✅ Start Neo4j database in Docker  
✅ Start Python backend API in Docker  
✅ Install all dependencies  
✅ Launch the Electron desktop app  

To stop everything:
```bash
./stop.sh
```

### First-Time Setup

1. **Set your OpenAI API key**:
   ```bash
   # Edit .env file (created automatically on first run)
   # Add your OpenAI API key:
   OPENAI_API_KEY=sk-your-api-key-here
   ```

2. **Run the start script again**:
   ```bash
   ./start.sh
   ```

## Manual Installation

### 1. Install Node.js Dependencies

```bash
npm install
```

### 2. Set Up Python Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..
```

### 3. Set Up Neo4j Database

**Option A: Using Docker (Recommended)**
```bash
docker run -d \
  --name journalgraph-neo4j \
  -p 7475:7474 -p 7688:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:5-community
```

**Option B: Download and Install**
- Visit https://neo4j.com/download/
- Install and start Neo4j
- Set password to 'password' (or update .env)

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-api-key-here
```

## Running JournalGraph

### Start All Services

```bash
# Terminal 1: Start the Electron app
npm run dev

# Terminal 2: Start the Python backend
cd backend && source venv/bin/activate
python main.py
```

The app will open automatically. If not, it runs at http://localhost:5173

## First Time Use

### 1. Import Your Journals

1. Click **"Import Journals"** in the top right
2. Select your Obsidian daily notes folder
3. JournalGraph will look for files in `YYYY-MM-DD.md` format
4. Click **"Start Import"** to begin processing

### 2. Review Extracted Knowledge

After import completes:
- Switch between **Graph** and **Timeline** views
- In Graph view, see relationships between entities
- In Timeline view, browse entries chronologically

### 3. Query Your Knowledge

Use the search bar to ask questions like:
- "What projects did I work on last month?"
- "Show me all mentions of [person name]"
- "What were my main topics in January?"

## Daily Workflow

1. **Write in Obsidian** - Continue journaling as normal
2. **Sync to JournalGraph** - Import new entries (will be automated in future)
3. **Morning Review** - Check insights from yesterday's entry
4. **Query as Needed** - Search your knowledge throughout the day

## Troubleshooting

### Backend won't start
- Check Python version: `python3 --version` (needs 3.10+)
- Ensure virtual environment is activated
- Verify Neo4j is running: http://localhost:7475

### Import fails
- Verify journal files are in `YYYY-MM-DD.md` format
- Check file permissions
- Look at backend logs for errors

### No entities extracted
- Ensure OpenAI API key is set correctly
- Check backend console for API errors
- Try with a smaller set of journals first

## Next Steps

- Read the [User Guide](./user-guide.md) for advanced features
- Learn about [Schema Customization](./schema-guide.md)
- Set up [Automated Sync](./automation.md)

## Getting Help

- Check logs in the app's developer console (Ctrl+Shift+I)
- Backend logs appear in the terminal
- Report issues at [GitHub Issues](https://github.com/journalgraph/journalgraph/issues)