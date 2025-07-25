# JournalGraph

Transform your daily journal entries into a living, queryable knowledge graph that reveals patterns, connections, and insights from your personal history.

## Overview

JournalGraph is a desktop application that integrates with your Obsidian vault (or any folder of markdown files) to create a temporal knowledge graph using AI-powered entity extraction and relationship mapping.

## Features

- 📝 **Smart Journal Import**: Automatically parse daily notes in YYYY-MM-DD.md format
- 🧠 **Adaptive Schema Discovery**: AI-powered entity type suggestions that evolve with your content
- 🔍 **Natural Language Queries**: Ask questions about your journal in plain English
- 📊 **Rich Visualizations**: Timeline views, relationship graphs, and insight dashboards
- 🔄 **Daily Sync**: Morning review of yesterday's extracted insights
- 🔗 **Obsidian Integration**: Export insights back to your vault

## Quick Start

### Prerequisites

1. **Docker Desktop** installed and running
2. **Node.js 18+** and npm
3. **Google Gemini API Key** ([Get one free](https://aistudio.google.com/apikey))

### 🚀 One-Command Startup (Recommended)

```bash
# First, set up your API key:
cp .env.docker .env.docker.local
# Edit .env.docker.local and add: GEMINI_API_KEY=your-key-here

# Then start everything:
./start.sh
```

That's it! This will:
- Start Neo4j database
- Start Python backend API (with Gemini)
- Launch the Electron desktop app
- Install dependencies automatically

To stop everything:
```bash
./stop.sh
```

### Manual Setup

If you prefer to run services individually:

```bash
# Install dependencies
npm install
cd backend && pip install -r requirements.txt

# Start services
docker-compose up -d  # Backend services
npm run dev          # Electron app
```

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Development Guide](docs/development/getting-started.md)
- [API Reference](docs/api/reference.md)
- [User Guide](docs/user-guides/quick-start.md)
- [Troubleshooting](TROUBLESHOOTING.md) - **Start here if you have issues!**

## Tech Stack

- **Frontend**: Electron + React + TypeScript
- **Backend**: Python + FastAPI + Graphiti
- **Database**: Neo4j (via Graphiti)
- **Testing**: Jest + Playwright + pytest

## License

MIT