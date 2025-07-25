"""
Knowledge structure discovery and analysis endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging
from datetime import datetime

from core.knowledge_structures import (
    get_all_structures,
    get_structure_by_id,
    analyze_content_for_structures,
    suggest_hybrid_structure
)
from core.graphiti_client import graphiti_client
from core.personal_schema import (
    PersonalSchemaManager,
    EntityTypeDefinition,
    FieldDefinition
)
from core.adaptive_structure_discovery import AdaptiveStructureDiscovery

router = APIRouter()
logger = logging.getLogger(__name__)


class AnalyzeRequest(BaseModel):
    """Request model for content analysis."""
    sample_entries: List[str]
    user_context: Optional[Dict[str, Any]] = {}


class StructureSuggestion(BaseModel):
    """Suggestion for a knowledge structure."""
    structure_id: str
    name: str
    description: str
    relevance_score: float
    matching_patterns: List[str]
    sample_entities: List[Dict[str, str]]


class ConversationStartRequest(BaseModel):
    """Request to start structure discovery conversation."""
    sample_entries: List[str]
    initial_preferences: Optional[Dict[str, Any]] = {}


class ConversationContinueRequest(BaseModel):
    """Request to continue the conversation."""
    conversation_id: str
    user_response: str
    selected_structure_id: Optional[str] = None


class ConversationResponse(BaseModel):
    """Response from structure discovery conversation."""
    conversation_id: str
    current_question: str
    suggestions: List[StructureSuggestion]
    analysis_insights: Dict[str, Any]
    recommended_structures: List[str]


class ApplyStructureRequest(BaseModel):
    """Request to apply a chosen structure."""
    structure_id: Optional[str] = None
    custom_structure: Optional[Dict[str, Any]] = None
    entity_types: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]


@router.get("/structures")
async def get_available_structures():
    """Get all available knowledge structure templates."""
    structures = get_all_structures()
    return {
        "structures": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "author": s.author,
                "entity_count": len(s.entity_types),
                "relationship_count": len(s.relationships)
            }
            for s in structures
        ]
    }


@router.get("/structures/{structure_id}")
async def get_structure_details(structure_id: str):
    """Get detailed information about a specific structure."""
    structure = get_structure_by_id(structure_id)
    if not structure:
        raise HTTPException(status_code=404, detail="Structure not found")
    
    return {
        "id": structure.id,
        "name": structure.name,
        "description": structure.description,
        "author": structure.author,
        "entity_types": [
            {
                "name": et.name,
                "description": et.description,
                "color": et.color,
                "icon": et.icon,
                "suggested_properties": et.suggested_properties
            }
            for et in structure.entity_types
        ],
        "relationships": [
            {
                "name": r.name,
                "description": r.description,
                "source_types": r.source_types,
                "target_types": r.target_types,
                "properties": r.properties
            }
            for r in structure.relationships
        ],
        "suggested_questions": structure.suggested_questions,
        "example_patterns": structure.example_patterns
    }


@router.post("/analyze")
async def analyze_journal_content(request: AnalyzeRequest):
    """Analyze journal content and suggest appropriate structures."""
    try:
        # Analyze content for structure matches
        scores = analyze_content_for_structures(request.sample_entries)
        
        # Get top matching structures
        suggestions = []
        for structure_id, score in scores.items():
            if score > 0.1:  # Only include relevant structures
                structure = get_structure_by_id(structure_id)
                
                # Find which patterns matched
                combined_content = " ".join(request.sample_entries).lower()
                matching_patterns = [
                    p for p in structure.example_patterns 
                    if p.lower() in combined_content
                ]
                
                # Extract sample entities based on patterns
                sample_entities = []
                for entry in request.sample_entries[:3]:  # First 3 entries
                    # This is simplified - in production, use NLP
                    for pattern in matching_patterns[:3]:
                        if pattern in entry.lower():
                            sample_entities.append({
                                "text": pattern,
                                "type": structure.entity_types[0].name if structure.entity_types else "Unknown",
                                "context": entry[:100] + "..."
                            })
                
                suggestions.append(StructureSuggestion(
                    structure_id=structure_id,
                    name=structure.name,
                    description=structure.description,
                    relevance_score=score,
                    matching_patterns=matching_patterns,
                    sample_entities=sample_entities
                ))
        
        # Sort by relevance
        suggestions.sort(key=lambda x: x.relevance_score, reverse=True)
        
        # Generate insights
        insights = {
            "total_entries_analyzed": len(request.sample_entries),
            "dominant_patterns": _extract_dominant_patterns(request.sample_entries),
            "suggested_approach": _suggest_approach(scores),
            "content_themes": _analyze_themes(request.sample_entries)
        }
        
        return {
            "suggestions": suggestions[:5],  # Top 5 suggestions
            "insights": insights,
            "hybrid_recommendation": suggest_hybrid_structure(
                request.sample_entries, 
                request.user_context
            )
        }
        
    except Exception as e:
        logger.error(f"Error analyzing content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/adaptive-discovery")
async def discover_adaptive_structure(request: ConversationStartRequest):
    """
    Discover a personalized knowledge structure by analyzing user's actual content.
    This creates a structure unique to the user, inspired by but not constrained to existing systems.
    """
    try:
        logger.info(f"Starting adaptive discovery with {len(request.sample_entries)} entries")
        
        # Initialize adaptive discovery
        discoverer = AdaptiveStructureDiscovery()
        
        # Convert entries to format expected by discoverer
        entries = []
        for i, entry_content in enumerate(request.sample_entries):
            entries.append({
                'content': entry_content,
                'date': datetime.now().isoformat()  # Would be actual dates in production
            })
            logger.debug(f"Entry {i}: {len(entry_content)} chars")
        
        # Perform deep analysis
        logger.info("Analyzing content...")
        analysis = discoverer.analyze_content(entries)
        logger.info(f"Analysis complete. Found {len(analysis.get('discovered_entities', {}))} entity types")
        
        # Build response with discovered structure
        discovered_structure = analysis['recommended_structure']
        
        return {
            "status": "discovered",
            "message": "I've analyzed your journal entries and discovered your unique patterns",
            "discovered_structure": discovered_structure,
            "analysis_details": {
                "entities_found": analysis['discovered_entities'],
                "relationships_found": analysis['discovered_relationships'],
                "unique_patterns": analysis['unique_patterns'],
                "temporal_patterns": analysis['temporal_patterns'],
                "themes": analysis['writing_themes'],
                "inspiration_from": analysis['structure_inspiration']
            },
            "next_steps": [
                "Review the discovered structure",
                "Customize entity types if needed",
                "Add or modify relationship types",
                "Start importing your journals"
            ]
        }
        
    except Exception as e:
        import traceback
        logger.error(f"Error in adaptive discovery: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error(f"Request data: {request.sample_entries}")
        raise HTTPException(status_code=500, detail=f"Error in adaptive discovery: {str(e)}")


@router.post("/conversation/start")
async def start_structure_conversation(request: ConversationStartRequest):
    """Start an interactive conversation to discover the best structure."""
    try:
        # Generate conversation ID
        conversation_id = f"conv_{datetime.now().timestamp()}"
        
        # Extract actual quotes and patterns from user's entries
        actual_quotes = _extract_actual_quotes(request.sample_entries)
        user_patterns = _identify_user_patterns(request.sample_entries)
        
        # Initial analysis
        scores = analyze_content_for_structures(request.sample_entries)
        top_structures = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Build a more personalized initial question
        if user_patterns["people_mentioned"]:
            people_str = ", ".join(user_patterns["people_mentioned"][:3])
            current_question = f"I noticed you mention several people like {people_str} in your journals. "
        elif user_patterns["activities"]:
            current_question = f"I see you write about various activities in your journals. "
        else:
            current_question = "Based on your journal entries, "
            
        current_question += "What aspects of your life are most important for you to track and connect? I can help you build a custom knowledge structure that fits your unique needs."
        
        # Create suggestions with actual patterns from user's content
        suggestions = []
        for structure_id, score in top_structures:
            if score > 0.1:
                structure = get_structure_by_id(structure_id)
                
                # Find actual matching patterns from user's content
                matching_patterns = []
                for pattern in structure.example_patterns:
                    for entry in request.sample_entries:
                        if pattern.lower() in entry.lower():
                            # Extract the actual phrase from user's entry
                            idx = entry.lower().find(pattern.lower())
                            phrase = entry[max(0, idx-20):min(len(entry), idx+50)]
                            matching_patterns.append(phrase.strip())
                            break
                
                suggestions.append(StructureSuggestion(
                    structure_id=structure_id,
                    name=structure.name,
                    description=structure.description,
                    relevance_score=score,
                    matching_patterns=matching_patterns[:2],  # Show up to 2 actual matches
                    sample_entities=[]
                ))
        
        return ConversationResponse(
            conversation_id=conversation_id,
            current_question=current_question,
            suggestions=suggestions,
            analysis_insights={
                "content_focus": _determine_content_focus(request.sample_entries),
                "complexity_level": _assess_complexity(request.sample_entries),
                "temporal_patterns": _analyze_temporal_patterns(request.sample_entries),
                "actual_quotes": actual_quotes,
                "user_patterns": user_patterns
            },
            recommended_structures=[s[0] for s in top_structures if s[1] > 0.2]
        )
        
    except Exception as e:
        logger.error(f"Error starting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversation/continue")
async def continue_structure_conversation(request: ConversationContinueRequest):
    """Continue the structure discovery conversation."""
    try:
        user_response = request.user_response.lower()
        
        # Check if user wants something custom
        if "custom" in user_response or "different" in user_response or "mix" in user_response:
            return ConversationResponse(
                conversation_id=request.conversation_id,
                current_question="I'd love to help you create a custom structure! What are the main types of things you want to track? For example: people, projects, ideas, goals, events, learnings, etc.",
                suggestions=[],
                analysis_insights={"stage": "custom_entities"},
                recommended_structures=[]
            )
        
        # Check if user is describing entity types
        if any(word in user_response for word in ["track", "want to", "need to", "like to"]):
            # Extract potential entity types
            potential_entities = []
            
            # Simple extraction logic - in production use NLP
            if "people" in user_response or "person" in user_response or "relationship" in user_response:
                potential_entities.append({"name": "Person", "description": "People in your life"})
            if "project" in user_response or "task" in user_response:
                potential_entities.append({"name": "Project", "description": "Projects and initiatives"})
            if "idea" in user_response or "thought" in user_response:
                potential_entities.append({"name": "Idea", "description": "Ideas and insights"})
            if "goal" in user_response or "objective" in user_response:
                potential_entities.append({"name": "Goal", "description": "Goals and aspirations"})
            if "event" in user_response or "meeting" in user_response:
                potential_entities.append({"name": "Event", "description": "Events and occurrences"})
            if "learning" in user_response or "lesson" in user_response:
                potential_entities.append({"name": "Learning", "description": "Learnings and insights"})
                
            if potential_entities:
                entity_list = ", ".join([e["name"] for e in potential_entities])
                return ConversationResponse(
                    conversation_id=request.conversation_id,
                    current_question=f"Great! So you want to track: {entity_list}. What relationships or connections between these would be most valuable? For example: 'Person works on Project', 'Idea leads to Goal', etc.",
                    suggestions=[],
                    analysis_insights={
                        "stage": "custom_relationships",
                        "entities": potential_entities
                    },
                    recommended_structures=[]
                )
        
        # Default: offer to refine existing structures
        return ConversationResponse(
            conversation_id=request.conversation_id,
            current_question="Would you like me to suggest a hybrid approach that combines elements from different systems, or would you prefer to start with one of the existing structures and customize it?",
            suggestions=[],
            analysis_insights={"stage": "refinement"},
            recommended_structures=[]
        )
        
    except Exception as e:
        logger.error(f"Error continuing conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-hybrid")
async def create_hybrid_structure(request: Dict[str, Any]):
    """Create a hybrid structure combining elements from multiple templates."""
    try:
        selected_structures = request.get("selected_structures", [])
        custom_entities = request.get("custom_entities", [])
        custom_relationships = request.get("custom_relationships", [])
        
        # Initialize the schema manager
        schema_manager = PersonalSchemaManager()
        
        # Collect entity types from selected structures
        all_entity_types = {}
        all_relationships = []
        
        for struct_config in selected_structures:
            structure = get_structure_by_id(struct_config["structure_id"])
            if structure:
                # Add selected entity types
                for et in structure.entity_types:
                    if et.name in struct_config.get("selected_entities", []):
                        if et.name not in all_entity_types:
                            all_entity_types[et.name] = et
                
                # Add selected relationships
                for rel in structure.relationships:
                    if rel.name in struct_config.get("selected_relationships", []):
                        all_relationships.append(rel)
        
        # Add custom entity types
        for custom_et in custom_entities:
            entity_def = EntityTypeDefinition(
                name=custom_et["name"],
                description=custom_et.get("description", ""),
                fields=[
                    FieldDefinition(
                        name=prop,
                        field_type="string",
                        required=False,
                        description=""
                    )
                    for prop in custom_et.get("properties", [])
                ],
                color=custom_et.get("color", "#gray"),
                icon=custom_et.get("icon", "cube")
            )
            all_entity_types[custom_et["name"]] = entity_def
        
        # Apply all entity types to schema
        for entity_def in all_entity_types.values():
            schema_manager.add_entity_type("default", entity_def)
        
        # Save schema with hybrid marker
        schema = schema_manager.get_schema("default")
        schema.templates_used = [s["structure_id"] for s in selected_structures]
        schema.is_hybrid = True
        schema_manager.save_schema(schema)
        
        return {
            "status": "success",
            "message": "Hybrid structure created successfully",
            "entity_types_created": len(all_entity_types),
            "relationships_defined": len(all_relationships) + len(custom_relationships),
            "structures_combined": len(selected_structures)
        }
        
    except Exception as e:
        logger.error(f"Error creating hybrid structure: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply-structure")
async def apply_structure(request: ApplyStructureRequest):
    """Apply a chosen knowledge structure to the graph."""
    try:
        # Initialize the schema manager
        schema_manager = PersonalSchemaManager()
        
        # Convert entity types to EntityTypeDefinition format
        for entity_type in request.entity_types:
            # Create fields from properties
            fields = []
            for prop in entity_type.get('properties', []):
                fields.append(FieldDefinition(
                    name=prop,
                    field_type="string",  # Default to string for now
                    required=False,
                    description=""
                ))
            
            # Create the entity type definition
            entity_def = EntityTypeDefinition(
                name=entity_type.get('name'),
                description=entity_type.get('description', ''),
                fields=fields,
                color=entity_type.get('color', '#gray'),
                icon=entity_type.get('icon', 'cube')
            )
            
            # Add to schema
            schema_manager.add_entity_type("default", entity_def)
        
        # TODO: Save relationship types when personal schema supports them
        
        # Mark the structure as applied
        schema = schema_manager.get_schema("default")
        if request.structure_id and request.structure_id not in schema.templates_used:
            schema.templates_used.append(request.structure_id)
            schema_manager.save_schema(schema)
        
        return {
            "status": "success",
            "message": "Structure applied successfully",
            "entity_types_created": len(request.entity_types),
            "relationships_defined": len(request.relationships)
        }
        
    except Exception as e:
        logger.error(f"Error applying structure: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions
def _extract_actual_quotes(entries: List[str], max_quotes: int = 5) -> List[Dict[str, str]]:
    """Extract meaningful quotes from journal entries."""
    quotes = []
    
    # Use more entries for better analysis (up to 10)
    for entry in entries[:10]:  
        # Split into sentences
        sentences = [s.strip() for s in entry.split('.') if len(s.strip()) > 20]
        
        for sentence in sentences[:3]:  # Take up to 3 sentences per entry
            if len(sentence) > 30 and len(sentence) < 200:
                quotes.append({
                    "text": sentence,
                    "context": entry[:150] + "..." if len(entry) > 150 else entry
                })
                
                if len(quotes) >= max_quotes:
                    return quotes
    
    return quotes


def _identify_user_patterns(entries: List[str]) -> Dict[str, List[str]]:
    """Identify actual patterns in user's journal entries."""
    patterns = {
        "people_mentioned": [],
        "activities": [],
        "topics": [],
        "emotions": [],
        "goals": []
    }
    
    # Simple pattern extraction (in production, use NLP)
    for entry in entries:
        # Look for capitalized words that might be names
        words = entry.split()
        for i, word in enumerate(words):
            if word[0].isupper() and i > 0 and words[i-1].lower() not in ['i', 'the', 'a']:
                if word not in patterns["people_mentioned"] and len(word) > 2:
                    patterns["people_mentioned"].append(word)
        
        # Look for action words (verbs)
        action_indicators = ['worked on', 'met with', 'discussed', 'learned', 'created', 'built', 'wrote']
        for indicator in action_indicators:
            if indicator in entry.lower():
                # Extract the phrase around it
                idx = entry.lower().find(indicator)
                phrase = entry[max(0, idx-10):min(len(entry), idx+50)]
                patterns["activities"].append(phrase.strip())
                
    return patterns


