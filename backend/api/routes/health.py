"""
Health check endpoints.
"""

from fastapi import APIRouter, status
from typing import Dict, Any
import sys

router = APIRouter()


@router.get("/", response_model=Dict[str, Any])
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": "journalgraph-backend",
        "version": "0.1.0",
        "python_version": sys.version
    }


@router.get("/ready", response_model=Dict[str, bool])
async def readiness_check():
    """Check if the service is ready to handle requests."""
    # TODO: Add Neo4j connection check
    # TODO: Add Graphiti initialization check
    return {
        "ready": True,
        "database": True,
        "graphiti": True
    }