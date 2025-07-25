import { useState, useEffect } from 'react';
import { Brain, Sparkles, ArrowRight, Check, Edit2, Plus, X } from 'lucide-react';
import { structureDiscoveryApi } from '../api/structureDiscovery';

interface AdaptiveDiscoveryFlowProps {
  journalSamples: Array<{ filename: string; content: string }>;
  onStructureDiscovered: (structure: any) => void;
  onBack: () => void;
}

interface DiscoveredStructure {
  name: string;
  description: string;
  entity_types: Record<string, any>;
  relationship_types: Record<string, any>;
  unique_features: Array<any>;
  recommendations: string[];
}

export function AdaptiveDiscoveryFlow({
  journalSamples,
  onStructureDiscovered,
  onBack,
}: AdaptiveDiscoveryFlowProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [discoveredStructure, setDiscoveredStructure] = useState<DiscoveredStructure | null>(null);
  const [analysisDetails, setAnalysisDetails] = useState<any>(null);
  const [editingStructure, setEditingStructure] = useState(false);
  const [customizations, setCustomizations] = useState<any>({});

  useEffect(() => {
    // Start analysis automatically when component mounts
    if (journalSamples && journalSamples.length > 0) {
      analyzeJournals();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const analyzeJournals = async () => {
    console.log('Starting analysis with samples:', journalSamples);
    console.log('Number of samples:', journalSamples?.length || 0);
    console.log('Sample content lengths:', journalSamples?.map(s => s.content?.length || 0));
    
    if (!journalSamples || journalSamples.length === 0) {
      console.error('No journal samples provided');
      setIsAnalyzing(false);
      setDiscoveredStructure({
        name: 'No Data',
        description: 'No journal entries were provided for analysis.',
        entity_types: {},
        relationship_types: {},
        unique_features: [],
        recommendations: ['Please select a folder with journal entries', 'Ensure the folder contains .md files with date patterns']
      });
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const journalContents = journalSamples.map(s => s.content).filter(content => content && content.length > 0);
      console.log('Filtered journal contents:', journalContents.length);
      console.log('First content sample:', journalContents[0]?.substring(0, 200));
      
      if (journalContents.length === 0) {
        console.error('All journal samples have empty content');
        setDiscoveredStructure({
          name: 'Empty Content',
          description: 'The selected journal files appear to be empty.',
          entity_types: {},
          relationship_types: {},
          unique_features: [],
          recommendations: ['Please select journal files with actual content', 'Check that the files are not empty']
        });
        setIsAnalyzing(false);
        return;
      }
      
      const response = await structureDiscoveryApi.discoverAdaptiveStructure(journalContents);
      
      console.log('Discovery response:', response);
      
      if (!response.discovered_structure || Object.keys(response.discovered_structure.entity_types || {}).length === 0) {
        console.warn('No entities discovered in the structure');
        setDiscoveredStructure({
          name: 'Minimal Structure',
          description: 'Unable to detect specific patterns in your journals. You can still create custom entity types.',
          entity_types: {},
          relationship_types: {},
          unique_features: [],
          recommendations: ['Try adding more descriptive content', 'Use consistent naming for people, projects, or concepts', 'Consider using hashtags or special formatting']
        });
      } else {
        setDiscoveredStructure(response.discovered_structure);
        setAnalysisDetails(response.analysis_details);
        setCustomizations({
          entity_types: { ...response.discovered_structure.entity_types },
          relationship_types: { ...response.discovered_structure.relationship_types },
        });
      }
    } catch (error: any) {
      console.error('Error analyzing journals:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Show error state with more details
      setDiscoveredStructure({
        name: 'Error',
        description: `Failed to analyze journals: ${error.message || 'Unknown error'}`,
        entity_types: {},
        relationship_types: {},
        unique_features: [],
        recommendations: ['Check the console for more details', 'Ensure the backend is running', 'Try selecting different journal files']
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddEntityType = () => {
    const name = prompt('Enter entity type name:');
    if (name) {
      setCustomizations((prev: any) => ({
        ...prev,
        entity_types: {
          ...prev.entity_types,
          [name.toLowerCase().replace(/\s+/g, '_')]: {
            name: name,
            description: 'Custom entity type',
            color: '#95A5A6',
            icon: 'Circle',
            examples: [],
          },
        },
      }));
    }
  };

  const handleRemoveEntityType = (typeKey: string) => {
    setCustomizations((prev: any) => {
      const newTypes = { ...prev.entity_types };
      delete newTypes[typeKey];
      return { ...prev, entity_types: newTypes };
    });
  };

  const handleSaveStructure = () => {
    onStructureDiscovered({
      ...discoveredStructure,
      ...customizations,
    });
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Brain className="w-16 h-16 text-blue-600 animate-pulse" />
        <h3 className="text-lg font-semibold">Analyzing Your Journals...</h3>
        <p className="text-sm text-gray-600 text-center max-w-md">
          I'm discovering the unique patterns in your writing to create a personalized knowledge structure just for you.
        </p>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4 animate-spin" />
          <span>Reading {journalSamples.length} journal entries</span>
        </div>
      </div>
    );
  }

  if (!discoveredStructure && !isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Brain className="w-16 h-16 text-gray-400" />
        <h3 className="text-lg font-semibold">No Structure Discovered</h3>
        <p className="text-sm text-gray-600 text-center max-w-md">
          {journalSamples.length === 0 
            ? "No journal entries were provided for analysis." 
            : "Unable to analyze the provided entries. Please try again."}
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!discoveredStructure) {
    return null; // Still analyzing
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Your Personal Knowledge Structure</h2>
        <p className="text-gray-600">{discoveredStructure.description}</p>
      </div>

      {/* Key Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
          <Sparkles className="w-4 h-4 mr-2" />
          What I Discovered
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          {analysisDetails?.unique_patterns?.map((pattern: any, idx: number) => (
            <div key={idx} className="flex items-start">
              <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{pattern.description}</span>
            </div>
          ))}
          {analysisDetails?.themes?.length > 0 && (
            <div className="flex items-start">
              <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Common themes: {analysisDetails.themes.slice(0, 3).join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Entity Types */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Entity Types Found</h3>
          <button
            onClick={() => setEditingStructure(!editingStructure)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <Edit2 className="w-4 h-4 mr-1" />
            {editingStructure ? 'Done Editing' : 'Customize'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(customizations.entity_types || {}).map(([key, type]: [string, any]) => (
            <div
              key={key}
              className="border rounded-lg p-3 relative group"
              style={{ borderColor: type.color }}
            >
              {editingStructure && (
                <button
                  onClick={() => handleRemoveEntityType(key)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              )}
              <div className="flex items-center mb-1">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: type.color }}
                />
                <span className="font-medium">{type.name}</span>
              </div>
              <p className="text-xs text-gray-600">{type.description}</p>
              {type.examples?.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Examples: {type.examples.slice(0, 2).join(', ')}
                </p>
              )}
            </div>
          ))}
          
          {editingStructure && (
            <button
              onClick={handleAddEntityType}
              className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-gray-400 transition-colors flex items-center justify-center"
            >
              <Plus className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Relationships */}
      {Object.keys(customizations.relationship_types || {}).length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Relationship Types</h3>
          <div className="space-y-2">
            {Object.entries(customizations.relationship_types || {}).map(([key, rel]: [string, any]) => (
              <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{key.replace(/_/g, ' ')}</span>
                  <span className="text-sm text-gray-600 ml-2">{rel.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {discoveredStructure.recommendations?.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 mb-2">Recommendations</h3>
          <ul className="space-y-1 text-sm text-purple-800">
            {discoveredStructure.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <ArrowRight className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inspiration Sources */}
      {analysisDetails?.inspiration_from && (
        <div className="text-sm text-gray-600">
          <p className="mb-2">Structure inspiration drawn from:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(analysisDetails.inspiration_from)
              .filter(([_, score]) => (score as number) > 0.2)
              .sort(([_, a], [__, b]) => (b as number) - (a as number))
              .map(([structure, score]) => (
                <span
                  key={structure}
                  className="px-2 py-1 bg-gray-100 rounded text-xs"
                >
                  {structure} ({Math.round((score as number) * 100)}%)
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
        >
          Back
        </button>
        <button
          onClick={handleSaveStructure}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          Use This Structure
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}