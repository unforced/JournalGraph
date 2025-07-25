"""
JournalGraph Backend API
Last Updated: 2025-01-20
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator

from core.config import settings
from core.graphiti_client import graphiti_client
from api.routes import journal, schema, query, health, personal_schema, admin, structure_discovery

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Handle application startup and shutdown."""
    # Startup
    logger.info("Starting JournalGraph Backend...")
    
    # Initialize Graphiti client on startup
    try:
        await graphiti_client.initialize()
        logger.info("Graphiti client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Graphiti client: {e}")
        # Continue running even if Graphiti fails to initialize
        # The individual endpoints will handle the error
    
    yield
    
    # Shutdown
    logger.info("Shutting down JournalGraph Backend...")
    # Close Graphiti connections
    try:
        await graphiti_client.close()
        logger.info("Graphiti client closed successfully")
    except Exception as e:
        logger.error(f"Error closing Graphiti client: {e}")


app = FastAPI(
    title="JournalGraph API",
    description="Transform journal entries into knowledge graphs",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:*", "file://*", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(journal.router, prefix="/api/journal", tags=["journal"])
app.include_router(schema.router, prefix="/api/schema", tags=["schema"])
app.include_router(query.router, prefix="/api/query", tags=["query"])
app.include_router(personal_schema.router, prefix="/api/personal-schema", tags=["personal-schema"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(structure_discovery.router, prefix="/api/structure-discovery", tags=["structure-discovery"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "JournalGraph API",
        "version": "0.1.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.BACKEND_PORT,
        reload=True
    )