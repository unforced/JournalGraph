# JournalGraph Development Guidelines

Last Updated: 2025-01-21

## Project Overview

JournalGraph transforms Obsidian journal entries into a temporal knowledge graph using Graphiti. This is a desktop Electron app with a Python backend for AI processing using Google Gemini API.

## Core Development Philosophy

1. **Iterative Problem-Solving**: Debug methodically by checking logs, testing smaller pieces, and making incremental changes
2. **User Feedback First**: Always provide real-time progress and clear error messages - never leave users hanging with "Loading..."
3. **Practical Over Perfect**: If something is blocking progress (like a reranker with hardcoded models), disable it and document why
4. **Specific Over Generic**: Use exact model versions (e.g., `gemini-2.5-flash`, not `gemini-2.5-flash-latest`)
5. **Test in Reality**: Actually run the code and verify it works before marking tasks complete

## Development Workflow

### 1. Before Starting Any Task
- Check existing code patterns and conventions
- Run tests to ensure clean starting state: `npm test && cd backend && pytest`
- Review relevant documentation in `docs/`
- Use TodoWrite to plan complex tasks
- Verify your development environment is working (Docker, API keys, etc.)

### 2. Testing Requirements
- **ALWAYS** test your changes before marking tasks complete
- Run unit tests after any code change: `npm test`
- Run E2E tests for UI changes: `npm run test:e2e`
- Use Playwright MCP for manual testing of Electron app
- Backend changes: `cd backend && pytest -v`

### 3. Code Quality Checks
Run these commands before considering any task complete:
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

### 4. Documentation Updates
- Update docs when adding new features
- Keep API documentation in sync: `docs/api/`
- Update architecture diagrams for structural changes
- Add timestamps to major documentation updates

## Project Structure

```
journalgraph/
├── src/
│   ├── frontend/          # Electron + React app
│   │   ├── main/         # Electron main process
│   │   ├── renderer/     # React app
│   │   └── preload/      # Preload scripts
│   ├── backend/          # Python FastAPI server
│   │   ├── api/          # API endpoints
│   │   ├── core/         # Business logic
│   │   └── graphiti/     # Graphiti integration
│   └── shared/           # Shared types/constants
├── tests/
│   ├── unit/            # Jest unit tests
│   ├── integration/     # Integration tests
│   └── e2e/            # Playwright E2E tests
├── docs/
│   ├── architecture/    # System design docs
│   ├── development/     # Dev guides
│   ├── api/            # API documentation
│   └── user-guides/    # User documentation
└── scripts/            # Build and utility scripts
```

## Key Development Patterns

### Frontend (TypeScript/React)
- Use functional components with hooks
- Prefer `const` over `let`
- Use TypeScript strict mode
- Component files: `ComponentName.tsx`
- Test files: `ComponentName.test.tsx`
- Use Tailwind CSS for styling

### Backend (Python)
- Use type hints everywhere
- Follow PEP 8 style guide
- Async/await for all IO operations
- Pydantic for data validation
- Comprehensive docstrings

### Graphiti Integration
- Always handle temporal aspects (dates from filenames)
- Use episodic processing for journal entries
- Maintain schema consistency across sessions
- Store schema evolution history
- Disable features that use hardcoded models if switching LLM providers
- Clear Neo4j data when switching embedding models to avoid dimension mismatches

## API Integration Best Practices

### LLM Provider Configuration
1. **Model Names**: Use exact model names without suffixes
   - ✅ `gemini-2.5-flash`
   - ❌ `gemini-2.5-flash-latest`
2. **API Keys**: Load from environment, never hardcode
3. **Rate Limit Handling**: 
   - Implement exponential backoff
   - Consider switching providers if persistent
   - Show user-friendly messages during retries
4. **Testing**: Always test with actual API calls before assuming configuration works
5. **Fallbacks**: Have a plan for when primary provider fails

## Testing Strategy

### Manual Testing with Playwright
```typescript
// Use Playwright MCP to test UI flows
// Example: Test journal import flow
await page.click('[data-testid="import-button"]');
await page.selectFolder('/path/to/test/journals');
await expect(page.locator('[data-testid="import-success"]')).toBeVisible();
```

### Unit Testing
- Test pure functions and utilities
- Mock external dependencies
- Aim for >80% coverage

### Integration Testing
- Test API endpoints with real Graphiti
- Use test database instances
- Clean up test data after runs

### E2E Testing
- Test complete user workflows
- Use realistic test data
- Test error scenarios

## Daily Development Cycle

1. **Morning Setup**
   ```bash
   git pull origin main
   npm install
   cd backend && pip install -r requirements.txt
   npm test
   ```

2. **During Development**
   - Write tests for new features first (TDD)
   - Run relevant tests after each change
   - Use `npm run dev` for hot reload
   - Check logs in `logs/` for debugging

3. **Before Breaks**
   - Run full test suite
   - Commit with descriptive messages
   - Update relevant documentation
   - Push to feature branch

## Common Commands

