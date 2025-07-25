import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Tag, Link, FileText } from 'lucide-react';
import { SearchResponse } from '../api/search';
import { Entity, GraphNode } from '../types';

interface SearchResultsProps {
  results: SearchResponse | null;
  query: string;
  onEntityClick?: (entity: Entity) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results, query, onEntityClick }) => {
  const navigate = useNavigate();

  if (!results) {
    return null;
  }

  const { nodes, edges, query_time_ms } = results;

  const handleNodeClick = (node: GraphNode) => {
    if (node.type === 'Episodic') {
      // Navigate to journal entry
      navigate(`/entry/${node.id}`);
    } else {
      // Handle as entity
      const entity: Entity = {
        uuid: node.id,
        name: node.label,
        type: node.type,
        summary: node.properties?.summary || '',
      };

      if (onEntityClick) {
        onEntityClick(entity);
      } else {
        // Navigate to graph view with entity highlighted
        navigate('/', { state: { highlightEntityId: node.id } });
      }
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'Episodic':
        return <FileText className="w-4 h-4" />;
      case 'Person':
        return <Tag className="w-4 h-4" />;
      case 'Event':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Search Results for "{query}"</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Found {nodes.length} entities and {edges.length} relationships ({query_time_ms.toFixed(0)}
          ms)
        </p>
      </div>

      {/* Entities/Nodes */}
      {nodes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">Entities</h3>
          <div className="space-y-2">
            {nodes.map((node) => (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node)}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg 
                  hover:bg-gray-100 dark:hover:bg-gray-700 
                  cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-gray-500 dark:text-gray-400">
                    {getNodeIcon(node.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{node.label}</span>
                      <span
                        className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 
                        rounded-full text-gray-600 dark:text-gray-400"
                      >
                        {node.type}
                      </span>
                    </div>
                    {node.properties?.summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {node.properties.summary}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relationships/Edges */}
      {edges.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
            Relationships
          </h3>
          <div className="space-y-2">
            {edges.map((edge, index) => {
              // Find source and target nodes
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);

              if (!sourceNode || !targetNode) return null;

              return (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg 
                    flex items-center gap-3"
                >
                  <button
                    onClick={() => handleNodeClick(sourceNode)}
                    className="font-medium hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {sourceNode.label}
                  </button>

                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Link className="w-3 h-3" />
                    <span className="text-sm">{edge.type}</span>
                    <Link className="w-3 h-3" />
                  </div>

                  <button
                    onClick={() => handleNodeClick(targetNode)}
                    className="font-medium hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {targetNode.label}
                  </button>

                  {edge.properties?.fact && (
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-auto">
                      "{edge.properties.fact}"
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {nodes.length === 0 && edges.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No results found. Try a different search query.
        </div>
      )}
    </div>
  );
};
