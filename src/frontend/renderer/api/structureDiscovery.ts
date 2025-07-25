const API_BASE = 'http://localhost:8001/api';

export interface StructureSuggestion {
  structure_id: string;
  name: string;
  description: string;
  relevance_score: number;
  matching_patterns: string[];
  sample_entities: Array<{
    text: string;
    type: string;
    context: string;
  }>;
}

export interface ConversationStartRequest {
  sample_entries: string[];
  initial_preferences?: Record<string, any>;
}

export interface ConversationResponse {
  conversation_id: string;
  current_question: string;
  suggestions: StructureSuggestion[];
  analysis_insights: {
    content_focus?: string;
    complexity_level?: string;
    temporal_patterns?: Record<string, any>;
    actual_quotes?: Array<{ text: string; context: string }>;
    user_patterns?: Record<string, string[]>;
    stage?: string;
    entities?: Array<{ name: string; description: string }>;
  };
  recommended_structures: string[];
}

export interface ConversationContinueRequest {
  conversation_id: string;
  user_response: string;
  selected_structure_id?: string;
}

export interface Structure {
  id: string;
  name: string;
  description: string;
  author: string;
  entity_count: number;
  relationship_count: number;
}

export interface StructureDetails {
  id: string;
  name: string;
  description: string;
  author: string;
  entity_types: Array<{
    name: string;
    description: string;
    color: string;
    icon: string;
    suggested_properties: string[];
  }>;
  relationships: Array<{
    name: string;
    description: string;
    source_types: string[];
    target_types: string[];
    properties: string[];
  }>;
  suggested_questions: string[];
  example_patterns: string[];
}

export const structureDiscoveryApi = {
  async getStructures(): Promise<{ structures: Structure[] }> {
    const response = await fetch(`${API_BASE}/structure-discovery/structures`);
    if (!response.ok) {
      throw new Error(`Failed to fetch structures: ${response.statusText}`);
    }
    return response.json();
  },

  async getStructureDetails(structureId: string): Promise<StructureDetails> {
    const response = await fetch(`${API_BASE}/structure-discovery/structures/${structureId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch structure details: ${response.statusText}`);
    }
    return response.json();
  },

  async analyzeContent(sampleEntries: string[], userContext?: Record<string, any>) {
    const response = await fetch(`${API_BASE}/structure-discovery/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sample_entries: sampleEntries,
        user_context: userContext || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }
    return response.json();
  },

  async startConversation(request: ConversationStartRequest): Promise<ConversationResponse> {
    const response = await fetch(`${API_BASE}/structure-discovery/conversation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to start conversation: ${response.statusText}`);
    }
    return response.json();
  },

  async continueConversation(request: ConversationContinueRequest): Promise<ConversationResponse> {
    const response = await fetch(`${API_BASE}/structure-discovery/conversation/continue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to continue conversation: ${response.statusText}`);
    }
    return response.json();
  },

  async applyStructure(structureConfig: {
    structure_id?: string;
    custom_structure?: Record<string, any>;
    entity_types: Array<Record<string, any>>;
    relationships: Array<Record<string, any>>;
  }) {
    const response = await fetch(`${API_BASE}/structure-discovery/apply-structure`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(structureConfig),
    });

    if (!response.ok) {
      throw new Error(`Failed to apply structure: ${response.statusText}`);
    }
    return response.json();
  },

  async getAvailableStructures(): Promise<{ structures: Structure[] }> {
    return this.getStructures();
  },

  async createHybridStructure(hybridConfig: {
    selected_structures: Array<{
      structure_id: string;
      selected_entities: string[];
      selected_relationships: string[];
    }>;
    custom_entities: Array<{
      name: string;
      description: string;
      color: string;
      icon: string;
    }>;
    custom_relationships: Array<any>;
  }) {
    const response = await fetch(`${API_BASE}/structure-discovery/create-hybrid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(hybridConfig),
    });

    if (!response.ok) {
      throw new Error(`Failed to create hybrid structure: ${response.statusText}`);
    }
    return response.json();
  },

  async discoverAdaptiveStructure(journalEntries: string[]): Promise<any> {
    const response = await fetch(`${API_BASE}/structure-discovery/adaptive-discovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sample_entries: journalEntries,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to discover adaptive structure');
    }

    return response.json();
  },
};
