import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { ImportDialog } from './components/ImportDialog';
import { GraphView } from './components/GraphView';
import { TimelineView } from './components/TimelineView';
import { HybridView } from './components/HybridView';
import { AutoImportNotification } from './components/AutoImportNotification';
import { useAutoImport } from './hooks/useAutoImport';
import { updateSettings, getSettings } from './utils/settings';
import { Settings } from './pages/Settings';
import { Search } from './pages/Search';
import { OnboardingFlow } from './components/OnboardingFlow';
import { personalSchemaApi } from './api/personalSchema';

interface ImportProgress {
  current: number;
  total: number;
  filename?: string;
  message?: string;
  entities?: number;
  relationships?: number;
  errors: string[];
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeView =
    location.pathname === '/timeline'
      ? 'timeline'
      : location.pathname.startsWith('/entry/')
        ? 'timeline'
        : 'graph';
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    errors: [],
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Auto-import hook
  const { importProgress: autoImportProgress } = useAutoImport();

  useEffect(() => {
    // Get app version on mount
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion);
    }

    // Test backend connectivity
    fetch('http://localhost:8001/api/health/')
      .then((res) => res.json())
      .then((data) => console.log('Backend health check:', data))
      .catch((err) => console.error('Backend not accessible:', err));

    // Check if user has set up their knowledge structure
    checkStructureSetup();
  }, []);

  const checkStructureSetup = async () => {
    try {
      // Check if user has created any schemas
      const schema = await personalSchemaApi.getPersonalSchema();
      console.log('Schema check:', schema);
      const hasSetup = schema && Object.keys(schema.entity_types || {}).length > 0;
      console.log('Has setup:', hasSetup);
      // Show onboarding if no structure is set up
      if (!hasSetup) {
        const settings = getSettings();
        console.log('Settings:', settings);
        if (!settings.onboardingCompleted) {
          console.log('Showing onboarding');
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      console.error('Error checking structure setup:', error);
    }
  };

  const handleSelectFolder = async () => {
    if (!window.electronAPI?.selectFolder) {
      console.error('Electron API not available');
      return;
    }
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      setSelectedFolder(folder);
      // Store the vault path for auto-import
      updateSettings({ vaultPath: folder });
    }
  };

  const handleStartImport = async () => {
    if (!selectedFolder) return;

    setIsImporting(true);
    console.log('Starting import from:', selectedFolder);

    try {
      // First, get list of journal files from Electron
      console.log('Listing files in folder...');
      if (!window.electronAPI?.listFiles) {
        console.error('Electron API not available');
        return;
      }
      const files = await window.electronAPI.listFiles(selectedFolder, '*.md');
      console.log('Found files:', files);

      if (files.length === 0) {
        throw new Error(
          'No journal files found. Make sure files are named in YYYY-MM-DD.md format.'
        );
      }

      // Read file contents
      console.log('Reading file contents...');
      const journalEntries = [];

      for (const filePath of files) {
        try {
          if (!window.electronAPI?.readFile) {
            console.error('Electron API not available');
            continue;
          }
          const content = await window.electronAPI.readFile(filePath);
          const fileName = filePath.split('/').pop() || '';
          journalEntries.push({
            filename: fileName,
            path: filePath,
            content: content,
          });
        } catch (readError) {
          console.error(`Error reading file ${filePath}:`, readError);
        }
      }

      console.log(`Read ${journalEntries.length} journal entries`);

      // Send to backend with streaming progress
      console.log('Sending to backend with streaming...');

      // Reset progress
      setImportProgress({
        current: 0,
        total: journalEntries.length,
        errors: [],
        message: 'Starting import...',
      });

      // Use EventSource for Server-Sent Events
      const response = await fetch('http://localhost:8001/api/journal/import-batch-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: journalEntries,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Import failed: ${response.statusText} - ${errorText}`);
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalEntities = 0;
      let totalRelationships = 0;

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
                case 'start':
                  setImportProgress((prev) => ({ ...prev, total: data.total }));
                  break;

                case 'status':
                  setImportProgress((prev) => ({ ...prev, message: data.message }));
                  break;

                case 'processing':
                  setImportProgress((prev) => ({
                    ...prev,
                    current: data.current,
                    filename: data.filename,
                    message: `Processing ${data.filename}...`,
                  }));
                  break;

                case 'file_complete':
                  totalEntities += data.entities;
                  totalRelationships += data.relationships;
                  setImportProgress((prev) => ({
                    ...prev,
                    current: data.current,
                    entities: totalEntities,
                    relationships: totalRelationships,
                    message: `Processed ${data.filename}`,
                    schemaApplied: data.schema_applied,
                    entityTypes: data.entity_types,
                  }));
                  break;

                case 'error':
                  setImportProgress((prev) => ({
                    ...prev,
                    errors: [...prev.errors, `${data.filename}: ${data.error}`],
                  }));
                  break;

                case 'complete':
                  // Update last import date
                  updateSettings({ lastImportDate: new Date().toISOString().split('T')[0] });

                  // Show completion message
                  setTimeout(() => {
                    alert(
                      `Import completed!\nProcessed files: ${data.processed_files}\nExtracted entities: ${data.total_entities}\nCreated relationships: ${data.total_relationships}${data.errors.length > 0 ? `\n\nErrors:\n${data.errors.join('\n')}` : ''}`
                    );
                    setIsImportOpen(false);
                    setSelectedFolder(null);
                    setImportProgress({ current: 0, total: 0, errors: [] });
                  }, 500);
                  break;

                case 'fatal_error':
                  throw new Error(data.error);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Import error details:', error);
      alert('Import failed: ' + (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50" data-testid="app">
      <Header
        onImportClick={() => setIsImportOpen(true)}
        activeView={activeView}
        onViewChange={(view) => {
          navigate(view === 'timeline' ? '/timeline' : '/');
        }}
      />

      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<GraphView />} />
          <Route path="/timeline" element={<TimelineView />} />
          <Route path="/entry/:entryId" element={<HybridView />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </main>

      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setSelectedFolder(null);
          setImportProgress({ current: 0, total: 0, errors: [] });
        }}
        onSelectFolder={handleSelectFolder}
        onStartImport={handleStartImport}
        selectedFolder={selectedFolder}
        isImporting={isImporting}
        progress={importProgress}
      />

      <footer className="bg-white border-t px-4 py-2 text-sm text-gray-500">
        JournalGraph v{appVersion}
      </footer>

      <AutoImportNotification progress={autoImportProgress} />

      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow
          onComplete={() => {
            setShowOnboarding(false);
            updateSettings({ onboardingCompleted: true });
            checkStructureSetup(); // Re-check to update state
          }}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
