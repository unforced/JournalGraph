import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchApi, SearchResponse } from '../api/search';
import { debounce } from '../utils/debounce';

interface SearchBarProps {
  onSearchResults?: (results: SearchResponse | null) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearchResults,
  placeholder = 'Search your journal entries...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        onSearchResults?.(null);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const results = await searchApi.search({
          query: searchQuery,
          limit: 20,
        });
        onSearchResults?.(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        onSearchResults?.(null);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [onSearchResults]
  );

  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  const handleClear = () => {
    setQuery('');
    setError(null);
    onSearchResults?.(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      // Navigate to search results page
      navigate('/search', { state: { query } });
    }
    if (e.key === 'Escape') {
      if (query) {
        handleClear();
      } else {
        setIsExpanded(false);
        inputRef.current?.blur();
      }
    }
  };

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleBlur = () => {
    // Delay to allow clicking on results
    setTimeout(() => {
      if (!query) {
        setIsExpanded(false);
      }
    }, 200);
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div
        className={`
        flex items-center gap-2 px-3 py-2 
        bg-gray-100 dark:bg-gray-800 
        rounded-lg transition-all duration-200
        ${isExpanded ? 'w-80' : 'w-64'}
        ${error ? 'ring-2 ring-red-500' : ''}
      `}
      >
        <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
        />

        {isSearching && <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />}

        {query && !isSearching && (
          <button
            onClick={handleClear}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {error && (
        <div
          className="absolute top-full mt-1 left-0 right-0 
          bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 
          text-xs p-2 rounded shadow-lg z-50"
        >
          {error}
        </div>
      )}
    </div>
  );
};
