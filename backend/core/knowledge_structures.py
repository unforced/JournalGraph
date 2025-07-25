"""
Knowledge Structure Templates for Personal Knowledge Management

This module defines popular knowledge management methodologies and their
corresponding entity types and relationships for use in JournalGraph.
"""

from typing import List, Dict, Any
from dataclasses import dataclass, field
from enum import Enum


@dataclass
class EntityTypeDefinition:
    """Definition of an entity type within a knowledge structure."""
    name: str
    description: str
    color: str
    suggested_properties: List[str] = field(default_factory=list)
    icon: str = "Tag"  # Lucide icon name


@dataclass
class RelationshipDefinition:
    """Definition of a relationship type within a knowledge structure."""
    name: str
    description: str
    source_types: List[str]  # Which entity types can be sources
    target_types: List[str]  # Which entity types can be targets
    properties: List[str] = field(default_factory=list)


@dataclass
class KnowledgeStructure:
    """A complete knowledge management structure/methodology."""
    id: str
    name: str
    description: str
    author: str
    entity_types: List[EntityTypeDefinition]
    relationships: List[RelationshipDefinition]
    suggested_questions: List[str]  # Questions to ask during setup
    example_patterns: List[str]  # Example patterns to look for in journals


# PARA Method by Tiago Forte
PARA_STRUCTURE = KnowledgeStructure(
    id="para",
    name="PARA Method",
    description="Projects, Areas, Resources, Archives - A system for organizing digital information",
    author="Tiago Forte",
    entity_types=[
        EntityTypeDefinition(
            name="Project",
            description="Something with a specific outcome and deadline",
            color="#FF6B6B",
            suggested_properties=["deadline", "status", "outcome"],
            icon="Target"
        ),
        EntityTypeDefinition(
            name="Area",
            description="Ongoing responsibility to maintain a standard",
            color="#4ECDC4",
            suggested_properties=["standard", "review_frequency"],
            icon="Home"
        ),
        EntityTypeDefinition(
            name="Resource",
            description="Topic of ongoing interest for future reference",
            color="#45B7D1",
            suggested_properties=["category", "last_accessed"],
            icon="BookOpen"
        ),
        EntityTypeDefinition(
            name="Archive",
            description="Inactive items from other categories",
            color="#95A5A6",
            suggested_properties=["archived_date", "original_type"],
            icon="Archive"
        ),
        EntityTypeDefinition(
            name="Task",
            description="Actionable item within a project or area",
            color="#F39C12",
            suggested_properties=["due_date", "priority", "status"],
            icon="CheckSquare"
        )
    ],
    relationships=[
        RelationshipDefinition(
            name="BELONGS_TO",
            description="Task or sub-item belongs to a project or area",
            source_types=["Task", "Resource"],
            target_types=["Project", "Area"]
        ),
        RelationshipDefinition(
            name="SUPPORTS",
            description="Resource supports a project or area",
            source_types=["Resource"],
            target_types=["Project", "Area"]
        ),
        RelationshipDefinition(
            name="ARCHIVED_FROM",
            description="Item was archived from another category",
            source_types=["Archive"],
            target_types=["Project", "Area", "Resource"]
        )
    ],
    suggested_questions=[
        "What are your current active projects with specific deadlines?",
        "What ongoing responsibilities do you maintain?",
        "What topics are you researching or interested in?",
        "How do you typically organize your tasks?"
    ],
    example_patterns=[
        "working on", "project", "deadline", "responsible for", 
        "researching", "learning about", "completed", "archived"
    ]
)

