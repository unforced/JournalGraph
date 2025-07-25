# JournalGraph Enhancement Roadmap

Last Updated: 2025-01-22

## Overview

This document outlines the planned enhancements for JournalGraph to improve user experience, data accuracy, and overall functionality. These features will be implemented iteratively, starting with quick wins and building towards more complex functionality.

## Enhancement Categories

### Phase 1: Quick Wins (1-2 weeks)

#### A. Enhanced Journal Viewing
**Goal**: Make journal entries more readable and interactive

1. **Markdown Rendering**
   - Implement proper markdown parsing with `react-markdown`
   - Support lists, headers, code blocks, emphasis, links
   - Preserve original formatting from Obsidian journals
   - Consider supporting Obsidian-style wiki links `[[Entity Name]]`

2. **Entity Highlighting**
   - Highlight detected entities within journal text
   - Different colors for different entity types (Person, Project, Concept, etc.)
   - Hover tooltips showing entity summary
   - Click to navigate to entity in graph view

3. **Hybrid View** ⭐ (High Priority)
   - Split-screen view: Journal entry on left, mini-graph on right
   - Mini-graph shows only entities/relationships from current entry
   - Interactive: clicking entities in text highlights them in mini-graph
   - Bi-directional: selecting in graph highlights in text
   - Use this as the default journal reading experience

### Phase 2: Data Quality (2-3 weeks)

#### B. Entity Disambiguation System
**Goal**: Solve the "multiple Kathleens" problem

1. **Smart Entity Detection**
   - Context-based disambiguation using surrounding text
   - Track entity metadata: first mention date, associated locations, relationships
   - Pattern recognition: "Kathleen from yoga" vs "Kathleen (work colleague)"

2. **User Confirmation Interface**
   - When ambiguity detected, present options to user
   - "Is this the same Kathleen as in entry 2024-01-15?"
   - Ability to merge incorrectly split entities
   - Ability to split incorrectly merged entities

3. **Entity Profiles**
   - Dedicated entity detail view
   - User-editable fields: full name, relationship type, notes
   - Automatic fields: first/last mention, frequency, associated entities
   - Photo/avatar support for people

### Phase 3: Advanced Interactions (3-4 weeks)

#### C. Natural Language Query Interface
**Goal**: Make graph exploration intuitive

1. **Query Processor**
   - Natural language to Cypher query translation
   - Support queries like:
     - "Show me all meetings with Sarah"
     - "What projects did I work on in January?"
     - "Who have I mentioned most in the last month?"
   - Query suggestions and autocomplete

2. **Chat Interface Integration**
   - Implement using [chat-sdk.dev](https://chat-sdk.dev/)
   - Conversational graph exploration
   - Context-aware responses using graph data
   - File upload for additional journal imports
   - Export conversation results

3. **Advanced Filtering**
   - Date range picker for timeline/graph views
   - Entity type filters
   - Relationship type filters
   - Saved filter presets

### Phase 4: Enhanced Visualization (4-5 weeks)

#### D. Graph Improvements
**Goal**: Make the knowledge graph more insightful

1. **Layout Options**
   - Force-directed (current)
   - Hierarchical/Tree view
   - Radial/Circular layout
   - Timeline-based layout

2. **Visual Enhancements**
   - Entity icons based on type
   - Relationship strength visualization (thickness = frequency)
   - Clustering for related entities
   - Zoom to fit / Focus mode for subgraphs

3. **Graph Analytics**
   - Community detection
   - Most connected entities
   - Relationship patterns over time
   - Entity co-occurrence heat map

## Technical Architecture

### Frontend Components

```
src/frontend/renderer/
├── components/
│   ├── JournalViewer/
│   │   ├── MarkdownRenderer.tsx    # react-markdown wrapper
│   │   ├── EntityHighlighter.tsx   # Entity detection & highlighting
│   │   └── HybridView.tsx          # Split journal/graph view
│   ├── EntityDisambiguation/
│   │   ├── DisambiguationModal.tsx # User confirmation UI
│   │   ├── EntityProfile.tsx       # Detailed entity view
│   │   └── EntityMerger.tsx        # Merge/split interface
│   ├── QueryInterface/
│   │   ├── ChatInterface.tsx       # chat-sdk.dev integration
│   │   ├── QueryBuilder.tsx        # Visual query builder
│   │   └── QueryResults.tsx        # Results display
│   └── GraphVisualization/
│       ├── MiniGraph.tsx           # For hybrid view
│       ├── GraphLayouts.tsx        # Different layout algorithms
│       └── GraphAnalytics.tsx      # Analytics visualizations
```

### Backend Services

```
src/backend/
├── services/
│   ├── entity_disambiguation.py    # Smart entity resolution
│   ├── query_processor.py         # NL to Cypher translation
│   └── graph_analytics.py         # Graph analysis algorithms
├── api/routes/
│   ├── entities.py                # Entity CRUD operations
│   ├── chat.py                    # Chat interface endpoints
│   └── analytics.py               # Analytics endpoints
```

## Implementation Order

1. **Week 1-2**: Markdown rendering + Entity highlighting
2. **Week 2-3**: Hybrid view implementation
3. **Week 3-4**: Basic entity disambiguation
4. **Week 4-5**: Chat interface setup
5. **Week 5-6**: Query processing
6. **Week 6-8**: Visual enhancements and polish

## Success Metrics

- **User Experience**: Time to find specific information reduced by 50%
- **Data Quality**: Entity disambiguation accuracy > 90%
- **Engagement**: Average session length increased by 30%
- **Performance**: All queries return in < 500ms

## Dependencies

### Frontend
- `react-markdown`: Markdown rendering
- `remark-gfm`: GitHub Flavored Markdown support
- `chat-sdk`: Chat interface ([chat-sdk.dev](https://chat-sdk.dev/))
- `d3-force-3d`: 3D graph layouts (optional)

### Backend
- `spacy` or similar: Advanced NLP for entity disambiguation
- OpenAI/Anthropic API: Natural language query processing
- `networkx`: Graph analytics algorithms

## Open Questions

1. Should we support importing from other note-taking apps (Roam, Logseq)?
2. How much user control over entity extraction rules?
3. Should chat history be persisted?
4. Export formats needed? (GraphML, JSON-LD, RDF?)

## Next Steps

1. Review and prioritize features with stakeholders
2. Create detailed technical specs for Phase 1
3. Set up development branch for enhancements
4. Begin implementation with markdown rendering