def _extract_dominant_patterns(entries: List[str]) -> List[str]:
    """Extract dominant patterns from journal entries."""
    # Simplified implementation - in production, use NLP
    patterns = []
    common_phrases = ["working on", "met with", "learned", "realized", "feeling"]
    
    combined = " ".join(entries).lower()
    for phrase in common_phrases:
        if phrase in combined:
            patterns.append(phrase)
    
    return patterns[:5]


def _suggest_approach(scores: Dict[str, float]) -> str:
    """Suggest an approach based on structure scores."""
    top_score = max(scores.values()) if scores else 0
    
    if top_score > 0.6:
        return "strong_match"
    elif top_score > 0.3:
        return "hybrid_recommended"
    else:
        return "custom_structure"


def _analyze_themes(entries: List[str]) -> List[str]:
    """Analyze main themes in entries."""
    # Simplified - in production, use topic modeling
    themes = []
    theme_keywords = {
        "productivity": ["task", "project", "deadline", "complete"],
        "learning": ["learn", "study", "understand", "course"],
        "relationships": ["met", "talked", "friend", "colleague"],
        "creative": ["idea", "create", "design", "inspire"],
        "health": ["exercise", "sleep", "feel", "energy"]
    }
    
    combined = " ".join(entries).lower()
    for theme, keywords in theme_keywords.items():
        if any(kw in combined for kw in keywords):
            themes.append(theme)
    
    return themes


def _determine_content_focus(entries: List[str]) -> str:
    """Determine the primary focus of journal content."""
    themes = _analyze_themes(entries)
    if not themes:
        return "mixed"
    return themes[0]


def _assess_complexity(entries: List[str]) -> str:
    """Assess complexity level of journal entries."""
    avg_length = sum(len(e.split()) for e in entries) / len(entries) if entries else 0
    
    if avg_length > 200:
        return "high"
    elif avg_length > 100:
        return "medium"
    else:
        return "low"


def _analyze_temporal_patterns(entries: List[str]) -> Dict[str, Any]:
    """Analyze temporal patterns in entries."""
    # Simplified - look for time-related keywords
    temporal_keywords = ["today", "yesterday", "tomorrow", "week", "month", "deadline"]
    combined = " ".join(entries).lower()
    
    found_keywords = [kw for kw in temporal_keywords if kw in combined]
    
    return {
        "has_temporal_references": len(found_keywords) > 0,
        "temporal_keywords": found_keywords,
        "suggested_time_tracking": len(found_keywords) > 3
    }