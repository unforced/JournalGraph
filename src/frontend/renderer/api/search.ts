import { GraphData } from '../types';

const API_BASE = 'http://localhost:8001/api';

export interface SearchRequest {
  query: string;
  start_date?: string;
  end_date?: string;
  entity_types?: string[];
  limit?: number;
}

export interface SearchResponse {
  nodes: GraphData['nodes'];
  edges: GraphData['edges'];
  query_time_ms: number;
}

export const searchApi = {
  async search(request: SearchRequest): Promise<SearchResponse> {
    const response = await fetch(`${API_BASE}/query/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    return response.json();
  },
};
