"""
Personal schema management for custom entity types.
"""

from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class FieldDefinition(BaseModel):
    """Definition of a field in a custom entity type."""
    name: str
    field_type: str  # string, number, boolean, list, reference
    required: bool = True
    options: Optional[List[str]] = None  # For enum/select fields
    reference_type: Optional[str] = None  # For reference fields (e.g., "Person")
    description: Optional[str] = None

class EntityTypeDefinition(BaseModel):
    """Definition of a custom entity type."""
    name: str
    description: Optional[str] = None
    fields: List[FieldDefinition]
    color: Optional[str] = None  # For UI visualization
    icon: Optional[str] = None  # Icon identifier
    extraction_hints: Optional[str] = None  # Help AI understand what to look for

class PersonalSchema(BaseModel):
    """User's personal schema configuration."""
    user_id: str = "default"  # For future multi-user support
    entity_types: Dict[str, EntityTypeDefinition] = {}
    relationship_types: Dict[str, Dict[str, Any]] = {}
    templates_used: List[str] = []
    is_hybrid: bool = False  # Whether this schema combines multiple templates
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class SchemaTemplate(BaseModel):
    """Pre-built schema template."""
    id: str
    name: str
    description: str
    entity_types: Dict[str, EntityTypeDefinition]
    category: str  # wellness, productivity, creativity, relationships, etc.

# Pre-built templates
SCHEMA_TEMPLATES = {
    "mood_tracker": SchemaTemplate(
        id="mood_tracker",
        name="Mood Tracker",
        description="Track your emotional states and patterns",
        category="wellness",
        entity_types={
            "MoodEntry": EntityTypeDefinition(
                name="MoodEntry",
                description="A record of your emotional state",
                fields=[
                    FieldDefinition(name="mood", field_type="string", description="Primary emotion"),
                    FieldDefinition(name="intensity", field_type="number", description="1-10 scale"),
                    FieldDefinition(name="triggers", field_type="list", description="What triggered this mood"),
                    FieldDefinition(name="time_of_day", field_type="string", options=["morning", "afternoon", "evening", "night"]),
                    FieldDefinition(name="physical_state", field_type="string", required=False)
                ],
                color="#8B5CF6",
                icon="mood",
                extraction_hints="Look for emotional words, feeling statements, mood descriptions"
            )
        }
    ),
    "personal_insights": SchemaTemplate(
        id="personal_insights",
        name="Personal Insights",
        description="Capture realizations and breakthroughs",
        category="growth",
        entity_types={
            "Insight": EntityTypeDefinition(
                name="Insight",
                description="A realization or learning moment",
                fields=[
                    FieldDefinition(name="realization", field_type="string", description="The core insight"),
                    FieldDefinition(name="area", field_type="string", options=["career", "relationships", "health", "spiritual", "creative", "financial"]),
                    FieldDefinition(name="actionable", field_type="boolean", description="Can I act on this?"),
                    FieldDefinition(name="next_steps", field_type="list", required=False),
                    FieldDefinition(name="related_to", field_type="reference", reference_type="Person", required=False)
                ],
                color="#10B981",
                icon="lightbulb",
                extraction_hints="Look for 'I realized', 'I learned', 'I discovered', insights, breakthroughs"
            )
        }
    ),
    "gratitude": SchemaTemplate(
        id="gratitude",
        name="Gratitude Practice",
        description="Track what you're grateful for",
        category="wellness",
        entity_types={
            "Gratitude": EntityTypeDefinition(
                name="Gratitude",
                description="Something you're grateful for",
                fields=[
                    FieldDefinition(name="grateful_for", field_type="string"),
                    FieldDefinition(name="why", field_type="string", required=False),
                    FieldDefinition(name="category", field_type="string", options=["people", "experiences", "things", "opportunities", "lessons"]),
                    FieldDefinition(name="person_involved", field_type="reference", reference_type="Person", required=False)
                ],
                color="#F59E0B",
                icon="heart",
                extraction_hints="Look for 'grateful', 'thankful', 'appreciate', gratitude expressions"
            )
        }
    ),
    "habits": SchemaTemplate(
        id="habits",
        name="Habit Tracker",
        description="Monitor your habits and routines",
        category="productivity",
        entity_types={
            "HabitEntry": EntityTypeDefinition(
                name="HabitEntry",
                description="Record of a habit",
                fields=[
                    FieldDefinition(name="habit", field_type="string"),
                    FieldDefinition(name="completed", field_type="boolean"),
                    FieldDefinition(name="streak_days", field_type="number", required=False),
                    FieldDefinition(name="notes", field_type="string", required=False),
                    FieldDefinition(name="category", field_type="string", options=["health", "productivity", "learning", "creative", "social"])
                ],
                color="#3B82F6",
                icon="check",
                extraction_hints="Look for habit mentions, routines, 'did X today', daily practices"
            )
        }
    )
}