# Zettelkasten Method
ZETTELKASTEN_STRUCTURE = KnowledgeStructure(
    id="zettelkasten",
    name="Zettelkasten",
    description="A network of interconnected atomic notes for knowledge development",
    author="Niklas Luhmann",
    entity_types=[
        EntityTypeDefinition(
            name="PermanentNote",
            description="Self-contained idea or insight",
            color="#9B59B6",
            suggested_properties=["created_date", "tags"],
            icon="FileText"
        ),
        EntityTypeDefinition(
            name="LiteratureNote",
            description="Notes from books, articles, or other sources",
            color="#3498DB",
            suggested_properties=["source", "author", "page_number"],
            icon="Book"
        ),
        EntityTypeDefinition(
            name="IndexNote",
            description="Entry point or topic overview",
            color="#E74C3C",
            suggested_properties=["topic", "subtopics"],
            icon="List"
        ),
        EntityTypeDefinition(
            name="Concept",
            description="Key concept or term",
            color="#16A085",
            suggested_properties=["definition", "context"],
            icon="Lightbulb"
        ),
        EntityTypeDefinition(
            name="Question",
            description="Open question or area of inquiry",
            color="#F39C12",
            suggested_properties=["context", "importance"],
            icon="HelpCircle"
        )
    ],
    relationships=[
        RelationshipDefinition(
            name="REFERENCES",
            description="Note references another note",
            source_types=["PermanentNote", "LiteratureNote"],
            target_types=["PermanentNote", "LiteratureNote", "Concept"]
        ),
        RelationshipDefinition(
            name="DEVELOPS",
            description="Note develops or extends an idea",
            source_types=["PermanentNote"],
            target_types=["PermanentNote", "Concept", "Question"]
        ),
        RelationshipDefinition(
            name="ANSWERS",
            description="Note provides answer or insight to a question",
            source_types=["PermanentNote", "LiteratureNote"],
            target_types=["Question"]
        ),
        RelationshipDefinition(
            name="INDEXES",
            description="Index note points to content",
            source_types=["IndexNote"],
            target_types=["PermanentNote", "LiteratureNote", "Concept"]
        )
    ],
    suggested_questions=[
        "Do you take notes while reading books or articles?",
        "How do you capture and develop your ideas?",
        "What are your main areas of intellectual interest?",
        "Do you like to explore connections between concepts?"
    ],
    example_patterns=[
        "realized", "insight", "connects to", "reminds me of",
        "contradicts", "supports", "questions", "explores"
    ]
)

# GTD (Getting Things Done) by David Allen
GTD_STRUCTURE = KnowledgeStructure(
    id="gtd",
    name="Getting Things Done (GTD)",
    description="Stress-free productivity through trusted systems",
    author="David Allen",
    entity_types=[
        EntityTypeDefinition(
            name="Action",
            description="Next physical action to take",
            color="#2ECC71",
            suggested_properties=["context", "time_estimate", "energy_level"],
            icon="Play"
        ),
        EntityTypeDefinition(
            name="Project",
            description="Outcome requiring multiple actions",
            color="#E67E22",
            suggested_properties=["desired_outcome", "status"],
            icon="Folder"
        ),
        EntityTypeDefinition(
            name="Context",
            description="Location or tool needed for actions",
            color="#9B59B6",
            suggested_properties=["type", "availability"],
            icon="MapPin"
        ),
        EntityTypeDefinition(
            name="WaitingFor",
            description="Delegated item awaiting response",
            color="#F39C12",
            suggested_properties=["delegated_to", "date_delegated", "follow_up_date"],
            icon="Clock"
        ),
        EntityTypeDefinition(
            name="Reference",
            description="Non-actionable information for reference",
            color="#3498DB",
            suggested_properties=["category", "last_accessed"],
            icon="FileText"
        ),
        EntityTypeDefinition(
            name="SomedayMaybe",
            description="Ideas for potential future action",
            color="#95A5A6",
            suggested_properties=["review_date", "trigger"],
            icon="Cloud"
        )
    ],
    relationships=[
        RelationshipDefinition(
            name="PART_OF",
            description="Action is part of a project",
            source_types=["Action"],
            target_types=["Project"]
        ),
        RelationshipDefinition(
            name="REQUIRES_CONTEXT",
            description="Action requires specific context",
            source_types=["Action"],
            target_types=["Context"]
        ),
        RelationshipDefinition(
            name="WAITING_ON",
            description="Project or action is waiting on someone",
            source_types=["Project", "Action"],
            target_types=["WaitingFor"]
        ),
        RelationshipDefinition(
            name="REFERENCES",
            description="Item references support material",
            source_types=["Project", "Action"],
            target_types=["Reference"]
        )
    ],
    suggested_questions=[
        "What are your current commitments and projects?",
        "Where do you typically work on different types of tasks?",
        "What are you waiting for from others?",
        "What ideas do you have for the future?"
    ],
    example_patterns=[
        "next action", "waiting for", "delegated to", "someday",
        "maybe", "context", "@home", "@office", "@computer"
    ]
)

