import { FileText, Network, Calendar, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from './SearchBar';

interface HeaderProps {
  onImportClick: () => void;
  activeView: 'graph' | 'timeline';
  onViewChange: (view: 'graph' | 'timeline') => void;
}

export function Header({ onImportClick, activeView, onViewChange }: HeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="bg-white border-b" data-testid="app-header">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">JournalGraph</h1>

            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onViewChange('graph')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'graph'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Network className="w-4 h-4 inline mr-1.5" />
                Graph
              </button>
              <button
                onClick={() => onViewChange('timeline')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-1.5" />
                Timeline
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <SearchBar className="mr-2" />

            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button
              onClick={onImportClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center"
              data-testid="import-button"
            >
              <FileText className="w-4 h-4 mr-2" />
              Import Journals
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
