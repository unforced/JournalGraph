"""
Graphiti client for processing journal entries into knowledge graphs.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio

try:
    from graphiti_core import Graphiti
    from graphiti_core.nodes import EpisodeType
    from neo4j import AsyncGraphDatabase
    GRAPHITI_AVAILABLE = True
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning("graphiti_core not available, using mock implementation")
    GRAPHITI_AVAILABLE = False
    from .mock_graphiti import mock_graphiti_client
    EpisodeType = None
    AsyncGraphDatabase = None

# We'll configure the clients during initialization

from core.config import settings
from core.schema_aware_extractor import SchemaAwareExtractor

logger = logging.getLogger(__name__)


class JournalGraphitiClient:
    """Client for processing journal entries with Graphiti."""
    
    def __init__(self):
        self.graphiti: Optional[Graphiti] = None
        self.driver = None
        self.llm_client = None
        self.schema_extractor = SchemaAwareExtractor()
        
    async def initialize(self):
        """Initialize Graphiti with Neo4j and Gemini."""
        try:
            logger.info("Initializing Graphiti client...")
            
            # If Graphiti is not available, use mock
            if not GRAPHITI_AVAILABLE:
                logger.warning("Using mock Graphiti implementation")
                self.graphiti = mock_graphiti_client
                await self.graphiti.initialize()
                self.driver = self.graphiti.driver
                # Set up mock EpisodeType
                global EpisodeType
                EpisodeType = self.graphiti.episode_type
                return
            
            # Import the correct Gemini/Google clients
            try:
                from graphiti_core.llm_client.config import LLMConfig
                from graphiti_core.llm_client.gemini_client import GeminiClient
                from graphiti_core.embedder.gemini import GeminiEmbedder, GeminiEmbedderConfig
                from graphiti_core.cross_encoder.gemini_reranker_client import GeminiRerankerClient
                logger.info("Successfully imported Gemini clients")
            except ImportError as e:
                logger.error(f"Failed to import Gemini clients: {e}")
                # Final fallback - use default Graphiti with just API key
                logger.warning("Will try basic initialization without custom clients")
                GeminiClient = None
                GeminiEmbedder = None
                GeminiRerankerClient = None
                LLMConfig = None
            
            # Initialize Gemini LLM client if available
            if GeminiClient and LLMConfig:
                llm_config = LLMConfig(
                    api_key=settings.GEMINI_API_KEY,
                    model="gemini-2.5-flash"  # Using Gemini 2.5 Flash
                )
                self.llm_client = GeminiClient(llm_config)
            else:
                self.llm_client = None
            
            # Initialize Neo4j driver
            if AsyncGraphDatabase:
                self.driver = AsyncGraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
                )
            else:
                self.driver = None
            
            # Test Neo4j connection
            async with self.driver.session() as session:
                result = await session.run("RETURN 1 as test")
                test = await result.single()
                logger.info(f"Neo4j connection test: {test}")
            
            # Initialize Gemini Embedder if available
            if GeminiEmbedder and GeminiEmbedderConfig:
                embedder_config = GeminiEmbedderConfig(
                    api_key=settings.GEMINI_API_KEY,
                    embedding_model="text-embedding-004"  # Latest Gemini embedding model
                )
                embedder = GeminiEmbedder(embedder_config)
            else:
                embedder = None
            
            # Initialize Gemini Cross-Encoder (Reranker) if available
            # DISABLED: The reranker is hardcoded to use gemini-2.5-flash-lite-preview-06-17
            # which has strict rate limits. We'll disable it for now.
            cross_encoder = None
            # if GeminiRerankerClient and LLMConfig:
            #     reranker_config = LLMConfig(
            #         api_key=settings.GEMINI_API_KEY,
            #         model="gemini-2.5-flash"  # Using Gemini 2.5 Flash for reranking
            #     )
            #     cross_encoder = GeminiRerankerClient(reranker_config)
            # else:
            #     cross_encoder = None
            
            # Initialize Graphiti
            # Build kwargs based on what's available
            graphiti_kwargs = {
                "uri": settings.NEO4J_URI,
                "user": settings.NEO4J_USER,
                "password": settings.NEO4J_PASSWORD,
                "store_raw_episode_content": True,  # Store original journal content
            }
            
            if self.llm_client:
                graphiti_kwargs["llm_client"] = self.llm_client
            if embedder:
                graphiti_kwargs["embedder"] = embedder
            if cross_encoder:
                graphiti_kwargs["cross_encoder"] = cross_encoder
            
            # If we don't have custom clients, try to pass API key directly
            if not self.llm_client and settings.GEMINI_API_KEY:
                # Try to use environment variable approach
                import os
                os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
                logger.info("Set GOOGLE_API_KEY environment variable for Graphiti")
            
            self.graphiti = Graphiti(**graphiti_kwargs)
            
            # Create indexes for better performance
            await self.graphiti.build_indices_and_constraints()
            
            logger.info("Graphiti client initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Graphiti: {str(e)}")
            raise
    
    async def process_journal_entry(
        self, 
        content: str, 
        date: datetime,
        source_file: str,
        user_id: str = "default"
    ) -> Dict[str, Any]:
        """Process a single journal entry with schema awareness."""
        if not self.graphiti:
            raise RuntimeError("Graphiti client not initialized")
        
        try:
            # Enhance content with schema context and temporal information
            enhanced_content = self.schema_extractor.enhance_journal_content(content, user_id, date)
            
            # Create episode from journal entry
            result = await self.graphiti.add_episode(
                name=f"Journal Entry - {date.strftime('%Y-%m-%d')}",
                episode_body=enhanced_content,
                source_description=f"Daily journal entry from {date.strftime('%B %d, %Y')}",
                reference_time=date,
                source=EpisodeType.text,
            )
            
            # Extract nodes and edges from the result
            episode = result.episode
            nodes = result.nodes
            edges = result.edges
            
            # Build initial result
            extraction_result = {
                "episode_id": episode.uuid,
                "date": date.isoformat(),
                "entities_extracted": len(nodes),
                "relationships_extracted": len(edges),
                "entities": [
                    {
                        "name": node.name,
                        "type": ', '.join(node.labels) if node.labels else 'Entity',
                        "summary": node.summary if hasattr(node, 'summary') else ''
                    } for node in nodes
                ],
                "relationships": [
                    {
                        "source_uuid": edge.source_node_uuid,
                        "target_uuid": edge.target_node_uuid,
                        "type": edge.name,
                        "fact": edge.fact
                    } for edge in edges
                ]
            }
            
            # Post-process with schema mapping
            final_result = self.schema_extractor.post_process_extraction(
                extraction_result, 
                user_id
            )
            
            return final_result
            
        except Exception as e:
            logger.error(f"Error processing journal entry: {str(e)}")
            raise
    
    async def search_graph(
        self, 
        query: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Search the knowledge graph."""
        if not self.graphiti:
            raise RuntimeError("Graphiti client not initialized")
        
        try:
            # Build search parameters
            search_params = {}
            if start_date and end_date:
                search_params['time_range'] = (start_date, end_date)
            
            # Search using Graphiti
            results = await self.graphiti.search(
                query=query,
                **search_params
            )
            
            # Format results
            formatted_results = []
            for result in results:
                # Handle different result types (EntityNode, EntityEdge, etc.)
                result_dict = {
                    "type": getattr(result, 'label', result.__class__.__name__),
                    "name": getattr(result, 'name', ''),
                    "summary": getattr(result, 'summary', ''),
                    "created_at": getattr(result, 'created_at', ''),
                }
                
                # Add edge-specific fields if it's an edge
                if hasattr(result, 'fact'):
                    result_dict["fact"] = result.fact
                if hasattr(result, 'source_node_uuid'):
                    result_dict["source_uuid"] = result.source_node_uuid
                    result_dict["target_uuid"] = result.target_node_uuid
                    
                formatted_results.append(result_dict)
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching graph: {str(e)}")
            raise
    
    async def get_schema_suggestions(self, sample_content: List[str]) -> Dict[str, Any]:
        """Get schema suggestions based on sample content."""
        if not self.graphiti:
            raise RuntimeError("Graphiti client not initialized")
        
        try:
            # Combine sample content
            combined_content = "\n\n---\n\n".join(sample_content[:5])  # Use first 5 entries
            
            # Ask LLM to suggest entity types
            prompt = f"""
            Analyze these journal entries and suggest entity types that would be useful for a personal knowledge graph.
            
            Journal samples:
            {combined_content}
            
            Suggest 5-10 entity types (like Person, Project, Concept, etc.) that would capture the key information in these journals.
            For each entity type, provide a brief description.
            
            Format as JSON:
            {{
                "entity_types": [
                    {{"name": "TypeName", "description": "Brief description", "color": "#hexcolor"}}
                ]
            }}
            """
            
            # For schema suggestions, we'll use the LLM client directly
            if self.llm_client:
                # Try to use the LLM client's generate method
                try:
                    response = await self.llm_client.generate_response(prompt)
                    return response
                except AttributeError:
                    # If that doesn't work, return a basic schema
                    logger.warning("LLM client doesn't have generate_response method, returning default schema")
            
            # Return a default schema if we can't use the LLM
            return {
                "entity_types": [
                    {"name": "Person", "description": "People mentioned in journals", "color": "#FF6B6B"},
                    {"name": "Project", "description": "Projects and work items", "color": "#4ECDC4"},
                    {"name": "Concept", "description": "Ideas and concepts", "color": "#45B7D1"},
                    {"name": "Event", "description": "Events and meetings", "color": "#96CEB4"},
                    {"name": "Task", "description": "Tasks and to-dos", "color": "#FECA57"}
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting schema suggestions: {str(e)}")
            raise
    
    async def close(self):
        """Close connections."""
        if self.driver:
            await self.driver.close()


# Global instance
graphiti_client = JournalGraphitiClient()