# Personal CRM / Relationship Management
RELATIONSHIP_STRUCTURE = KnowledgeStructure(
    id="personal_crm",
    name="Personal CRM",
    description="Track and nurture personal and professional relationships",
    author="Community",
    entity_types=[
        EntityTypeDefinition(
            name="Person",
            description="Individual in your network",
            color="#E74C3C",
            suggested_properties=["occupation", "location", "birthday", "interests"],
            icon="User"
        ),
        EntityTypeDefinition(
            name="Interaction",
            description="Meeting, call, or communication",
            color="#3498DB",
            suggested_properties=["date", "type", "notes", "follow_up"],
            icon="MessageSquare"
        ),
        EntityTypeDefinition(
            name="Organization",
            description="Company, group, or institution",
            color="#2ECC71",
            suggested_properties=["industry", "size", "location"],
            icon="Building"
        ),
        EntityTypeDefinition(
            name="Event",
            description="Conference, meetup, or gathering",
            color="#F39C12",
            suggested_properties=["date", "location", "type"],
            icon="Calendar"
        ),
        EntityTypeDefinition(
            name="Topic",
            description="Shared interest or discussion topic",
            color="#9B59B6",
            suggested_properties=["category", "relevance"],
            icon="Hash"
        )
    ],
    relationships=[
        RelationshipDefinition(
            name="KNOWS",
            description="People know each other",
            source_types=["Person"],
            target_types=["Person"],
            properties=["how_met", "relationship_type"]
        ),
        RelationshipDefinition(
            name="WORKS_AT",
            description="Person works at organization",
            source_types=["Person"],
            target_types=["Organization"],
            properties=["role", "start_date"]
        ),
        RelationshipDefinition(
            name="ATTENDED",
            description="Person attended event",
            source_types=["Person"],
            target_types=["Event"]
        ),
        RelationshipDefinition(
            name="DISCUSSED",
            description="Topic discussed in interaction",
            source_types=["Interaction"],
            target_types=["Topic"]
        ),
        RelationshipDefinition(
            name="INTERESTED_IN",
            description="Person interested in topic",
            source_types=["Person"],
            target_types=["Topic"]
        )
    ],
    suggested_questions=[
        "Who are the key people in your personal and professional life?",
        "How do you currently track your interactions?",
        "What topics frequently come up in your conversations?",
        "What networking events do you attend?"
    ],
    example_patterns=[
        "met with", "talked to", "introduced to", "works at",
        "interested in", "conference", "meeting", "catch up"
    ]
)

# Creative Project Management
CREATIVE_STRUCTURE = KnowledgeStructure(
    id="creative_projects",
    name="Creative Project Management",
    description="For artists, writers, and creative professionals",
    author="Community",
    entity_types=[
        EntityTypeDefinition(
            name="CreativeWork",
            description="Piece of creative work",
            color="#E91E63",
            suggested_properties=["medium", "status", "genre"],
            icon="Palette"
        ),
        EntityTypeDefinition(
            name="Inspiration",
            description="Source of creative inspiration",
            color="#FF9800",
            suggested_properties=["type", "source", "mood"],
            icon="Sparkles"
        ),
        EntityTypeDefinition(
            name="Technique",
            description="Creative technique or method",
            color="#4CAF50",
            suggested_properties=["difficulty", "tools_required"],
            icon="Tool"
        ),
        EntityTypeDefinition(
            name="Theme",
            description="Recurring theme or motif",
            color="#2196F3",
            suggested_properties=["emotion", "symbolism"],
            icon="Layers"
        ),
        EntityTypeDefinition(
            name="Collaborator",
            description="Creative collaborator",
            color="#9C27B0",
            suggested_properties=["role", "expertise"],
            icon="Users"
        )
    ],
    relationships=[
        RelationshipDefinition(
            name="INSPIRED_BY",
            description="Work inspired by source",
            source_types=["CreativeWork"],
            target_types=["Inspiration", "CreativeWork"]
        ),
        RelationshipDefinition(
            name="USES_TECHNIQUE",
            description="Work uses specific technique",
            source_types=["CreativeWork"],
            target_types=["Technique"]
        ),
        RelationshipDefinition(
            name="EXPLORES_THEME",
            description="Work explores theme",
            source_types=["CreativeWork"],
            target_types=["Theme"]
        ),
        RelationshipDefinition(
            name="COLLABORATED_WITH",
            description="Collaborated on work",
            source_types=["CreativeWork"],
            target_types=["Collaborator"]
        )
    ],
    suggested_questions=[
        "What creative projects are you working on?",
        "Where do you find inspiration?",
        "What themes appear in your work?",
        "Who do you collaborate with?"
    ],
    example_patterns=[
        "inspired by", "working on", "experimenting with",
        "explores", "theme", "technique", "collaboration"
    ]
)

