# JournalGraph Backend

## Setup

1. **Create Python virtual environment:**
   ```bash
   python3.12 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   - Copy `.env.example` to `.env` in the project root
   - Add your OpenAI API key to the `.env` file
   - Ensure Neo4j is running (via Docker or locally)

## Testing Graphiti Integration

Before running the full application, test that Graphiti is working:

```bash
cd backend
python test_graphiti.py
```

This will:
- Connect to Neo4j
- Initialize Graphiti with your OpenAI API key
- Process a sample journal entry
- Show extracted entities and relationships

## Running the Backend

### With Docker (recommended):
```bash
# From project root
./start.sh
```

### Locally:
```bash
cd backend
uvicorn main:app --reload --port 8000
```

## Configuration

The backend uses environment variables for configuration:

- `NEO4J_URI`: Neo4j connection URI
  - Docker: `bolt://neo4j:7687`
  - Local: `bolt://localhost:7688` (if using our Docker Neo4j)
- `OPENAI_API_KEY`: Your OpenAI API key for Graphiti
- `NEO4J_USER`: Neo4j username (default: neo4j)
- `NEO4J_PASSWORD`: Neo4j password (default: password)

## API Endpoints

- `POST /api/journal/import-batch`: Process multiple journal entries
- `GET /api/health`: Health check endpoint

## Troubleshooting

### Connection to Neo4j failed
- Check if Neo4j is running: `docker ps | grep neo4j`
- Verify the connection URI in your .env file
- Access Neo4j browser at http://localhost:7475

### OpenAI API errors
- Verify your API key is correctly set in .env
- Check you have credits in your OpenAI account
- Ensure the API key has access to GPT-4

### Module not found errors
- Make sure you're in the virtual environment
- Run `pip install -r requirements.txt` again