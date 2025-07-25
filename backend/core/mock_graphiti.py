"""
Mock implementation of Graphiti for testing without the actual package.
"""

import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

class MockEpisodeType:
    """Mock EpisodeType enum."""
    JOURNAL = "journal"

class MockAsyncSession:
    """Mock Neo4j async session."""
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc, tb):
        pass
    
    async def run(self, query: str, **params):
        """Mock run method that returns an async result."""
        return MockAsyncResult(query, params)

class MockAsyncResult:
    """Mock Neo4j async result."""
    
    def __init__(self, query: str, params: dict):
        self.query = query
        self.params = params
        self._results = []
        
        # Generate mock results based on query patterns
        if "MATCH (n)" in query and "RETURN n" in query:
            # Return empty nodes for graph queries
            self._results = []
        elif "MATCH (n1)-[r]->(n2)" in query:
            # Return empty edges for relationship queries
            self._results = []
        elif "MATCH (e:Episodic)" in query:
            # Return empty episodes for timeline queries
            self._results = []
    
    def __aiter__(self):
        return self
    
    async def __anext__(self):
        if self._results:
            return self._results.pop(0)
        raise StopAsyncIteration
    
    async def single(self):
        """Return a single result."""
        if self._results:
            return self._results[0]
        return None

class MockNeo4jDriver:
    """Mock Neo4j driver."""
    
    def session(self):
        """Return a mock session."""
        return MockAsyncSession()
    
    async def close(self):
        """Mock close method."""
        pass

class MockGraphiti:
    """Mock implementation of Graphiti client for testing."""
    
    def __init__(self):
        self.driver = None
        self.is_initialized = False
        self.nodes = []
        self.relationships = []
        self.episode_type = MockEpisodeType()
        
    async def initialize(self):
        """Initialize the mock client."""
        self.is_initialized = True
        self.driver = MockNeo4jDriver()
        
    async def close(self):
        """Close the mock client."""
        self.is_initialized = False
        self.driver = None
        
    async def search(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        """Mock search implementation."""
        # Return some fake results for testing
        return [
            {
                "id": str(uuid.uuid4()),
                "name": f"Search result for: {query}",
                "type": "Episodic",
                "properties": {
                    "content": f"Mock content matching {query}",
                    "created_at": datetime.now().isoformat()
                }
            }
        ]
        
    async def query(self, cypher: str) -> List[Dict[str, Any]]:
        """Mock query implementation."""
        # Basic mock responses for common queries
        if "MATCH (n) RETURN count(n)" in cypher:
            return [{"count": len(self.nodes)}]
        elif "MATCH ()-[r]->() RETURN count(r)" in cypher:
            return [{"count": len(self.relationships)}]
        elif "MATCH (n) RETURN n LIMIT" in cypher:
            return self.nodes[:10]
        else:
            return []
            
    async def add_episode(self, name: str, content: str, source: str, reference_time: Optional[datetime] = None, **kwargs):
        """Mock add_episode implementation."""
        node = {
            "id": str(uuid.uuid4()),
            "name": name,
            "type": "Episodic",
            "properties": {
                "content": content,
                "source": source,
                "reference_time": (reference_time or datetime.now()).isoformat(),
                **kwargs
            }
        }
        self.nodes.append(node)
        return node
        
    async def build_indices(self):
        """Mock build_indices implementation."""
        pass
        
    async def clear_data(self):
        """Mock clear_data implementation."""
        self.nodes = []
        self.relationships = []
        
    async def add_entity(self, name: str, entity_type: str, properties: Dict[str, Any]):
        """Mock add_entity implementation."""
        entity = {
            "id": str(uuid.uuid4()),
            "name": name,
            "type": entity_type,
            "properties": properties
        }
        self.nodes.append(entity)
        return entity
        
    async def retrieve_episodes(self, reference_time: datetime, last_n: int = 10, **kwargs) -> List[Dict[str, Any]]:
        """Mock retrieve_episodes implementation."""
        # Return recent nodes as episodes
        return self.nodes[-last_n:] if self.nodes else []

# Create a singleton instance
mock_graphiti_client = MockGraphiti()