"""
Configuration settings for JournalGraph backend.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Neo4j
    NEO4J_URI: str = Field(default="bolt://localhost:7687")
    NEO4J_USER: str = Field(default="neo4j")
    NEO4J_PASSWORD: str = Field(default="password")
    
    # LLM API Keys
    GEMINI_API_KEY: str = Field(default="test-key")
    OPENAI_API_KEY: Optional[str] = Field(default=None)  # Keep for backwards compatibility
    
    # Backend
    BACKEND_PORT: int = Field(default=8000)
    LOG_LEVEL: str = Field(default="info")
    
    # Features
    ENABLE_AUTO_SYNC: bool = Field(default=False)
    ENABLE_SCHEMA_SUGGESTIONS: bool = Field(default=True)
    
    # Paths
    SCHEMA_CONFIG_PATH: str = Field(default="./config/schema.json")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False
    )


# Create settings instance
settings = Settings()