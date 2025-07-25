import React, { useState } from 'react';
import { Upload, MessageSquare, Sparkles, CheckCircle, ArrowRight, FileText } from 'lucide-react';
import { StructureDiscoveryChat } from './StructureDiscoveryChat';
import { AdaptiveDiscoveryFlow } from './AdaptiveDiscoveryFlow';
import { structureDiscoveryApi, StructureDetails } from '../api/structureDiscovery';
import { EntityTypeDefinition } from '../../../shared/types/personalSchema';

interface OnboardingFlowProps {
  onComplete: () => void;
  onClose: () => void;
}

type Step = 'select-entries' | 'analyze' | 'adaptive-discovery' | 'chat' | 'preview' | 'complete';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete, onClose }) => {
  const [currentStep, setCurrentStep] = useState<Step>('select-entries');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sampleEntries, setSampleEntries] = useState<string[]>([]);
  const [sampleFilenames, setSampleFilenames] = useState<string[]>([]);
  const [structureDetails, setStructureDetails] = useState<StructureDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);

    // Read file contents
    const entries: string[] = [];
    for (const file of files.slice(0, 20)) {
      // Use up to 20 files for better analysis
      const content = await file.text();
      entries.push(content);
    }
    setSampleEntries(entries);
  };

  const handleSelectFolder = async () => {
    if (window.electronAPI?.selectFolder) {
      const folder = await window.electronAPI.selectFolder();
      if (folder) {
        try {
          // List journal files in the folder (looking for YYYY-MM-DD pattern)
          const files = await window.electronAPI.listFiles(folder, '*.md');

          // Filter for files with date pattern and sort by date (newest first)
          const journalFiles = files
            .filter((file) => /\d{4}-\d{2}-\d{2}/.test(file))
            .sort((a, b) => b.localeCompare(a))
            .slice(0, 20); // Take up to 20 most recent files for better analysis

          if (journalFiles.length > 0) {
            // Read the content of each file
            const entries: string[] = [];
            const filenames: string[] = [];
            for (const file of journalFiles) {
              const filePath = `${folder}/${file}`;
              const content = await window.electronAPI.readFile(filePath);
              entries.push(content);
              filenames.push(file);
            }
            setSampleEntries(entries);
            setSampleFilenames(filenames);
            setCurrentStep('analyze');
          } else {
            // No journal files found
            alert(
              'No journal files found in the selected folder. Please select a folder containing .md files with dates in YYYY-MM-DD format.'
            );
          }
        } catch (error) {
          console.error('Error reading journal files:', error);
          alert('Error reading journal files. Please try again.');
        }
      }
    }
  };

  const startAnalysis = () => {
    setCurrentStep('adaptive-discovery');
  };

  const handleStructureSelected = async (structureId: string) => {
    setIsLoading(true);

    try {
      if (structureId === 'hybrid') {
        // For hybrid structures, create a minimal structure details object
        setStructureDetails({
          id: 'hybrid',
          name: 'Hybrid Structure',
          description: 'Your personalized combination of knowledge structures',
          author: 'You',
          entity_types: [],
          relationships: [],
          suggested_questions: [],
          example_patterns: [],
        });
        setCurrentStep('complete');
      } else {
        // Fetch structure details
        const details = await structureDiscoveryApi.getStructureDetails(structureId);
        setStructureDetails(details);
        setCurrentStep('preview');
      }
    } catch (error) {
      console.error('Error fetching structure details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyDiscoveredStructure = async (structure: any) => {
    setIsLoading(true);
    try {
      // Convert discovered structure to entity types format
      const entityTypes: EntityTypeDefinition[] = Object.entries(structure.entity_types || {}).map(
        ([, type]: [string, any]) => ({
          name: type.name,
          description: type.description,
          fields: (type.fields || []).map((f: any) => ({
            name: f.name,
            field_type: f.type || 'string',
            required: false,
          })),
          color: type.color,
          icon: type.icon,
        })
      );

      // Apply the structure
      await structureDiscoveryApi.applyStructure({
        structure_id: 'adaptive',
        entity_types: entityTypes.map((et) => ({
          name: et.name,
          description: et.description || '',
          color: et.color || '#95A5A6',
          icon: et.icon || 'Circle',
          properties: et.fields.map((f) => f.name),
        })),
        relationships: Object.entries(structure.relationship_types || {}).map(([key, rel]: [string, any]) => ({
          name: key,
          description: rel.description,
        })),
      });

      setCurrentStep('complete');
    } catch (error) {
      console.error('Error applying discovered structure:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyStructure = async () => {
    if (!structureDetails) return;

    setIsLoading(true);
    try {
      // Handle hybrid structure differently
      if (structureDetails.id === 'hybrid') {
        // For hybrid structures, we just move to complete as the structure was already created
        setCurrentStep('complete');
      } else {
        // Convert structure to PersonalSchema format
        const entityTypes: Record<string, EntityTypeDefinition> = {};
        structureDetails.entity_types.forEach((et) => {
          entityTypes[et.name] = {
            name: et.name,
            description: et.description,
            fields: et.suggested_properties.map((prop) => ({
              name: prop,
              field_type: 'string' as const,
              required: false,
            })),
            color: et.color,
            icon: et.icon,
          };
        });

        // Apply the structure using the structure discovery API
        await structureDiscoveryApi.applyStructure({
          structure_id: structureDetails.id,
          entity_types: Object.values(entityTypes).map((et) => ({
            name: et.name,
            description: et.description,
            color: et.color,
            icon: et.icon,
            properties: et.fields.map((f) => f.name),
          })),
          relationships: structureDetails.relationships,
        });

        setCurrentStep('complete');
      }
    } catch (error) {
      console.error('Error applying structure:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'select-entries':
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Upload className="w-16 h-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Let's Get Started</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-md">
              To help you find the perfect knowledge structure, I'll need to analyze a few of your
              journal entries.
            </p>

            <div className="space-y-4">
              <button
                onClick={handleSelectFolder}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                  transition-colors flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Select Journal Folder
              </button>

              <div className="text-center">
                <span className="text-gray-500 dark:text-gray-400">or</span>
              </div>

              <label
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 
                dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 
                transition-colors cursor-pointer flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Sample Files
                <input
                  type="file"
                  multiple
                  accept=".md,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Selected {selectedFiles.length} files
                </p>
                <button
                  onClick={startAnalysis}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg 
                    hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  Start Analysis
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        );

      case 'analyze':
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <MessageSquare className="w-16 h-16 text-purple-600 dark:text-purple-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Analyzing Your Journals</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-md">
              I'm reading through your entries to understand your journaling style and needs.
            </p>

            <div className="space-y-4 w-full max-w-md">
              {sampleEntries.slice(0, 3).map((entry, index) => (
                <div key={index} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{entry}</p>
                </div>
              ))}
              {sampleEntries.length > 3 && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  and {sampleEntries.length - 3} more entries...
                </p>
              )}
            </div>

            <button
              onClick={startAnalysis}
              className="mt-8 px-6 py-3 bg-purple-600 text-white rounded-lg 
                hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Start Conversation
            </button>
          </div>
        );

      case 'adaptive-discovery':
        // Create journal samples from sampleEntries (which contains the actual content)
        const journalSamples = sampleEntries.slice(0, 20).map((content, idx) => ({
          filename: sampleFilenames[idx] || selectedFiles[idx]?.name || `journal-${idx + 1}.md`,
          content: content,
        }));
        
        console.log('Journal samples being sent to AdaptiveDiscoveryFlow:', journalSamples.length, 'samples');
        console.log('First sample:', journalSamples[0]);
        
        return (
          <AdaptiveDiscoveryFlow
            journalSamples={journalSamples}
            onStructureDiscovered={(structure) => {
              // Convert discovered structure to apply format
              applyDiscoveredStructure(structure);
            }}
            onBack={() => setCurrentStep('select-entries')}
          />
        );

      case 'chat':
        return (
          <StructureDiscoveryChat
            sampleEntries={sampleEntries}
            onStructureSelected={handleStructureSelected}
            onClose={onClose}
          />
        );

      case 'preview':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-8">
              <div className="max-w-3xl mx-auto">
                <Sparkles className="w-12 h-12 text-purple-600 dark:text-purple-400 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">{structureDetails?.name} Structure</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  {structureDetails?.description}
                </p>

                <div className="space-y-8">
                  {/* Entity Types */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Entity Types</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {structureDetails?.entity_types.map((type) => (
                        <div
                          key={type.name}
                          className="p-4 bg-white dark:bg-gray-800 rounded-lg border 
                            border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            <h4 className="font-medium">{type.name}</h4>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {type.description}
                          </p>
                          {type.suggested_properties.length > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              Properties: {type.suggested_properties.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Relationships */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Relationships</h3>
                    <div className="space-y-3">
                      {structureDetails?.relationships.map((rel) => (
                        <div key={rel.name} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{rel.source_types.join(', ')}</span>
                            <span className="text-gray-500">→</span>
                            <span className="text-purple-600 dark:text-purple-400 font-medium">
                              {rel.name}
                            </span>
                            <span className="text-gray-500">→</span>
                            <span className="font-medium">{rel.target_types.join(', ')}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {rel.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t dark:border-gray-700 px-8 py-4 bg-white dark:bg-gray-800">
              <div className="flex justify-between items-center max-w-3xl mx-auto">
                <button
                  onClick={() => setCurrentStep('chat')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 
                    hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  ← Back to Chat
                </button>
                <button
                  onClick={applyStructure}
                  disabled={isLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg 
                    hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed 
                    transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Apply This Structure
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">You're All Set!</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-md">
              Your knowledge structure has been applied. You can now start importing your journal
              entries and watch your knowledge graph come to life.
            </p>
            <button
              onClick={onComplete}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg 
                hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Start Using JournalGraph
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Progress indicator */}
        <div className="px-8 py-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold">Welcome to JournalGraph</h1>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
          <div className="flex items-center gap-2">
            {(['select-entries', 'analyze', 'chat', 'preview', 'complete'] as Step[]).map(
              (step, index) => (
                <React.Fragment key={step}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${
                      currentStep === step
                        ? 'bg-blue-600 text-white'
                        : index <
                            ['select-entries', 'analyze', 'chat', 'preview', 'complete'].indexOf(
                              currentStep
                            )
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < 4 && (
                    <div
                      className={`flex-1 h-1 ${
                        index <
                        ['select-entries', 'analyze', 'chat', 'preview', 'complete'].indexOf(
                          currentStep
                        )
                          ? 'bg-green-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </React.Fragment>
              )
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">{renderStep()}</div>
      </div>
    </div>
  );
};
