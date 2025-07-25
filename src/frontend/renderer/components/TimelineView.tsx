import { Calendar, Loader2, AlertCircle, FileText, GitBranch, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EntityHighlighter, type Entity } from './EntityHighlighter';
import { useNavigate } from 'react-router-dom';
import { EntityDetailPanel } from './EntityDetailPanel';

interface TimelineEntry {
  id: string;
  name: string;
  date: string;
  content: string;
  source_description: string;
  entity_count: number;
  relationship_count: number;
  entities?: Entity[];
}

interface TimelineData {
  entries: TimelineEntry[];
  total: number;
}

export function TimelineView() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/query/timeline');
        if (!response.ok) {
          throw new Error(`Failed to fetch timeline data: ${response.statusText}`);
        }
        const timelineData = await response.json();
        setData(timelineData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
      } finally {
        setLoading(false);
      }
    };

    fetchTimelineData();
  }, []);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
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

  const handleEntityClick = (entity: Entity) => {
    // Open the entity detail panel
    setSelectedEntity(entity);
    setIsPanelOpen(true);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Calendar className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Timeline Data</h3>
          <p className="text-sm text-gray-600">
            Import your journal entries to see them in chronological order
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Journal Timeline</h2>
          <p className="text-sm text-gray-600">{data.total} journal entries imported</p>
        </div>

        <div className="space-y-4">
          {data.entries.map((entry) => {
            const isExpanded = expandedEntries.has(entry.id);
            const previewLength = 200;
            const needsExpansion = entry.content && entry.content.length > previewLength;
            const displayContent = isExpanded
              ? entry.content
              : entry.content?.substring(0, previewLength) + (needsExpansion ? '...' : '');

            return (
              <div
                key={entry.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      <button
                        onClick={() => navigate(`/entry/${entry.id}`)}
                        className="hover:text-blue-600 transition-colors text-left"
                      >
                        {entry.name}
                      </button>
                    </h3>
                    <p className="text-sm text-gray-500">{formatDate(entry.date)}</p>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{entry.entity_count} entities</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <GitBranch className="w-4 h-4" />
                      <span>{entry.relationship_count} relationships</span>
                    </div>
                  </div>
                </div>

                {entry.content && (
                  <div>
                    <div className="prose prose-sm max-w-none">
                      {isExpanded ? (
                        <EntityHighlighter
                          content={entry.content}
                          entities={entry.entities || []}
                          onEntityClick={handleEntityClick}
                        />
                      ) : (
                        <div>
                          <EntityHighlighter
                            content={displayContent}
                            entities={entry.entities || []}
                            onEntityClick={handleEntityClick}
                          />
                        </div>
                      )}
                    </div>
                    {needsExpansion && (
                      <button
                        onClick={() => toggleExpanded(entry.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 block"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}

                {entry.source_description && (
                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <FileText className="w-3 h-3 mr-1" />
                    {entry.source_description}
                  </div>
                )}
              </div>
            );
          })}
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
