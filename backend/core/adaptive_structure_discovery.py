"""
Adaptive structure discovery that learns from user's actual content patterns.
"""

import re
import json
import logging
from typing import List, Dict, Any, Set, Tuple, Optional
from collections import Counter, defaultdict
from datetime import datetime

from core.personal_schema import EntityTypeDefinition, FieldDefinition
from core.knowledge_structures import KNOWLEDGE_STRUCTURES

logger = logging.getLogger(__name__)


class AdaptiveStructureDiscovery:
    """Discovers knowledge structures organically from user's content."""
    
    def __init__(self):
        self.pattern_matchers = {
            'person': [
                r'\b(?:met|talked to|spoke with|saw|visited|called|texted|emailed)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
                r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:said|told|asked|mentioned|suggested)',
                r'\bwith\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',
                r'\b(?:mom|dad|brother|sister|friend|colleague|boss|mentor)\s+([A-Z][a-z]+)',
                r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+and\s+I\b',
                r'\btold\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',
            ],
            'project': [
                r'(?:working on|started|finished|completed|launched)\s+([A-Za-z0-9\s\-]+?)(?:\.|,|;|$)',
                r'(?:project|initiative|campaign)\s+(?:called\s+)?["\']?([^"\'\.]+)["\']?',
                r'\b(?:building|developing|creating|designing)\s+([A-Za-z0-9\s\-]+?)(?:\.|,|;|$)',
                r'\b(?:the|my|our)\s+([A-Za-z0-9\-]+)\s+(?:project|app|website|tool)\b',
            ],
            'concept': [
                r'(?:learned about|studied|researched|explored)\s+([A-Za-z\s\-]+?)(?:\.|,|;|$)',
                r'(?:concept of|idea of|theory of)\s+([A-Za-z\s\-]+?)(?:\.|,|;|$)',
                r'(?:thinking about|pondering|reflecting on)\s+([A-Za-z\s\-]+?)(?:\.|,|;|$)',
                r'\b(?:understand|understanding)\s+([A-Za-z\s\-]+?)(?:\.|,|;|$)',
            ],
            'emotion': [
                r'\b(?:felt|feeling)\s+(\w+)',
                r'\b(?:I am|I\'m|was)\s+(happy|sad|excited|anxious|stressed|calm|peaceful|angry|frustrated|tired|energized)',
                r'\b(grateful|thankful|appreciative|worried|concerned|hopeful|optimistic)\b',
            ],
            'habit': [
                r'(?:daily|weekly|morning|evening)\s+([A-Za-z\s]+?)(?:\.|,|;|$)',
                r'(?:routine|habit|practice)\s+(?:of\s+)?([A-Za-z\s]+?)(?:\.|,|;|$)',
                r'(?:started|stopped|continued)\s+([A-Za-z\s]+ing)',
                r'\bevery\s+(?:day|morning|evening|week)\s+I\s+([A-Za-z\s]+?)(?:\.|,|;|$)',
            ],
            'goal': [
                r'(?:goal|objective|aim|target)\s+(?:is\s+to\s+|of\s+)?([^.]+?)(?:\.|,|;|$)',
                r'(?:want to|plan to|intend to|hope to|trying to)\s+([^.]+?)(?:\.|,|;|$)',
                r'(?:working towards|striving for|aiming for)\s+([^.]+?)(?:\.|,|;|$)',
            ],
            'location': [
                r'(?:went to|visited|at|in)\s+([A-Z][A-Za-z\s]+?)(?:\.|,|;|$)',
                r'(?:traveled to|flew to|drove to)\s+([A-Z][A-Za-z\s]+?)(?:\.|,|;|$)',
                r'\bat\s+(?:the\s+)?([A-Z][A-Za-z\s]+?)(?:\.|,|;|$)',
            ],
            'event': [
                r'(?:attended|went to|participated in)\s+(?:a\s+|an\s+|the\s+)?([A-Za-z\s]+?)(?:\.|,|;|$)',
                r'([A-Za-z\s]+?)\s+(?:meeting|conference|workshop|seminar|party|gathering|event)',
                r'\b(?:had|have)\s+(?:a|an)\s+([A-Za-z\s]+?)\s+(?:meeting|call|session)\b',
            ]
        }
        
    def analyze_content(self, entries: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Analyze journal entries to discover natural patterns and structures.
        Returns discovered entity types, relationships, and patterns.
        """
        # Extract all patterns
        discovered_entities = defaultdict(list)
        entity_co_occurrences = defaultdict(lambda: defaultdict(int))
        temporal_patterns = self._analyze_temporal_patterns(entries)
        writing_themes = self._extract_themes(entries)
        
        # Discover entities from content
        for entry in entries:
            content = entry.get('content', '')
            date = entry.get('date', '')
            
            # Find entities using pattern matching
            for entity_type, patterns in self.pattern_matchers.items():
                for pattern in patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    for match in matches:
                        if isinstance(match, tuple):
                            match = match[0]
                        cleaned = match.strip()
                        # Filter out common words and ensure proper names
                        if (cleaned and len(cleaned) > 2 and 
                            cleaned.lower() not in ['with', 'the', 'and', 'for', 'from', 'about', 'was', 'were', 'are', 'is'] and
                            not cleaned.lower().startswith('ing')):  # Skip gerunds that might be false positives
                            discovered_entities[entity_type].append({
                                'name': cleaned,
                                'context': self._get_context(content, cleaned),
                                'date': date
                            })
            
            # Discover custom patterns
            custom_patterns = self._discover_custom_patterns(content)
            for pattern_type, instances in custom_patterns.items():
                discovered_entities[pattern_type].extend(instances)
            
            # Track co-occurrences for relationship discovery
            self._track_cooccurrences(content, entity_co_occurrences)
        
        # Analyze discovered patterns
        entity_analysis = self._analyze_entities(discovered_entities)
        relationships = self._discover_relationships(entity_co_occurrences, discovered_entities)
        
        # Get inspiration from existing structures but adapt to user
        structure_inspiration = self._get_structure_inspiration(entity_analysis, writing_themes)
        
        return {
            'discovered_entities': entity_analysis,
            'discovered_relationships': relationships,
            'temporal_patterns': temporal_patterns,
            'writing_themes': writing_themes,
            'structure_inspiration': structure_inspiration,
            'unique_patterns': self._identify_unique_patterns(entity_analysis),
            'recommended_structure': self._build_adaptive_structure(
                entity_analysis, relationships, temporal_patterns, writing_themes
            )
        }
    
    def _discover_custom_patterns(self, content: str) -> Dict[str, List[Dict[str, Any]]]:
        """Discover patterns unique to this user's writing."""
        custom_patterns = defaultdict(list)
        
        # Look for consistent formatting patterns (e.g., "- Task: ...", "Q: ...", etc.)
        format_patterns = re.findall(r'^[-*]\s*([A-Z]\w+):\s*(.+)$', content, re.MULTILINE)
        for label, text in format_patterns:
            custom_patterns[f'custom_{label.lower()}'].append({
                'name': text.strip(),
                'format': f"{label}:",
                'context': f"Uses '{label}:' format"
            })
        
        # Look for hashtag patterns
        hashtags = re.findall(r'#(\w+)', content)
        for tag in hashtags:
            custom_patterns['hashtag'].append({
                'name': tag,
                'context': 'Uses hashtag system'
            })
        
        # Look for bracket patterns [like this] or [[like this]]
        single_brackets = re.findall(r'\[([^\]]+)\]', content)
        for item in single_brackets:
            if not item.startswith('['):  # Avoid double brackets
                custom_patterns['bracket_note'].append({
                    'name': item,
                    'context': 'Uses bracket notation'
                })
        
        double_brackets = re.findall(r'\[\[([^\]]+)\]\]', content)
        for item in double_brackets:
            custom_patterns['linked_note'].append({
                'name': item,
                'context': 'Uses wiki-style links'
            })
        
        return custom_patterns
    
    def _analyze_temporal_patterns(self, entries: List[Dict[str, str]]) -> Dict[str, Any]:
        """Analyze when and how often the user writes."""
        if not entries:
            return {}
            
        # Parse dates and analyze patterns
        dates = []
        for entry in entries:
            try:
                date_str = entry.get('date', '')
                if date_str:
                    date = datetime.fromisoformat(date_str.split('T')[0])
                    dates.append(date)
            except:
                continue
        
        if not dates:
            return {}
        
        dates.sort()
        
        # Analyze writing frequency
        day_counts = Counter(d.strftime('%A') for d in dates)
        month_counts = Counter(d.strftime('%B') for d in dates)
        
        # Calculate gaps between entries
        gaps = []
        for i in range(1, len(dates)):
            gap = (dates[i] - dates[i-1]).days
            gaps.append(gap)
        
        avg_gap = sum(gaps) / len(gaps) if gaps else 0
        
        return {
            'frequency': {
                'average_gap_days': avg_gap,
                'most_active_days': day_counts.most_common(3),
                'most_active_months': month_counts.most_common(3),
            },
            'consistency': {
                'total_entries': len(dates),
                'date_range': f"{dates[0].strftime('%Y-%m-%d')} to {dates[-1].strftime('%Y-%m-%d')}",
                'is_daily': avg_gap < 1.5,
                'is_weekly': 3 < avg_gap < 10,
                'is_sporadic': avg_gap > 10
            }
        }
    
    def _extract_themes(self, entries: List[Dict[str, str]]) -> List[str]:
        """Extract recurring themes from entries."""
        # Simple theme extraction based on repeated concepts
        word_counts = Counter()
        theme_phrases = []
        
        for entry in entries:
            content = entry.get('content', '').lower()
            
            # Extract potential theme phrases
            # Look for phrases that appear in multiple entries
            sentences = re.split(r'[.!?]', content)
            for sentence in sentences:
                # Extract noun phrases (simplified)
                words = sentence.split()
                for i in range(len(words) - 1):
                    bigram = f"{words[i]} {words[i+1]}"
                    if len(bigram) > 10 and not any(stop in bigram for stop in ['the', 'and', 'or', 'but']):
                        word_counts[bigram] += 1
        
        # Return most common themes
        common_themes = []
        for phrase, count in word_counts.most_common(10):
            if count > 2:  # Appears in multiple entries
                common_themes.append(phrase)
        
        return common_themes
    
    def _get_context(self, content: str, entity: str, window: int = 50) -> str:
        """Get surrounding context for an entity."""
        index = content.lower().find(entity.lower())
        if index == -1:
            return ""
        
        start = max(0, index - window)
        end = min(len(content), index + len(entity) + window)
        
        context = content[start:end]
        # Clean up to start/end at word boundaries
        if start > 0:
            context = "..." + context[context.find(' ')+1:]
        if end < len(content):
            context = context[:context.rfind(' ')] + "..."
            
        return context
    
    def _track_cooccurrences(self, content: str, cooccurrences: Dict[str, Dict[str, int]]):
        """Track which entities appear together."""
        # Simple co-occurrence tracking within sentences
        sentences = re.split(r'[.!?]', content)
        
        for sentence in sentences:
            # Find all capitalized words (potential entities)
            entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', sentence)
            
            # Track co-occurrences
            for i, entity1 in enumerate(entities):
                for entity2 in entities[i+1:]:
                    if entity1 != entity2:
                        cooccurrences[entity1][entity2] += 1
                        cooccurrences[entity2][entity1] += 1
    
    def _analyze_entities(self, discovered_entities: Dict[str, List]) -> Dict[str, Any]:
        """Analyze discovered entities to understand patterns."""
        analysis = {}
        
        for entity_type, instances in discovered_entities.items():
            if not instances:
                continue
                
            # Count unique entities
            unique_names = set(inst['name'] for inst in instances)
            
            # Find most mentioned
            name_counts = Counter(inst['name'] for inst in instances)
            
            analysis[entity_type] = {
                'count': len(instances),
                'unique_count': len(unique_names),
                'most_common': name_counts.most_common(5),
                'examples': list(unique_names)[:5],
                'user_format': self._detect_user_format(instances)
            }
        
        return analysis
    
    def _detect_user_format(self, instances: List[Dict[str, Any]]) -> Optional[str]:
        """Detect if user has a specific format for this entity type."""
        if not instances:
            return None
            
        # Check if there's a consistent format
        formats = [inst.get('format') for inst in instances if 'format' in inst]
        if formats:
            format_counts = Counter(formats)
            most_common_format = format_counts.most_common(1)[0][0]
            if format_counts[most_common_format] > len(instances) * 0.7:
                return most_common_format
                
        return None
    
    def _discover_relationships(
        self, 
        cooccurrences: Dict[str, Dict[str, int]], 
        entities: Dict[str, List]
    ) -> List[Dict[str, Any]]:
        """Discover relationships from co-occurrence patterns."""
        relationships = []
        
        # Find strong co-occurrences
        for entity1, related in cooccurrences.items():
            for entity2, count in related.items():
                if count > 2:  # Appears together multiple times
                    # Try to determine relationship type
                    rel_type = self._infer_relationship_type(entity1, entity2, entities)
                    
                    relationships.append({
                        'source': entity1,
                        'target': entity2,
                        'strength': count,
                        'type': rel_type
                    })
        
        # Deduplicate and sort by strength
        seen = set()
        unique_relationships = []
        for rel in sorted(relationships, key=lambda x: x['strength'], reverse=True):
            key = tuple(sorted([rel['source'], rel['target']]))
            if key not in seen:
                seen.add(key)
                unique_relationships.append(rel)
        
        return unique_relationships[:20]  # Top 20 relationships
    
    def _infer_relationship_type(
        self, 
        entity1: str, 
        entity2: str, 
        all_entities: Dict[str, List]
    ) -> str:
        """Infer the type of relationship between two entities."""
        # Simple inference based on entity types
        type1 = None
        type2 = None
        
        for entity_type, instances in all_entities.items():
            names = [inst['name'] for inst in instances]
            if entity1 in names:
                type1 = entity_type
            if entity2 in names:
                type2 = entity_type
        
        if type1 == 'person' and type2 == 'person':
            return 'knows'
        elif type1 == 'person' and type2 == 'project':
            return 'works_on'
        elif type1 == 'person' and type2 == 'location':
            return 'visits'
        elif type1 == 'project' and type2 == 'concept':
            return 'implements'
        else:
            return 'related_to'
    
    def _identify_unique_patterns(self, entity_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify patterns unique to this user."""
        unique_patterns = []
        
        # Check for custom entity types
        for entity_type, analysis in entity_analysis.items():
            if entity_type.startswith('custom_') or entity_type in ['hashtag', 'bracket_note', 'linked_note']:
                unique_patterns.append({
                    'type': entity_type,
                    'description': f"User has a custom pattern: {entity_type.replace('_', ' ')}",
                    'example': analysis.get('examples', [None])[0] if analysis.get('examples') else None,
                    'frequency': analysis.get('count', 0)
                })
        
        return unique_patterns
    
    def _get_structure_inspiration(
        self, 
        entity_analysis: Dict[str, Any], 
        themes: List[str]
    ) -> Dict[str, float]:
        """Get inspiration from existing structures based on what we found."""
        inspiration_scores = {}
        
        try:
            # Analyze which existing structures might inspire this user's system
            for structure_id, structure in KNOWLEDGE_STRUCTURES.items():
                score = 0.0
                
                # Check entity type overlap
                structure_entities = set(et.name.lower() for et in structure.entity_types)
                discovered_entities = set(entity_analysis.keys())
                
                overlap = len(structure_entities & discovered_entities)
                if structure_entities:
                    score += (overlap / len(structure_entities)) * 0.5
                
                # Check theme alignment
                structure_desc = structure.description.lower()
                for theme in themes:
                    if theme in structure_desc:
                        score += 0.1
                
                # Special boosts for specific patterns
                if structure_id == 'para' and 'project' in discovered_entities:
                    score += 0.2
                elif structure_id == 'zettelkasten' and any(t in discovered_entities for t in ['concept', 'linked_note']):
                    score += 0.2
                elif structure_id == 'gtd' and any(t in discovered_entities for t in ['goal', 'custom_task']):
                    score += 0.2
                
                inspiration_scores[structure_id] = min(score, 1.0)
        except Exception as e:
            logger.error(f"Error in _get_structure_inspiration: {e}")
            # Return empty scores if there's an error
            return {}
        
        return inspiration_scores
    
    def _build_adaptive_structure(
        self,
        entity_analysis: Dict[str, Any],
        relationships: List[Dict[str, Any]],
        temporal_patterns: Dict[str, Any],
        themes: List[str]
    ) -> Dict[str, Any]:
        """Build a structure adapted to this specific user."""
        # Create entity types based on what we actually found
        entity_types = {}
        
        for entity_type, analysis in entity_analysis.items():
            # Skip if too few instances (lowered threshold for testing)
            if analysis['count'] < 1:
                continue
            
            # Build entity definition
            entity_def = {
                'name': entity_type.replace('_', ' ').title(),
                'description': f"Frequently mentioned in your journals ({analysis['count']} times)",
                'color': self._assign_color(entity_type),
                'icon': self._assign_icon(entity_type),
                'examples': analysis['examples'][:3],
                'user_format': analysis['user_format']
            }
            
            # Add fields based on patterns
            fields = self._suggest_fields(entity_type, analysis)
            if fields:
                entity_def['fields'] = fields
            
            entity_types[entity_type] = entity_def
        
        # If no entity types were discovered, provide basic starter types
        if not entity_types:
            entity_types = {
                'note': {
                    'name': 'Note',
                    'description': 'General thoughts and observations',
                    'color': '#95A5A6',
                    'icon': 'FileText',
                    'examples': [],
                    'fields': [
                        {'name': 'tags', 'type': 'list', 'description': 'Related tags'},
                        {'name': 'date', 'type': 'date', 'description': 'When this was written'}
                    ]
                },
                'idea': {
                    'name': 'Idea',
                    'description': 'Creative thoughts and concepts',
                    'color': '#45B7D1',
                    'icon': 'Lightbulb',
                    'examples': [],
                    'fields': [
                        {'name': 'category', 'type': 'string', 'description': 'Type of idea'},
                        {'name': 'status', 'type': 'string', 'description': 'Current status'}
                    ]
                }
            }
        
        # Build relationship types from discovered relationships
        relationship_types = {}
        rel_type_counts = Counter(rel['type'] for rel in relationships)
        
        for rel_type, count in rel_type_counts.most_common():
            if count > 1:
                relationship_types[rel_type] = {
                    'description': f"Discovered from your journal connections ({count} instances)",
                    'examples': [
                        f"{rel['source']} - {rel['target']}" 
                        for rel in relationships 
                        if rel['type'] == rel_type
                    ][:3]
                }
        
        # Build the adaptive structure
        structure = {
            'name': 'Your Personal Knowledge Structure',
            'description': self._generate_structure_description(entity_analysis, themes, temporal_patterns),
            'entity_types': entity_types,
            'relationship_types': relationship_types,
            'unique_features': self._identify_unique_patterns(entity_analysis),
            'recommendations': self._generate_recommendations(entity_analysis, temporal_patterns)
        }
        
        return structure
    
    def _suggest_fields(self, entity_type: str, analysis: Dict[str, Any]) -> List[Dict[str, str]]:
        """Suggest fields for an entity type based on patterns."""
        fields = []
        
        # Base fields on entity type
        if entity_type == 'person':
            fields = [
                {'name': 'relationship', 'type': 'string', 'description': 'How you know them'},
                {'name': 'last_contact', 'type': 'date', 'description': 'When you last interacted'}
            ]
        elif entity_type == 'project':
            fields = [
                {'name': 'status', 'type': 'string', 'description': 'Current project status'},
                {'name': 'goal', 'type': 'string', 'description': 'What you aim to achieve'}
            ]
        elif entity_type == 'habit':
            fields = [
                {'name': 'frequency', 'type': 'string', 'description': 'How often you do this'},
                {'name': 'streak', 'type': 'number', 'description': 'Current streak count'}
            ]
        elif entity_type.startswith('custom_'):
            # For custom types, suggest generic fields
            fields = [
                {'name': 'notes', 'type': 'string', 'description': 'Additional notes'},
                {'name': 'tags', 'type': 'list', 'description': 'Related tags'}
            ]
        
        return fields
    
    def _assign_color(self, entity_type: str) -> str:
        """Assign a color to an entity type."""
        color_map = {
            'person': '#FF6B6B',
            'project': '#4ECDC4',
            'concept': '#45B7D1',
            'emotion': '#FFA07A',
            'habit': '#98D8C8',
            'goal': '#FFD93D',
            'location': '#95E1D3',
            'event': '#DDA0DD',
            'hashtag': '#F38181',
            'linked_note': '#AA96DA'
        }
        
        return color_map.get(entity_type, '#95A5A6')  # Default gray
    
    def _assign_icon(self, entity_type: str) -> str:
        """Assign an icon to an entity type."""
        icon_map = {
            'person': 'User',
            'project': 'Briefcase',
            'concept': 'Lightbulb',
            'emotion': 'Heart',
            'habit': 'RefreshCw',
            'goal': 'Target',
            'location': 'MapPin',
            'event': 'Calendar',
            'hashtag': 'Hash',
            'linked_note': 'Link'
        }
        
        return icon_map.get(entity_type, 'Circle')
    
    def _generate_structure_description(
        self,
        entity_analysis: Dict[str, Any],
        themes: List[str],
        temporal_patterns: Dict[str, Any]
    ) -> str:
        """Generate a description of the user's knowledge structure."""
        parts = []
        
        # Describe writing pattern
        if temporal_patterns.get('consistency', {}).get('is_daily'):
            parts.append("You journal daily")
        elif temporal_patterns.get('consistency', {}).get('is_weekly'):
            parts.append("You journal weekly")
        else:
            parts.append("You journal when inspiration strikes")
        
        # Describe main entity types
        main_types = sorted(
            entity_analysis.items(), 
            key=lambda x: x[1]['count'], 
            reverse=True
        )[:3]
        
        if main_types:
            type_names = [t[0].replace('_', ' ') for t in main_types]
            parts.append(f"primarily tracking {', '.join(type_names)}")
        
        # Describe themes
        if themes:
            parts.append(f"with recurring themes of {', '.join(themes[:3])}")
        
        return "A personal knowledge system where " + ", ".join(parts) + "."
    
    def _generate_recommendations(
        self,
        entity_analysis: Dict[str, Any],
        temporal_patterns: Dict[str, Any]
    ) -> List[str]:
        """Generate recommendations for the user's structure."""
        recommendations = []
        
        # Based on patterns found
        if 'person' in entity_analysis and entity_analysis['person']['count'] > 10:
            recommendations.append("Consider adding a 'last interaction' field to track relationship health")
        
        if 'project' in entity_analysis:
            recommendations.append("You might benefit from project status tracking")
        
        if 'emotion' in entity_analysis:
            recommendations.append("Mood tracking patterns detected - consider emotion analysis views")
        
        if temporal_patterns.get('consistency', {}).get('is_sporadic'):
            recommendations.append("Your irregular pattern might benefit from entry prompts or reminders")
        
        return recommendations