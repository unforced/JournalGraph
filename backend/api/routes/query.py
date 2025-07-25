"""
Query endpoints for knowledge graph.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import logging
from core.graphiti_client import graphiti_client

router = APIRouter()
logger = logging.getLogger(__name__)


class QueryRequest(BaseModel):
    """Request model for graph queries."""
    query: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    entity_types: Optional[List[str]] = None
    limit: int = 50


class GraphNode(BaseModel):
    """Model for graph nodes."""
    id: str
    type: str
    label: str
    properties: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    """Model for graph edges."""
    source: str
    target: str
    type: str
    properties: Dict[str, Any] = {}


class QueryResponse(BaseModel):
    """Response model for graph queries."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    query_time_ms: float


@router.post("/search", response_model=QueryResponse)
async def search_graph(request: QueryRequest):
    """Search the knowledge graph with natural language."""
    try:
        import time
        start_time = time.time()
        
        # Use Graphiti's search functionality
        search_results = await graphiti_client.search_graph(
            query=request.query,
            start_date=request.start_date,
            end_date=request.end_date
        )
        
        # Convert search results to nodes and edges
        nodes = []
        edges = []
        node_ids = set()
        
        for result in search_results:
            result_type = result.get("type", "")
            
            # Check if it's an edge/relationship
            if "source_uuid" in result and "target_uuid" in result:
                edges.append(GraphEdge(
                    source=result["source_uuid"],
                    target=result["target_uuid"],
                    type=result_type,
                    properties={
                        "fact": result.get("fact", ""),
                        "created_at": str(result.get("created_at", ""))
                    }
                ))
                # Track node IDs from edges to fetch them later
                node_ids.add(result["source_uuid"])
                node_ids.add(result["target_uuid"])
            else:
                # It's a node
                node_id = result.get("uuid") or result.get("id") or f"temp_{len(nodes)}"
                nodes.append(GraphNode(
                    id=node_id,
                    type=result_type,
                    label=result.get("name", ""),
                    properties={
                        "summary": result.get("summary", ""),
                        "created_at": str(result.get("created_at", ""))
                    }
                ))
                node_ids.add(node_id)
        
        # Fetch any missing nodes referenced in edges
        if node_ids and graphiti_client.driver:
            async with graphiti_client.driver.session() as session:
                missing_ids = node_ids - {n.id for n in nodes}
                if missing_ids:
                    node_query = """
                    MATCH (n)
                    WHERE n.uuid IN $node_ids
                    RETURN n
                    """
                    result = await session.run(node_query, node_ids=list(missing_ids))
                    
                    async for record in result:
                        node = record["n"]
                        labels = list(node.labels)
                        node_type = labels[0] if labels else "Entity"
                        
                        nodes.append(GraphNode(
                            id=node.get("uuid", ""),
                            type=node_type,
                            label=node.get("name", ""),
                            properties={
                                "summary": node.get("summary", ""),
                                "created_at": str(node.get("created_at", ""))
                            }
                        ))
        
        query_time_ms = (time.time() - start_time) * 1000
        
        return QueryResponse(
            nodes=nodes,
            edges=edges,
            query_time_ms=query_time_ms
        )
        
    except Exception as e:
        logger.error(f"Error searching graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph", response_model=QueryResponse)
async def get_graph():
    """Get all nodes and edges from the knowledge graph."""
    try:
        if not graphiti_client.driver:
            raise HTTPException(status_code=500, detail="Graph database not connected")
        
        nodes = []
        edges = []
        
        async with graphiti_client.driver.session() as session:
            # Fetch all nodes
            node_query = """
            MATCH (n)
            WHERE n.uuid IS NOT NULL
            RETURN n
            LIMIT 1000
            """
            node_result = await session.run(node_query)
            
            async for record in node_result:
                node = record["n"]
                # Get node labels (entity types)
                labels = list(node.labels)
                node_type = labels[0] if labels else "Entity"
                
                nodes.append(GraphNode(
                    id=node.get("uuid", ""),
                    type=node_type,
                    label=node.get("name", ""),
                    properties={
                        "summary": node.get("summary", ""),
                        "created_at": str(node.get("created_at", "")),
                    }
                ))
            
            # Fetch all relationships
            edge_query = """
            MATCH (n1)-[r]->(n2)
            WHERE n1.uuid IS NOT NULL AND n2.uuid IS NOT NULL
            RETURN n1.uuid as source, n2.uuid as target, r
            LIMIT 2000
            """
            edge_result = await session.run(edge_query)
            
            async for record in edge_result:
                rel = record["r"]
                edges.append(GraphEdge(
                    source=record["source"],
                    target=record["target"], 
                    type=rel.type,
                    properties={
                        "fact": dict(rel).get("fact", ""),
                        "created_at": str(dict(rel).get("created_at", "")),
                    }
                ))
        
        return QueryResponse(
            nodes=nodes,
            edges=edges,
            query_time_ms=0.0
        )
        
    except Exception as e:
        logger.error(f"Error fetching graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeline")
