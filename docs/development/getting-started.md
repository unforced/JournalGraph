# Getting Started with JournalGraph Development

Last Updated: 2025-01-20

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Neo4j 5.0+ (or Docker)
- Git

## Initial Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd journalgraph
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Set Up Python Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 4. Set Up Neo4j
Option A: Using Docker (Recommended)
```bash
docker run -d \
  --name journalgraph-neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:5-community
```

Option B: Local Installation
- Download from https://neo4j.com/download/
- Follow platform-specific installation guide

### 5. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your settings:
# - NEO4J_URI=bolt://localhost:7687
# - NEO4J_USER=neo4j
# - NEO4J_PASSWORD=password
# - GEMINI_API_KEY=your-key-here
```

## Development Workflow

### Start Development Servers

1. **Terminal 1 - Frontend**:
```bash
npm run dev
```

2. **Terminal 2 - Backend**:
```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

3. **Terminal 3 - Neo4j** (if using Docker):
```bash
docker start journalgraph-neo4j
```

### Running Tests

```bash
# Frontend unit tests
npm test

# Frontend E2E tests
npm run test:e2e

# Backend tests
cd backend && pytest -v

# Run all tests
npm run test:all
```

### Code Quality Checks

```bash
# Frontend
npm run lint
npm run typecheck
npm run format:check

# Backend
cd backend
ruff check .
mypy .
black --check .
```

## Project Structure Guide

### Frontend (`src/frontend/`)
- `main/`: Electron main process code
  - `index.ts`: Entry point
  - `ipc/`: IPC handlers
  - `services/`: Business logic
- `renderer/`: React application
  - `components/`: Reusable UI components
  - `pages/`: Page components
  - `hooks/`: Custom React hooks
  - `store/`: State management
- `preload/`: Electron preload scripts

### Backend (`src/backend/`)
- `api/`: FastAPI endpoints
- `core/`: Business logic
  - `journal_parser.py`: Parse markdown files
  - `entity_extractor.py`: Extract entities
  - `schema_manager.py`: Manage graph schema
- `graphiti/`: Graphiti integration layer
- `models/`: Pydantic models

### Tests (`tests/`)
- `unit/`: Isolated component tests
- `integration/`: Multi-component tests
- `e2e/`: Full user journey tests

## Common Development Tasks

### Adding a New UI Component
1. Create component in `src/frontend/renderer/components/`
2. Write tests in same directory
3. Add to Storybook if applicable
4. Update component exports

### Adding a New API Endpoint
1. Define endpoint in `src/backend/api/`
2. Add Pydantic models in `src/backend/models/`
3. Write tests in `tests/backend/`
4. Update API documentation

### Modifying the Schema
1. Update schema definitions in `src/backend/core/schema_manager.py`
2. Add migration if needed
3. Update tests
4. Document changes in `docs/api/schema.md`

## Debugging

### Frontend Debugging
1. Open Electron DevTools: `Ctrl+Shift+I` (or `Cmd+Option+I` on Mac)
2. Use React Developer Tools extension
3. Check main process logs in terminal

### Backend Debugging
1. Add `import pdb; pdb.set_trace()` for breakpoints
2. Use `--log-level debug` flag
3. Check logs in `logs/backend.log`

### Neo4j Debugging
1. Access Neo4j Browser: http://localhost:7474
2. Run Cypher queries directly
3. Visualize graph structure

## Troubleshooting

### Common Issues

**Electron won't start**
- Check Node version: `node --version`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for port conflicts

**Backend API errors**
- Verify Python version: `python --version`
- Check virtual environment is activated
- Ensure Neo4j is running

**Neo4j connection issues**
- Verify Neo4j is running: `docker ps` or check services
- Test connection: `npm run test:neo4j`
- Check credentials in `.env`

## Next Steps

1. Read the [Architecture Overview](../architecture/overview.md)
2. Review [CLAUDE.md](../../CLAUDE.md) for development practices
3. Check out example code in `examples/`
4. Join development discussions in Issues/PRs