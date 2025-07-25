"""
Tests for health check endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    """Test basic health check endpoint."""
    response = client.get("/api/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_readiness_check():
    """Test readiness check endpoint."""
    response = client.get("/api/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert "ready" in data
    assert isinstance(data["ready"], bool)