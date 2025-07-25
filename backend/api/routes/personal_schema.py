"""
API endpoints for personal schema management.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
import logging

from core.personal_schema import (
    PersonalSchemaManager,
    EntityTypeDefinition,
    FieldDefinition,
    PersonalSchema,
    SchemaTemplate
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize schema manager
schema_manager = PersonalSchemaManager()

class AddEntityTypeRequest(BaseModel):
    """Request to add a new entity type."""
    entity_type: EntityTypeDefinition

class ApplyTemplateRequest(BaseModel):
    """Request to apply a template."""
    template_id: str

@router.get("/")
async def get_personal_schema(user_id: str = "default"):
    """Get user's personal schema configuration."""
    try:
        schema = schema_manager.get_schema(user_id)
        return schema.dict()
    except Exception as e:
        logger.error(f"Error getting personal schema: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def get_schema_templates():
    """Get all available schema templates."""
    try:
        templates = schema_manager.get_templates()
        return [t.dict() for t in templates]
    except Exception as e:
        logger.error(f"Error getting templates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/entity-types")
async def add_entity_type(request: AddEntityTypeRequest, user_id: str = "default"):
    """Add a new entity type to user's schema."""
    try:
        schema = schema_manager.add_entity_type(user_id, request.entity_type)
        return {
            "success": True,
            "message": f"Added entity type '{request.entity_type.name}'",
            "schema": schema.dict()
        }
    except Exception as e:
        logger.error(f"Error adding entity type: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/entity-types/{entity_name}")
async def remove_entity_type(entity_name: str, user_id: str = "default"):
    """Remove an entity type from user's schema."""
    try:
        schema = schema_manager.remove_entity_type(user_id, entity_name)
        return {
            "success": True,
            "message": f"Removed entity type '{entity_name}'",
            "schema": schema.dict()
        }
    except Exception as e:
        logger.error(f"Error removing entity type: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/apply-template")
async def apply_template(request: ApplyTemplateRequest, user_id: str = "default"):
    """Apply a schema template."""
    try:
        schema = schema_manager.apply_template(user_id, request.template_id)
        return {
            "success": True,
            "message": f"Applied template '{request.template_id}'",
            "schema": schema.dict()
        }
    except Exception as e:
        logger.error(f"Error applying template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/entity-types/{entity_name}")
async def get_entity_type(entity_name: str, user_id: str = "default"):
    """Get details of a specific entity type."""
    try:
        schema = schema_manager.get_schema(user_id)
        if entity_name not in schema.entity_types:
            raise HTTPException(status_code=404, detail=f"Entity type '{entity_name}' not found")
        
        return schema.entity_types[entity_name].dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting entity type: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))