class PersonalSchemaManager:
    """Manages user's personal schema configuration."""
    
    def __init__(self, config_path: str = "./config/personal_schemas"):
        self.config_path = Path(config_path)
        self.config_path.mkdir(parents=True, exist_ok=True)
        
    def get_schema(self, user_id: str = "default") -> PersonalSchema:
        """Get user's personal schema."""
        schema_file = self.config_path / f"{user_id}_schema.json"
        
        if schema_file.exists():
            with open(schema_file, 'r') as f:
                data = json.load(f)
                return PersonalSchema(**data)
        
        return PersonalSchema(user_id=user_id)
    
    def save_schema(self, schema: PersonalSchema):
        """Save user's personal schema."""
        schema.updated_at = datetime.now()
        schema_file = self.config_path / f"{schema.user_id}_schema.json"
        
        with open(schema_file, 'w') as f:
            json.dump(schema.dict(), f, indent=2, default=str)
    
    def add_entity_type(self, user_id: str, entity_type: EntityTypeDefinition):
        """Add a new entity type to user's schema."""
        schema = self.get_schema(user_id)
        schema.entity_types[entity_type.name] = entity_type
        self.save_schema(schema)
        return schema
    
    def remove_entity_type(self, user_id: str, entity_name: str):
        """Remove an entity type from user's schema."""
        schema = self.get_schema(user_id)
        if entity_name in schema.entity_types:
            del schema.entity_types[entity_name]
            self.save_schema(schema)
        return schema
    
    def apply_template(self, user_id: str, template_id: str):
        """Apply a template to user's schema."""
        if template_id not in SCHEMA_TEMPLATES:
            raise ValueError(f"Template {template_id} not found")
        
        template = SCHEMA_TEMPLATES[template_id]
        schema = self.get_schema(user_id)
        
        # Add template entity types to schema
        for name, entity_type in template.entity_types.items():
            schema.entity_types[name] = entity_type
        
        # Track template usage
        if template_id not in schema.templates_used:
            schema.templates_used.append(template_id)
        
        self.save_schema(schema)
        return schema
    
    def get_templates(self) -> List[SchemaTemplate]:
        """Get all available templates."""
        return list(SCHEMA_TEMPLATES.values())
    
    def convert_to_pydantic_models(self, schema: PersonalSchema) -> Dict[str, type]:
        """Convert schema definitions to Pydantic models for Graphiti."""
        models = {}
        
        for entity_name, entity_def in schema.entity_types.items():
            # Create field definitions for Pydantic
            field_definitions = {}
            
            for field in entity_def.fields:
                # Map field types to Python types
                python_type = str  # default
                if field.field_type == "number":
                    python_type = int
                elif field.field_type == "boolean":
                    python_type = bool
                elif field.field_type == "list":
                    python_type = List[str]
                
                # Handle optional fields
                if not field.required:
                    python_type = Optional[python_type]
                
                field_definitions[field.name] = (python_type, Field(description=field.description))
            
            # Dynamically create Pydantic model
            models[entity_name] = type(
                entity_name,
                (BaseModel,),
                {
                    "__annotations__": {k: v[0] for k, v in field_definitions.items()},
                    **{k: v[1] for k, v in field_definitions.items()}
                }
            )
        
        return models