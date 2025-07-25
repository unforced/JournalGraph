"""
Admin endpoints for database management.
"""

from fastapi import APIRouter, HTTPException
import logging
import os
from pathlib import Path
from core.graphiti_client import graphiti_client
from core.personal_schema import PersonalSchemaManager
from core.import_history import import_history_manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.delete("/clear-database")
async def clear_database():
    """Clear all data from the Neo4j database."""
    try:
        if not graphiti_client.driver:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        async with graphiti_client.driver.session() as session:
            # Delete all nodes and relationships
            await session.run("MATCH (n) DETACH DELETE n")
            
            # Verify deletion
            result = await session.run("MATCH (n) RETURN count(n) as count")
            record = await result.single()
            count = record["count"]
            
            if count > 0:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to clear database. {count} nodes remain."
                )
        
        logger.info("Database cleared successfully")
        return {"message": "Database cleared successfully"}
        
    except Exception as e:
        logger.error(f"Error clearing database: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_database_stats():
    """Get statistics about the database."""
    try:
        if not graphiti_client.driver:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        async with graphiti_client.driver.session() as session:
            # Get node counts by type
            node_stats_query = """
            MATCH (n)
            WITH labels(n) as nodeLabels, count(n) as count
            UNWIND nodeLabels as label
            RETURN label, sum(count) as count
            ORDER BY count DESC
            """
            
            node_result = await session.run(node_stats_query)
            node_stats = {}
            async for record in node_result:
                node_stats[record["label"]] = record["count"]
            
            # Get relationship counts
            rel_stats_query = """
            MATCH ()-[r]->()
            RETURN type(r) as type, count(r) as count
            ORDER BY count DESC
            """
            
            rel_result = await session.run(rel_stats_query)
            rel_stats = {}
            async for record in rel_result:
                rel_stats[record["type"]] = record["count"]
            
            # Get total counts
            total_query = """
            MATCH (n)
            WITH count(n) as nodeCount
            OPTIONAL MATCH ()-[r]->()
            RETURN nodeCount, count(r) as relCount
            """
            
            total_result = await session.run(total_query)
            totals = await total_result.single()
            
            return {
                "total_nodes": totals["nodeCount"],
                "total_relationships": totals["relCount"],
                "nodes_by_type": node_stats,
                "relationships_by_type": rel_stats
            }
            
    except Exception as e:
        logger.error(f"Error getting database stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reset-all")
async def reset_all_data():
    """Reset all data: clear database and remove personal schema."""
    try:
        # Clear Neo4j database
        if graphiti_client.driver:
            async with graphiti_client.driver.session() as session:
                await session.run("MATCH (n) DETACH DELETE n")
                logger.info("Neo4j database cleared")
        
        # Clear personal schema
        schema_manager = PersonalSchemaManager()
        
        # Get config directory
        config_path = Path("config")
        if not config_path.exists():
            config_path = Path("/app/config")  # Docker path
        
        # Remove all schema files
        if config_path.exists():
            for schema_file in config_path.glob("*_schema.json"):
                try:
                    schema_file.unlink()
                    logger.info(f"Removed schema file: {schema_file}")
                except Exception as e:
                    logger.error(f"Error removing schema file {schema_file}: {e}")
        
        # Reset the in-memory schema
        default_schema = schema_manager.get_schema("default")
        default_schema.entity_types = {}
        default_schema.relationship_types = {}
        default_schema.templates_used = []
        schema_manager.save_schema(default_schema)
        
        # Clear import history
        import_history_manager.clear_history()
        logger.info("Import history cleared")
        
        return {
            "message": "All data cleared successfully",
            "details": {
                "database_cleared": True,
                "schemas_cleared": True,
                "import_history_cleared": True
            }
        }
        
    except Exception as e:
        logger.error(f"Error resetting all data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))