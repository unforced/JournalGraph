import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Calendar, Users, GitBranch } from 'lucide-react';
import { EntityHighlighter, type Entity } from './EntityHighlighter';
import { MiniGraph } from './MiniGraph';
import { EntityDetailPanel } from './EntityDetailPanel';

interface JournalEntry {
  id: string;
  name: string;
  date: string;
  content: string;
  source_description: string;
  entity_count: number;
  relationship_count: number;
  entities?: Entity[];
}

interface GraphData {
  nodes: Array<{
    id: string;
    type: string;
    label: string;
    properties: Record<string, any>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    properties: Record<string, any>;
  }>;
}

export function HybridView() {
  const { entryId } = useParams<{ entryId: string }>();
  const navigate = useNavigate();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedEntityId, setHighlightedEntityId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!entryId) return;

      try {
        setLoading(true);

        // Fetch journal entry
        const timelineResponse = await fetch('http://localhost:8001/api/query/timeline');
        if (!timelineResponse.ok) {
          throw new Error('Failed to fetch timeline data');
        }
        const timelineData = await timelineResponse.json();
        const journalEntry = timelineData.entries.find((e: JournalEntry) => e.id === entryId);

        if (!journalEntry) {
          throw new Error('Journal entry not found');
        }

        setEntry(journalEntry);

        // Fetch graph data for this entry's entities
        if (journalEntry.entities && journalEntry.entities.length > 0) {
          const entityIds = journalEntry.entities.map((e: Entity) => e.uuid);
          const graphResponse = await fetch('http://localhost:8001/api/query/entry-graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entry_id: entryId, entity_ids: entityIds }),
          });

          if (graphResponse.ok) {
            const data = await graphResponse.json();
            setGraphData(data);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [entryId]);

  const handleEntityClick = (entity: Entity) => {
    setHighlightedEntityId(entity.uuid);
    setSelectedEntity(entity);
    setIsPanelOpen(true);
  };

  const handleNodeClick = (nodeId: string) => {
    setHighlightedEntityId(nodeId);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading journal entry...</p>
        </div>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-sm text-red-600">{error || 'Entry not found'}</p>
          <button
            onClick={() => navigate('/timeline')}
            className="mt-4 text-blue-600 hover:text-blue-800 text-sm"
          >
            Back to Timeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/timeline')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{entry.name}</h1>
              <p className="text-sm text-gray-500">{formatDate(entry.date)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>{entry.entity_count} entities</span>
            </div>
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4" />
              <span>{entry.relationship_count} relationships</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Journal Entry Panel */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-3xl mx-auto p-6">
            <div className="prose prose-lg max-w-none">
              <EntityHighlighter
                content={entry.content}
                entities={entry.entities || []}
                onEntityClick={handleEntityClick}
              />
            </div>

            {entry.source_description && (
              <div className="mt-8 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  {entry.source_description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Graph Panel */}
        <div className="w-1/2 border-l border-gray-200 bg-gray-50">
          {graphData && (entry.entities?.length || 0) > 0 ? (
            <MiniGraph
              nodes={graphData.nodes}
              edges={graphData.edges}
              highlightedNodeId={highlightedEntityId}
              onNodeClick={handleNodeClick}
              entities={entry.entities || []}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No entities found in this entry</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <EntityDetailPanel
        entity={selectedEntity}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedEntity(null);
        }}
        onEntityClick={(newEntity) => {
          setSelectedEntity(newEntity);
        }}
      />
    </div>
  );
}
