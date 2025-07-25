import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface ImportProgress {
  isImporting: boolean;
  current: number;
  total: number;
  message: string;
}

interface AutoImportNotificationProps {
  progress: ImportProgress | null;
}

export function AutoImportNotification({ progress }: AutoImportNotificationProps) {
  if (!progress) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-lg bg-white rounded-lg shadow-lg border p-4 z-50">
      <div className="flex items-start gap-3">
        {progress.isImporting ? (
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin mt-0.5 flex-shrink-0" />
        ) : progress.current === progress.total ? (
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">
            {progress.isImporting ? 'Auto-importing journals...' : 'Auto-import complete'}
          </h4>
          <p className="text-sm text-gray-600 mt-1 break-words">{progress.message}</p>

          {progress.isImporting && progress.total > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
