// Common types used across the application

export interface Entity {
  uuid: string;
  name: string;
  type: string;
  summary?: string;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties?: {
    summary?: string;
    created_at?: string;
    content?: string;
    [key: string]: unknown;
  };
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  properties?: {
    fact?: string;
    created_at?: string;
    [key: string]: unknown;
  };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface JournalEntry {
  id: string;
  name: string;
  date: string;
  content: string;
  source_description?: string;
  entity_count: number;
  relationship_count: number;
  entities: Entity[];
}