# Learning & Study System
LEARNING_STRUCTURE = KnowledgeStructure(
    id="learning_system",
    name="Learning & Study System",
    description="Track learning progress and knowledge acquisition",
    author="Community",
    entity_types=[
        EntityTypeDefinition(
            name="Subject",
            description="Area of study or learning",
            color="#3F51B5",
            suggested_properties=["level", "prerequisites"],
            icon="GraduationCap"
        ),
        EntityTypeDefinition(
            name="LearningResource",
            description="Book, course, video, or tutorial",
            color="#009688",
            suggested_properties=["type", "author", "duration", "difficulty"],
            icon="BookOpen"
        ),
        EntityTypeDefinition(
            name="Concept",
            description="Key concept or principle",
            color="#FF5722",
            suggested_properties=["difficulty", "importance"],
            icon="Lightbulb"
        ),
        EntityTypeDefinition(
            name="Practice",
            description="Exercise, problem, or application",
            color="#795548",
            suggested_properties=["difficulty", "time_spent", "mastery_level"],
            icon="PenTool"
        ),
        EntityTypeDefinition(
            name="Goal",
            description="Learning objective or milestone",
            color="#607D8B",
            suggested_properties=["target_date", "measurement", "status"],
            icon="Target"
        )
    ],
    relationships=[
        RelationshipDefinition(
            name="TEACHES",
            description="Resource teaches concept",
            source_types=["LearningResource"],
            target_types=["Concept", "Subject"]
        ),
        RelationshipDefinition(
            name="PREREQUISITE_FOR",
            description="Concept required for another",
            source_types=["Concept", "Subject"],
            target_types=["Concept", "Subject"]
        ),
        RelationshipDefinition(
            name="PRACTICES",
            description="Practice applies concept",
            source_types=["Practice"],
            target_types=["Concept"]
        ),
        RelationshipDefinition(
            name="ADVANCES_GOAL",
            description="Learning advances toward goal",
            source_types=["Concept", "Practice", "LearningResource"],
            target_types=["Goal"]
        )
    ],
    suggested_questions=[
        "What subjects are you currently learning?",
        "What learning resources do you use?",
        "How do you track your progress?",
        "What are your learning goals?"
    ],
    example_patterns=[
        "studying", "learning", "practiced", "understood",
        "confused by", "mastered", "reading", "course"
    ]
)

# Health & Wellness Tracking
WELLNESS_STRUCTURE = KnowledgeStructure(
    id="health_wellness",
    name="Health & Wellness",
    description="Track health, fitness, and wellness journey",
    author="Community",
    entity_types=[
        EntityTypeDefinition(
            name="HealthMetric",
            description="Measurable health indicator",
            color="#4CAF50",
            suggested_properties=["value", "unit", "date", "trend"],
            icon="Activity"
        ),
        EntityTypeDefinition(
            name="Activity",
            description="Exercise, meditation, or wellness activity",
            color="#2196F3",
            suggested_properties=["duration", "intensity", "type"],
            icon="Heart"
        ),
        EntityTypeDefinition(
            name="Symptom",
            description="Health symptom or condition",
            color="#F44336",
            suggested_properties=["severity", "duration", "triggers"],
            icon="AlertCircle"
        ),
        EntityTypeDefinition(
            name="Treatment",
            description="Medication, therapy, or intervention",
            color="#9C27B0",
            suggested_properties=["dosage", "frequency", "effectiveness"],
            icon="Pill"
        ),
        EntityTypeDefinition(
            name="Goal",
            description="Health or fitness goal",
            color="#FF9800",
            suggested_properties=["target", "deadline", "progress"],
            icon="Trophy"
        )
    ],
    relationships=[
        RelationshipDefinition(
            name="IMPROVES",
            description="Activity improves metric",
            source_types=["Activity", "Treatment"],
            target_types=["HealthMetric", "Symptom"]
        ),
        RelationshipDefinition(
            name="TRIGGERS",
            description="Factor triggers symptom",
            source_types=["Activity", "HealthMetric"],
            target_types=["Symptom"]
        ),
        RelationshipDefinition(
            name="TREATS",
            description="Treatment addresses symptom",
            source_types=["Treatment"],
            target_types=["Symptom"]
        ),
        RelationshipDefinition(
            name="SUPPORTS_GOAL",
            description="Activity supports health goal",
            source_types=["Activity", "Treatment"],
            target_types=["Goal"]
        )
    ],
    suggested_questions=[
        "What health metrics do you track?",
        "What wellness activities do you practice?",
        "Are there symptoms you monitor?",
        "What are your health goals?"
    ],
    example_patterns=[
        "workout", "exercise", "meditation", "symptoms",
        "feeling", "energy", "sleep", "diet", "medication"
    ]
)