```bash
# Development
npm run dev                    # Start Electron app in dev mode
npm run backend:dev           # Start Python backend
npm run dev:all              # Start both concurrently

# Testing
npm test                      # Run frontend unit tests
npm run test:e2e             # Run Playwright E2E tests
npm run test:all             # Run all tests
cd backend && pytest         # Run backend tests

# Code Quality
npm run lint:fix             # Auto-fix linting issues
npm run format               # Format code
npm run typecheck           # Check TypeScript types

# Building
npm run build               # Build for production
npm run package            # Package Electron app
```

## Error Handling

1. Always provide user-friendly error messages
2. Log detailed errors for debugging
3. Use error boundaries in React
4. Implement retry logic for API calls
5. Show loading states during async operations

## Performance Considerations

1. Lazy load heavy components
2. Use React.memo for expensive renders
3. Batch Graphiti operations
4. Implement virtual scrolling for long lists
5. Cache query results appropriately

## Security

1. Validate all user inputs
2. Sanitize file paths
3. Use Electron context isolation
4. Don't expose sensitive APIs to renderer
5. Encrypt stored credentials

## Debugging Tips

1. Use Chrome DevTools in Electron
2. Enable Python debug logging
3. Check Neo4j browser for graph state
4. Use React Developer Tools
5. Monitor performance with built-in profiler

## Common Issues and Solutions

### Data Not Displaying After Import
When data imports successfully but doesn't show in views:
1. **Check API endpoints**: Placeholder endpoints that return empty data are a common cause
2. **Verify data flow**: Trace from Neo4j → Backend API → Frontend fetch → Component render
3. **Implement actual queries**: Don't leave TODO comments in query endpoints
4. **Add proper TypeScript types**: For D3.js visualizations to avoid runtime errors
5. **Test each layer**: Use curl/Postman for APIs, console.log for frontend data

### Backend Service Initialization
When facing "Graph database not connected" errors:
1. **Initialize services on startup**: Add Graphiti client initialization to FastAPI lifespan handler
2. **Check initialization order**: Ensure Neo4j is connected before handling requests
3. **Verify driver state**: The graphiti_client.driver must be initialized
4. **Add proper error handling**: Gracefully handle initialization failures
5. **Example fix**:
   ```python
   @asynccontextmanager
   async def lifespan(app: FastAPI):
       await graphiti_client.initialize()
       yield
       await graphiti_client.close()
   ```

### Neo4j Data Model Mismatches
When queries return empty results:
1. **Check node labels**: Graphiti uses `Episodic` not `EpisodeNode`
2. **Verify property names**: `reference_time` might not exist, use `created_at` or parse from name
3. **Count relationships correctly**: Use OPTIONAL MATCH for counts to avoid filtering out nodes
4. **Debug with curl**: `curl http://localhost:8000/api/query/graph | jq`
5. **Extract dates from multiple sources**: Try name parsing as fallback

### TypeScript and Linting Errors
When facing type errors, especially with D3.js:
1. **Install type definitions**: `npm install --save-dev @types/d3`
2. **Use specific types**: Avoid `any`, create interfaces for complex data structures
3. **Fix incrementally**: Run `npm run lint:fix` first, then address remaining errors
4. **Type D3 selections properly**: Use generics like `d3.select<SVGSVGElement, unknown>`
5. **Handle union types**: When D3 transforms data (e.g., edge source/target), create separate types

## Environment Debugging

When facing environment issues:
1. Check Docker logs: `docker-compose logs backend -f`
2. Verify environment variables are loaded: Add debug prints early in app startup
3. Test API keys directly: Use curl or Python scripts to isolate issues
4. Clear data when switching providers: `docker-compose down -v` when changing from OpenAI to Gemini
5. Check for port conflicts: Use alternative ports if defaults are taken

## Migration and Adaptation

When hitting limitations:
1. **Switch providers quickly**: If hitting rate limits, consider alternatives (OpenAI → Gemini)
2. **Disable blocking features**: If a feature blocks progress (like reranker), disable and document
3. **Adapt architecture**: If Docker can't access files, move file reading to frontend
4. **Use exact versions**: Avoid "latest" tags - use specific model versions

## Real-Time User Feedback

Always implement progress tracking for long operations:
1. Use Server-Sent Events (SSE) for streaming updates
2. Show current item being processed, not just a spinner
3. Display meaningful metrics (entities found, relationships created)
4. Provide immediate error feedback with actionable messages
5. Never leave users waiting without information

## Docker and Deployment

1. Use docker-compose for multi-service setup
2. Include health checks and proper startup dependencies
3. Map to alternative ports if defaults conflict
4. Use multiple env file loading for flexibility:
   ```yaml
   env_file:
     - .env
     - .env.docker
     - .env.docker.local
   ```
5. Test the actual Docker deployment, not just local development

## Commit Practices

1. Make comprehensive commits after feature completion
2. Update documentation in the same commit as code changes
3. Include migration notes when switching technologies
4. Reference issues or rate limits that prompted changes
5. Use clear, action-oriented commit messages

## When Stuck

1. Check existing patterns in codebase
2. Review documentation of all dependencies
3. Test smaller pieces in isolation
4. Add comprehensive logging at every step
5. Try alternative approaches if blocked
6. Document why certain approaches didn't work

Remember: Ship working features iteratively. A functional app with progress feedback beats a perfect architecture that hangs.