async def get_timeline(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get timeline view of journal entries."""
    try:
        if not graphiti_client.driver:
            raise HTTPException(status_code=500, detail="Graph database not connected")
        
        entries = []
        
        async with graphiti_client.driver.session() as session:
            # Fetch episodes (journal entries) with their data
            timeline_query = """
            MATCH (e:Episodic)
            OPTIONAL MATCH (e)-[:MENTIONS]->(entity)
            WITH e, COLLECT(DISTINCT {
                uuid: entity.uuid,
                name: entity.name,
                type: CASE 
                    WHEN 'Person' IN labels(entity) THEN 'Person'
                    WHEN 'Project' IN labels(entity) THEN 'Project'
                    WHEN 'Concept' IN labels(entity) THEN 'Concept'
                    WHEN 'Event' IN labels(entity) THEN 'Event'
                    WHEN 'Task' IN labels(entity) THEN 'Task'
                    ELSE 'Entity'
                END,
                summary: entity.summary
            }) as entities
            WITH e, entities, SIZE(entities) as entity_count
            OPTIONAL MATCH (entity1)<-[:MENTIONS]-(e)-[:MENTIONS]->(entity2)
            WHERE entity1.uuid < entity2.uuid
            WITH e, entities, entity_count, COUNT(DISTINCT entity1) + COUNT(DISTINCT entity2) as relationship_count
            RETURN e, entities, entity_count, relationship_count
            ORDER BY e.name DESC
            LIMIT 100
            """
            
            result = await session.run(timeline_query)
            
            async for record in result:
                episode = record["e"]
                entities = record["entities"]
                entity_count = record["entity_count"]
                relationship_count = record["relationship_count"]
                # Try different date fields that might exist
                date_value = episode.get("reference_time") or episode.get("created_at") or ""
                # If date exists, format it properly
                if date_value:
                    # Convert Neo4j datetime to string if needed
                    date_str = str(date_value)
                else:
                    # Try to extract date from the name (e.g., "Journal Entry - 2024-01-15")
                    name = episode.get("name", "")
                    if " - " in name:
                        date_str = name.split(" - ")[-1]
                    else:
                        date_str = ""
                
                # Filter out null entities
                valid_entities = [e for e in entities if e.get("uuid") is not None]
                
                entries.append({
                    "id": episode.get("uuid", ""),
                    "name": episode.get("name", ""),
                    "date": date_str,
                    "content": episode.get("content", ""),
                    "source_description": episode.get("source_description", ""),
                    "entity_count": entity_count,
                    "relationship_count": relationship_count,
                    "entities": valid_entities
                })
        
        return {
            "entries": entries,
            "total": len(entries)
        }
        
    except Exception as e:
        logger.error(f"Error fetching timeline: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class EntryGraphRequest(BaseModel):
    """Request model for entry-specific graph data."""
    entry_id: str
    entity_ids: List[str]


@router.post("/entry-graph", response_model=QueryResponse)
async def get_entry_graph(request: EntryGraphRequest):
    """Get graph data for a specific journal entry."""
    try:
        if not graphiti_client.driver:
            raise HTTPException(status_code=500, detail="Graph database not connected")
        
        nodes = []
        edges = []
        
        async with graphiti_client.driver.session() as session:
            # Fetch the entry node and its entities
            node_query = """
            MATCH (e:Episodic {uuid: $entry_id})
            OPTIONAL MATCH (e)-[:MENTIONS]->(entity)
            WITH e, COLLECT(entity) as entities
            UNWIND [e] + entities as node
            WITH node
            WHERE node IS NOT NULL
            RETURN DISTINCT node
            """
            
            node_result = await session.run(
                node_query, 
                entry_id=request.entry_id
            )
            
            async for record in node_result:
                node = record["node"]
                labels = list(node.labels)
                node_type = labels[0] if labels else "Entity"
                
                nodes.append(GraphNode(
                    id=node.get("uuid", ""),
                    type=node_type,
                    label=node.get("name", ""),
                    properties={
                        "summary": node.get("summary", ""),
                        "created_at": str(node.get("created_at", "")),
                        "content": node.get("content", "") if node_type == "Episodic" else ""
                    }
                ))
            
            # Fetch relationships between the entities
            edge_query = """
            MATCH (e:Episodic {uuid: $entry_id})-[:MENTIONS]->(entity1)
            OPTIONAL MATCH (entity1)-[r]-(entity2)
            WHERE entity2.uuid IN $entity_ids
            AND id(entity1) < id(entity2)
            RETURN entity1.uuid as source, entity2.uuid as target, r, type(r) as rel_type
            """
            
            edge_result = await session.run(
                edge_query,
                entry_id=request.entry_id,
                entity_ids=request.entity_ids
            )
            
            async for record in edge_result:
                if record["r"] is not None:
                    edges.append(GraphEdge(
                        source=record["source"],
                        target=record["target"],
                        type=record["rel_type"],
                        properties={
                            "fact": dict(record["r"]).get("fact", ""),
                            "created_at": str(dict(record["r"]).get("created_at", "")),
                        }
                    ))
        
        return QueryResponse(
            nodes=nodes,
            edges=edges,
            query_time_ms=0.0
        )
        
    except Exception as e:
        logger.error(f"Error fetching entry graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/entity/{entity_id}/subgraph")
async def get_entity_subgraph(entity_id: str):
    """Get the subgraph for a specific entity, showing its immediate connections."""
    try:
        if not graphiti_client.driver:
            raise HTTPException(status_code=500, detail="Graph database not connected")
        
        nodes = []
        edges = []
        
        async with graphiti_client.driver.session() as session:
            # Fetch the entity and its immediate neighbors
            subgraph_query = """
            MATCH (center {uuid: $entity_id})
            OPTIONAL MATCH (center)-[r]-(connected)
            WITH center, COLLECT(DISTINCT connected) as neighbors, COLLECT(DISTINCT r) as relationships
            
            // Return center node
            WITH center, neighbors, relationships
            UNWIND [center] + neighbors as node
            WITH DISTINCT node, center, relationships
            WHERE node IS NOT NULL
            RETURN 
                node.uuid as id,
                labels(node) as labels,
                node.name as name,
                node.summary as summary,
                node.uuid = $entity_id as isCenter
            """
            
            node_result = await session.run(subgraph_query, entity_id=entity_id)
            
            center_found = False
            async for record in node_result:
                labels = record["labels"]
                node_type = labels[0] if labels else "Entity"
                
                if record["isCenter"]:
                    center_found = True
                
                nodes.append({
                    "id": record["id"],
                    "type": node_type,
                    "label": record["name"] or "Unknown",
                    "summary": record["summary"],
                    "isCenter": record["isCenter"]
                })
            
            if not center_found:
                raise HTTPException(status_code=404, detail="Entity not found")
            
            # Fetch relationships
            rel_query = """
            MATCH (center {uuid: $entity_id})-[r]-(connected)
            RETURN 
                center.uuid as source,
                connected.uuid as target,
                type(r) as rel_type,
                r.fact as fact,
                startNode(r).uuid = center.uuid as outgoing
            """
            
            rel_result = await session.run(rel_query, entity_id=entity_id)
            
            async for record in rel_result:
                # Normalize direction - always from source to target
                if record["outgoing"]:
                    source = record["source"]
                    target = record["target"]
                else:
                    source = record["target"]
                    target = record["source"]
                
                edges.append({
                    "source": source,
                    "target": target,
                    "type": record["rel_type"],
                    "fact": record["fact"] or ""
                })
        
        return {
            "nodes": nodes,
            "edges": edges
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching entity subgraph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))