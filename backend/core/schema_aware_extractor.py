"""
Schema-aware entity extractor that uses personal schemas to guide Graphiti's extraction.
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

from core.personal_schema import PersonalSchemaManager, EntityTypeDefinition, FieldDefinition
from core.config import settings

logger = logging.getLogger(__name__)


class SchemaAwareExtractor:
    """Extracts entities and relationships using personal schema definitions."""
    
    def __init__(self):
        self.schema_manager = PersonalSchemaManager()
        
    def prepare_extraction_context(self, user_id: str = "default") -> str:
        """
        Create a context prompt that includes the user's schema definitions.
        This will be injected into the journal content to guide Graphiti's extraction.
        """
        schema = self.schema_manager.get_schema(user_id)
        if not schema or not schema.entity_types:
            return ""
            
        # Build schema context
        context_parts = ["=== EXTRACTION SCHEMA ==="]
        context_parts.append("When processing this journal entry, please identify the following types of entities:")
        context_parts.append("")
        
        for entity_name, entity_def in schema.entity_types.items():
            context_parts.append(f"**{entity_name}**")
            if entity_def.description:
                context_parts.append(f"  Description: {entity_def.description}")
            if entity_def.extraction_hints:
                context_parts.append(f"  Look for: {entity_def.extraction_hints}")
            
            # List fields to help with extraction
            if entity_def.fields:
                context_parts.append("  Expected attributes:")
                for field in entity_def.fields:
                    field_desc = f"    - {field.name} ({field.field_type})"
                    if field.description:
                        field_desc += f": {field.description}"
                    context_parts.append(field_desc)
            context_parts.append("")
        
        # Add relationship guidance if available
        if schema.relationship_types:
            context_parts.append("**Relationships to identify:**")
            for rel_name, rel_def in schema.relationship_types.items():
                if isinstance(rel_def, dict):
                    source = rel_def.get('source_type', 'Entity')
                    target = rel_def.get('target_type', 'Entity')
                    description = rel_def.get('description', '')
                    
                    rel_desc = f"  - {rel_name}: connects {source} to {target}"
                    if description:
                        rel_desc += f" ({description})"
                    context_parts.append(rel_desc)
                    
                    # Add extraction hints for relationships
                    if 'extraction_hints' in rel_def:
                        context_parts.append(f"    Look for: {rel_def['extraction_hints']}")
            context_parts.append("")
            
        context_parts.append("=== END SCHEMA ===")
        context_parts.append("")
        
        return "\n".join(context_parts)
    
    def enhance_journal_content(self, content: str, user_id: str = "default", date: Optional[datetime] = None) -> str:
        """
        Enhance journal content with schema context to guide extraction.
        This adds invisible-to-user context that helps the LLM understand what to extract.
        """
        schema_context = self.prepare_extraction_context(user_id)
        
        # Add temporal context if date is provided
        temporal_context = ""
        if date:
            temporal_context = self._prepare_temporal_context(date)
        
        # Combine all contexts
        contexts = [ctx for ctx in [schema_context, temporal_context] if ctx]
        
        if not contexts:
            return content
            
        # Add contexts at the beginning (LLMs pay more attention to the start)
        enhanced_content = "\n".join(contexts) + "\n" + content
        
        return enhanced_content
    
    def _prepare_temporal_context(self, date: datetime) -> str:
        """
        Create temporal context to help with time-based entity and relationship extraction.
        """
        context_parts = ["=== TEMPORAL CONTEXT ==="]
        context_parts.append(f"This journal entry is from: {date.strftime('%A, %B %d, %Y')}")
        context_parts.append(f"Day of week: {date.strftime('%A')}")
        context_parts.append(f"Month: {date.strftime('%B')}")
        context_parts.append(f"Season: {self._get_season(date)}")
        
        # Add temporal hints for extraction
        context_parts.append("")
        context_parts.append("When extracting entities and relationships, consider:")
        context_parts.append("- Events mentioned are happening around this date")
        context_parts.append("- 'Yesterday' refers to " + (date - timedelta(days=1)).strftime('%B %d'))
        context_parts.append("- 'Tomorrow' refers to " + (date + timedelta(days=1)).strftime('%B %d'))
        context_parts.append("- 'Last week' refers to the week of " + (date - timedelta(weeks=1)).strftime('%B %d'))
        context_parts.append("- 'Next week' refers to the week of " + (date + timedelta(weeks=1)).strftime('%B %d'))
        context_parts.append("")
        context_parts.append("=== END TEMPORAL CONTEXT ===")
        context_parts.append("")
        
        return "\n".join(context_parts)
    
    def _get_season(self, date: datetime) -> str:
        """Get the season for a given date (Northern Hemisphere)."""
        month = date.month
        if month in [12, 1, 2]:
            return "Winter"
        elif month in [3, 4, 5]:
            return "Spring"
        elif month in [6, 7, 8]:
            return "Summer"
        else:
            return "Fall/Autumn"
    
    def post_process_extraction(
        self, 
        extraction_result: Dict[str, Any], 
        user_id: str = "default"
    ) -> Dict[str, Any]:
        """
        Post-process Graphiti's extraction results to align with personal schema.
        Maps generic entities to specific types and adds missing attributes.
        """
        schema = self.schema_manager.get_schema(user_id)
        if not schema or not schema.entity_types:
            return extraction_result
            
        # Process entities
        processed_entities = []
        for entity in extraction_result.get('entities', []):
            processed_entity = self._map_entity_to_schema(entity, schema)
            processed_entities.append(processed_entity)
            
        # Process relationships
        processed_relationships = []
        for relationship in extraction_result.get('relationships', []):
            processed_rel = self._map_relationship_to_schema(relationship, schema)
            processed_relationships.append(processed_rel)
            
        # Return enhanced result
        return {
            **extraction_result,
            'entities': processed_entities,
            'relationships': processed_relationships,
            'schema_version': schema.updated_at.isoformat(),
            'schema_applied': True
        }
    
    def _map_entity_to_schema(
        self, 
        entity: Dict[str, Any], 
        schema: Any
    ) -> Dict[str, Any]:
        """Map a generic entity to a schema-defined type."""
        entity_name = entity.get('name', '')
        entity_type = entity.get('type', 'Entity')
        
        # Try to match entity to schema types
        matched_type = None
        for schema_type, type_def in schema.entity_types.items():
            if self._entity_matches_type(entity, type_def):
                matched_type = schema_type
                break
                
        if matched_type:
            # Update entity with schema information
            entity['type'] = matched_type
            entity['schema_type'] = matched_type
            
            # Add color if defined
            if schema.entity_types[matched_type].color:
                entity['color'] = schema.entity_types[matched_type].color
                
            # Add expected fields as placeholders
            type_def = schema.entity_types[matched_type]
            if type_def.fields:
                if 'attributes' not in entity:
                    entity['attributes'] = {}
                for field in type_def.fields:
                    if field.name not in entity['attributes']:
                        # Add placeholder for missing fields
                        entity['attributes'][field.name] = self._get_field_default(field)
                        
        return entity
    
    def _map_relationship_to_schema(
        self, 
        relationship: Dict[str, Any], 
        schema: Any
    ) -> Dict[str, Any]:
        """Map a generic relationship to schema-defined types."""
        rel_type = relationship.get('type', '')
        rel_fact = relationship.get('fact', '').lower()
        
        # First try direct mapping
        if rel_type in schema.relationship_types:
            rel_def = schema.relationship_types[rel_type]
            if isinstance(rel_def, dict):
                relationship['schema_type'] = rel_type
                if 'description' in rel_def:
                    relationship['schema_description'] = rel_def['description']
                return relationship
        
        # Try fuzzy matching based on relationship fact
        for schema_rel_type, rel_def in schema.relationship_types.items():
            if isinstance(rel_def, dict):
                # Check if the fact contains keywords from the relationship name
                if schema_rel_type.lower() in rel_fact:
                    relationship['schema_type'] = schema_rel_type
                    relationship['original_type'] = rel_type
                    if 'description' in rel_def:
                        relationship['schema_description'] = rel_def['description']
                    return relationship
                    
                # Check extraction hints
                if 'extraction_hints' in rel_def:
                    hints = rel_def['extraction_hints'].lower()
                    # Check if any hint keywords appear in the fact
                    hint_keywords = re.findall(r'\b\w+\b', hints)
                    for keyword in hint_keywords:
                        if keyword in rel_fact:
                            relationship['schema_type'] = schema_rel_type
                            relationship['original_type'] = rel_type
                            relationship['confidence'] = 0.8  # Lower confidence for hint-based matching
                            if 'description' in rel_def:
                                relationship['schema_description'] = rel_def['description']
                            return relationship
                    
        return relationship
    
    def _entity_matches_type(
        self, 
        entity: Dict[str, Any], 
        type_def: EntityTypeDefinition
    ) -> bool:
        """
        Determine if an entity matches a schema type definition.
        Uses various heuristics including name patterns and extraction hints.
        """
        entity_name = entity.get('name', '').lower()
        entity_summary = entity.get('summary', '').lower()
        
        # Check extraction hints
        if type_def.extraction_hints:
            hints = type_def.extraction_hints.lower()
            hint_keywords = re.findall(r'\b\w+\b', hints)
            
            for keyword in hint_keywords:
                if keyword in entity_name or keyword in entity_summary:
                    return True
                    
        # Check type name match
        if type_def.name.lower() in entity.get('type', '').lower():
            return True
            
        # Could add more sophisticated matching logic here
        return False
    
    def _get_field_default(self, field: FieldDefinition) -> Any:
        """Get default value for a field based on its type."""
        if not field.required:
            return None
            
        field_type = field.field_type.lower()
        if field_type == 'string':
            return ""
        elif field_type == 'number':
            return 0
        elif field_type == 'boolean':
            return False
        elif field_type == 'list':
            return []
        elif field_type == 'reference':
            return None
        else:
            return None
    
    def extract_typed_entities(
        self, 
        content: str, 
        user_id: str = "default"
    ) -> List[Dict[str, Any]]:
        """
        Extract entities that match the user's schema from raw content.
        This is a simpler pattern-based extraction for quick pre-processing.
        """
        schema = self.schema_manager.get_schema(user_id)
        if not schema or not schema.entity_types:
            return []
            
        extracted_entities = []
        
        for entity_type, type_def in schema.entity_types.items():
            # Simple pattern-based extraction
            if type_def.extraction_hints:
                # Look for patterns in extraction hints
                patterns = self._generate_extraction_patterns(type_def)
                
                for pattern in patterns:
                    matches = re.finditer(pattern, content, re.IGNORECASE)
                    for match in matches:
                        entity = {
                            'name': match.group(0).strip(),
                            'type': entity_type,
                            'schema_type': entity_type,
                            'source': 'pattern_extraction',
                            'confidence': 0.7,  # Pattern-based extraction is less confident
                            'attributes': {}
                        }
                        
                        # Add color if defined
                        if type_def.color:
                            entity['color'] = type_def.color
                            
                        extracted_entities.append(entity)
                        
        return extracted_entities
    
    def _generate_extraction_patterns(
        self, 
        type_def: EntityTypeDefinition
    ) -> List[str]:
        """Generate regex patterns from extraction hints."""
        patterns = []
        
        if type_def.extraction_hints:
            # Extract quoted phrases as literal patterns
            quoted = re.findall(r'"([^"]+)"', type_def.extraction_hints)
            for phrase in quoted:
                # Create pattern that captures the phrase and surrounding context
                pattern = rf'\b{re.escape(phrase)}\b[^.]*'
                patterns.append(pattern)
                
            # Look for "starts with" patterns
            starts_with = re.findall(r'starts? with (\w+)', type_def.extraction_hints, re.IGNORECASE)
            for prefix in starts_with:
                pattern = rf'\b{prefix}\w*\b'
                patterns.append(pattern)
                
        return patterns