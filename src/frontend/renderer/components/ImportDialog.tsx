import { X, Folder, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface ImportProgress {
  current: number;
  total: number;
  filename?: string;
  message?: string;
  entities?: number;
  relationships?: number;
  errors: string[];
  entityTypes?: Record<string, number>;
  schemaApplied?: boolean;
}

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: () => void;
  onStartImport: () => void;
  selectedFolder: string | null;
  isImporting?: boolean;
  progress?: ImportProgress;
}

export function ImportDialog({
  isOpen,
  onClose,
  onSelectFolder,
  onStartImport,
  selectedFolder,
  isImporting = false,
  progress,
}: ImportDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        data-testid="import-dialog"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Import Journal Entries</h2>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select the folder containing your Obsidian daily notes. JournalGraph will look for
            markdown files in YYYY-MM-DD format.
          </p>

          <button
            onClick={onSelectFolder}
            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors flex items-center justify-center space-x-2"
            data-testid="select-folder-button"
          >
            <Folder className="w-5 h-5 text-gray-400" />
            <span className="text-gray-700">Choose Folder</span>
          </button>

          {selectedFolder && !isImporting && (
            <div
              className="bg-green-50 p-3 rounded-lg flex items-start space-x-2"
              data-testid="selected-folder"
            >
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Folder selected:</p>
                <p className="text-sm text-green-700 break-all">{selectedFolder}</p>
              </div>
            </div>
          )}

          {isImporting && progress && (
            <div className="space-y-3">
              {/* Progress bar */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <p className="text-sm font-medium text-gray-900">
                      Processing {progress.current} of {progress.total} files
                    </p>
                  </div>
                  <span className="text-sm text-gray-600">
                    {Math.round((progress.current / progress.total) * 100)}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>

                {progress.message && <p className="text-xs text-gray-600">{progress.message}</p>}
              </div>

              {/* Stats */}
              {(progress.entities !== undefined || progress.relationships !== undefined) && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-900">{progress.entities || 0}</p>
                      <p className="text-xs text-blue-700">Entities extracted</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-900">
                        {progress.relationships || 0}
                      </p>
                      <p className="text-xs text-purple-700">Relationships created</p>
                    </div>
                  </div>

                  {/* Entity Types Breakdown */}
                  {progress.schemaApplied &&
                    progress.entityTypes &&
                    Object.keys(progress.entityTypes).length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Entity Types Found:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(progress.entityTypes).map(([type, count]) => (
                            <span
                              key={type}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-gray-200"
                            >
                              {count} {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Errors */}
              {progress.errors.length > 0 && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900 mb-1">
                        {progress.errors.length} error{progress.errors.length !== 1 ? 's' : ''}
                      </p>
                      <ul className="text-xs text-red-700 space-y-1">
                        {progress.errors.slice(-3).map((error, i) => (
                          <li key={i} className="truncate">
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm font-medium"
            >
              Cancel
            </button>
            <button
              disabled={!selectedFolder || isImporting}
              onClick={onStartImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? 'Importing...' : 'Start Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
