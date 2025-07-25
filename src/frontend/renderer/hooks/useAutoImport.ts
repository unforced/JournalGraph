import { useEffect, useState } from 'react';
import { getSettings, updateSettings, shouldCheckForImports } from '../utils/settings';

interface ImportProgress {
  isImporting: boolean;
  current: number;
  total: number;
  message: string;
}

export function useAutoImport() {
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkAndImport = async () => {
      // Only check once per app session
      if (isChecking) return;

      if (!shouldCheckForImports()) {
        return;
      }

      setIsChecking(true);
      const settings = getSettings();

      try {
        // Check for unprocessed journals
        const response = await fetch(
          `http://localhost:8001/api/journal/check-unprocessed?vault_path=${encodeURIComponent(settings.vaultPath!)}`
        );

        if (!response.ok) {
          console.error('Failed to check unprocessed journals');
          return;
        }

        const data = await response.json();

        if (data.total === 0) {
          // No unprocessed journals, update last import date
          updateSettings({ lastImportDate: new Date().toISOString().split('T')[0] });
          return;
        }

        // Found unprocessed journals, start importing
        console.log(`Found ${data.total} unprocessed journal entries`);
        setImportProgress({
          isImporting: true,
          current: 0,
          total: data.total,
          message: `Importing ${data.total} journal entries...`,
        });

        // Read file contents for batch import
        const entries = [];
        for (const journal of data.unprocessed) {
          if (window.electronAPI?.readFile) {
            try {
              const content = await window.electronAPI.readFile(journal.path);
              entries.push({
                filename: journal.filename,
                path: journal.path,
                content,
              });
            } catch (error) {
              console.error(`Error reading ${journal.filename}:`, error);
            }
          }
        }

        if (entries.length === 0) {
          setImportProgress(null);
          return;
        }

        // Import journals using streaming endpoint
        const importResponse = await fetch(
          'http://localhost:8001/api/journal/import-batch-stream',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ entries }),
          }
        );

        if (!importResponse.ok) {
          throw new Error('Import failed');
        }

        // Read the stream
        const reader = importResponse.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case 'processing':
                    setImportProgress({
                      isImporting: true,
                      current: data.current,
                      total: data.total,
                      message: `Processing ${data.filename}...`,
                    });
                    break;

                  case 'file_complete':
                    setImportProgress((prev) => {
                      if (!prev) return null;

                      let message = `Imported ${data.filename} (${data.entities} entities, ${data.relationships} relationships)`;

                      // Add schema-specific info if available
                      if (data.schema_applied && data.entity_types) {
                        const typesSummary = Object.entries(data.entity_types)
                          .map(([type, count]) => `${count} ${type}`)
                          .join(', ');
                        if (typesSummary) {
                          message += ` - Found: ${typesSummary}`;
                        }
                      }

                      return {
                        ...prev,
                        current: data.current,
                        message,
                      };
                    });
                    break;

                  case 'complete':
                    // Update last import date
                    updateSettings({ lastImportDate: new Date().toISOString().split('T')[0] });

                    // Show success message
                    setImportProgress({
                      isImporting: false,
                      current: data.processed_files,
                      total: data.processed_files,
                      message: `Import complete! Processed ${data.processed_files} files, extracted ${data.total_entities} entities and ${data.total_relationships} relationships.`,
                    });

                    // Clear progress after 5 seconds
                    setTimeout(() => {
                      setImportProgress(null);
                    }, 5000);
                    break;

                  case 'error':
                    console.error(`Error processing ${data.filename}:`, data.error);
                    break;
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Auto-import error:', error);
        setImportProgress({
          isImporting: false,
          current: 0,
          total: 0,
          message: 'Auto-import failed. Please try manual import.',
        });

        setTimeout(() => {
          setImportProgress(null);
        }, 5000);
      } finally {
        setIsChecking(false);
      }
    };

    // Check on mount
    checkAndImport();
  }, []);

  return { importProgress };
}