# Collect all structures
KNOWLEDGE_STRUCTURES = {
    "para": PARA_STRUCTURE,
    "zettelkasten": ZETTELKASTEN_STRUCTURE,
    "gtd": GTD_STRUCTURE,
    "personal_crm": RELATIONSHIP_STRUCTURE,
    "creative_projects": CREATIVE_STRUCTURE,
    "learning_system": LEARNING_STRUCTURE,
    "health_wellness": WELLNESS_STRUCTURE
}


def get_structure_by_id(structure_id: str) -> KnowledgeStructure:
    """Get a knowledge structure by its ID."""
    return KNOWLEDGE_STRUCTURES.get(structure_id)


def get_all_structures() -> List[KnowledgeStructure]:
    """Get all available knowledge structures."""
    return list(KNOWLEDGE_STRUCTURES.values())


def analyze_content_for_structures(content: List[str]) -> Dict[str, float]:
    """
    Analyze journal content and return relevance scores for each structure.
    
    Args:
        content: List of journal entry texts
        
    Returns:
        Dict mapping structure IDs to relevance scores (0.0 to 1.0)
    """
    scores = {}
    combined_content = " ".join(content).lower()
    
    for structure_id, structure in KNOWLEDGE_STRUCTURES.items():
        score = 0.0
        pattern_matches = 0
        
        # Check for pattern matches
        for pattern in structure.example_patterns:
            if pattern.lower() in combined_content:
                pattern_matches += 1
        
        # Calculate score based on pattern matches
        if structure.example_patterns:
            score = pattern_matches / len(structure.example_patterns)
        
        scores[structure_id] = min(score, 1.0)
    
    return scores


def create_custom_structure(
    entity_types: List[Dict[str, Any]],
    relationships: List[Dict[str, Any]],
    name: str = "Custom Structure",
    description: str = "A personalized knowledge structure"
) -> KnowledgeStructure:
    """
    Create a custom knowledge structure from user-defined entities and relationships.
    """
    # Convert entity type dicts to EntityTypeDefinition objects
    entity_definitions = []
    for et in entity_types:
        entity_definitions.append(EntityTypeDefinition(
            name=et.get('name', 'Unknown'),
            description=et.get('description', ''),
            color=et.get('color', '#gray'),
            suggested_properties=et.get('properties', []),
            icon=et.get('icon', 'cube')
        ))
    
    # Convert relationship dicts to RelationshipDefinition objects
    relationship_definitions = []
    for rel in relationships:
        relationship_definitions.append(RelationshipDefinition(
            name=rel.get('name', 'RELATES_TO'),
            description=rel.get('description', ''),
            source_types=rel.get('source_types', []),
            target_types=rel.get('target_types', []),
            properties=rel.get('properties', [])
        ))
    
    return KnowledgeStructure(
        name=name,
        description=description,
        author="User",
        entity_types=entity_definitions,
        relationships=relationship_definitions,
        suggested_questions=[
            "What patterns do you see in your entries?",
            "How would you like to expand this structure?",
            "What connections are most valuable to you?"
        ],
        example_patterns=[]
    )


def suggest_hybrid_structure(content: List[str], user_preferences: Dict[str, Any]) -> Dict[str, Any]:
    """
    Suggest a hybrid structure based on content analysis and user preferences.
    
    Args:
        content: List of journal entry texts
        user_preferences: User's stated preferences from conversation
        
    Returns:
        Suggested hybrid structure configuration
    """
    scores = analyze_content_for_structures(content)
    
    # Get top 2-3 most relevant structures
    top_structures = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
    
    # Build hybrid structure
    hybrid = {
        "name": "Custom Hybrid Structure",
        "description": "A personalized knowledge structure combining multiple methodologies",
        "base_structures": [s[0] for s in top_structures if s[1] > 0.1],
        "entity_types": [],
        "relationships": []
    }
    
    # Combine entity types from relevant structures
    seen_types = set()
    for structure_id, score in top_structures:
        if score > 0.1:
            structure = KNOWLEDGE_STRUCTURES[structure_id]
            for entity_type in structure.entity_types:
                if entity_type.name not in seen_types:
                    seen_types.add(entity_type.name)
                    hybrid["entity_types"].append({
                        "name": entity_type.name,
                        "description": entity_type.description,
                        "color": entity_type.color,
                        "icon": entity_type.icon,
                        "source_structure": structure.name
                    })
    
    # Add custom entity types based on user preferences
    if user_preferences.get("tracks_people", False):
        if "Person" not in seen_types:
            hybrid["entity_types"].append({
                "name": "Person",
                "description": "People mentioned in your journals",
                "color": "#E74C3C",
                "icon": "User",
                "source_structure": "Custom"
            })
    
    return hybrid