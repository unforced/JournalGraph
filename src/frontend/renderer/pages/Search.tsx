import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { SearchResults } from '../components/SearchResults';
import { EntityDetailPanel } from '../components/EntityDetailPanel';
import { SearchResponse } from '../api/search';
import { Entity } from '../types';

export function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Get initial query from navigation state
  useEffect(() => {
    const initialQuery = location.state?.query || '';
    if (initialQuery) {
      setCurrentQuery(initialQuery);
    }
  }, [location.state]);

  const handleSearchResults = (results: SearchResponse | null) => {
    setSearchResults(results);
    if (results) {
      const query = location.state?.query || '';
      setCurrentQuery(query);
    }
  };

  const handleEntityClick = (entity: Entity) => {
    setSelectedEntity(entity);
    setIsPanelOpen(true);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 max-w-2xl">
            <SearchBar onSearchResults={handleSearchResults} className="w-full" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {searchResults ? (
            <SearchResults
              results={searchResults}
              query={currentQuery}
              onEntityClick={handleEntityClick}
            />
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-gray-400">
                Enter a search query to explore your journal entries
              </p>
              <div className="mt-8 text-left max-w-md mx-auto">
                <h3 className="font-medium mb-3">Try searching for:</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• People you've mentioned</li>
                  <li>• Projects you're working on</li>
                  <li>• Concepts and ideas</li>
                  <li>• Events and meetings</li>
                  <li>• Tasks and goals</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Entity Detail Panel */}
      {isPanelOpen && selectedEntity && (
        <EntityDetailPanel
          entity={selectedEntity}
          isOpen={isPanelOpen}
          onClose={() => {
            setIsPanelOpen(false);
            setSelectedEntity(null);
          }}
          onEntityClick={handleEntityClick}
        />
      )}
    </div>
  );
}
