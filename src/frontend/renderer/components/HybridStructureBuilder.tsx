import React, { useState, useEffect } from 'react';
import { Check, Plus, X, Shapes } from 'lucide-react';
import { structureDiscoveryApi } from '../api/structureDiscovery';

interface HybridStructureBuilderProps {
  onComplete: (hybridConfig: any) => void;
  onBack: () => void;
}

interface StructureTemplate {
  id: string;
  name: string;
  description: string;
  entity_types: Array<{
    name: string;
    description: string;
    color: string;
    icon: string;
  }>;
  relationships: Array<{
    name: string;
    source_types: string[];
    target_types: string[];
  }>;
}

export const HybridStructureBuilder: React.FC<HybridStructureBuilderProps> = ({
  onComplete,
  onBack,
}) => {
  const [availableStructures, setAvailableStructures] = useState<StructureTemplate[]>([]);
  const [selectedStructures, setSelectedStructures] = useState<
    Map<
      string,
      {
        structure: StructureTemplate;
        selectedEntities: Set<string>;
        selectedRelationships: Set<string>;
      }
    >
  >(new Map());
  const [customEntities, setCustomEntities] = useState<
    Array<{
      name: string;
      description: string;
      color: string;
      icon: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStructures();
  }, []);

  const loadStructures = async () => {
    try {
      const response = await structureDiscoveryApi.getAvailableStructures();
      const structures = await Promise.all(
        response.structures.map(async (s: any) => {
          const details = await structureDiscoveryApi.getStructureDetails(s.id);
          return details;
        })
      );
      setAvailableStructures(structures);
    } catch (error) {
      console.error('Error loading structures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStructure = (structure: StructureTemplate) => {
    const newSelection = new Map(selectedStructures);

    if (newSelection.has(structure.id)) {
      newSelection.delete(structure.id);
    } else {
      newSelection.set(structure.id, {
        structure,
        selectedEntities: new Set(structure.entity_types.map((e) => e.name)),
        selectedRelationships: new Set(structure.relationships.map((r) => r.name)),
      });
    }

    setSelectedStructures(newSelection);
  };

  const toggleEntity = (structureId: string, entityName: string) => {
    const newSelection = new Map(selectedStructures);
    const selection = newSelection.get(structureId);
    if (selection) {
      if (selection.selectedEntities.has(entityName)) {
        selection.selectedEntities.delete(entityName);
      } else {
        selection.selectedEntities.add(entityName);
      }
      setSelectedStructures(newSelection);
    }
  };

  const addCustomEntity = () => {
    setCustomEntities([
      ...customEntities,
      {
        name: '',
        description: '',
        color: '#6366f1',
        icon: 'cube',
      },
    ]);
  };

  const updateCustomEntity = (index: number, field: string, value: string) => {
    const updated = [...customEntities];
    updated[index] = { ...updated[index], [field]: value };
    setCustomEntities(updated);
  };

  const removeCustomEntity = (index: number) => {
    setCustomEntities(customEntities.filter((_, i) => i !== index));
  };

  const buildHybridStructure = () => {
    const hybridConfig = {
      selected_structures: Array.from(selectedStructures.entries()).map(([id, selection]) => ({
        structure_id: id,
        selected_entities: Array.from(selection.selectedEntities),
        selected_relationships: Array.from(selection.selectedRelationships),
      })),
      custom_entities: customEntities.filter((e) => e.name.trim() !== ''),
      custom_relationships: [],
    };

    onComplete(hybridConfig);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading structures...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-2">Build Your Hybrid Structure</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select elements from multiple structures to create your personalized knowledge system
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Available Structures */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">Select Base Structures</h3>
          <div className="space-y-3">
            {availableStructures.map((structure) => (
              <div
                key={structure.id}
                className={`border rounded-lg p-4 transition-all ${
                  selectedStructures.has(structure.id)
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium">{structure.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {structure.description}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleStructure(structure)}
                    className={`ml-4 w-6 h-6 rounded border-2 flex items-center justify-center ${
                      selectedStructures.has(structure.id)
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {selectedStructures.has(structure.id) && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>

                {selectedStructures.has(structure.id) && (
                  <div className="mt-4 space-y-3">
                    {/* Entity Types */}
                    <div>
                      <h5 className="text-sm font-medium mb-2">Entity Types</h5>
                      <div className="flex flex-wrap gap-2">
                        {structure.entity_types.map((entity) => {
                          const selection = selectedStructures.get(structure.id);
                          const isSelected = selection?.selectedEntities.has(entity.name);

                          return (
                            <button
                              key={entity.name}
                              onClick={() => toggleEntity(structure.id, entity.name)}
                              className={`px-3 py-1 rounded-full text-sm transition-all ${
                                isSelected
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <span
                                className="inline-block w-2 h-2 rounded-full mr-1.5"
                                style={{ backgroundColor: entity.color }}
                              />
                              {entity.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Entities */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Custom Entity Types</h3>
            <button
              onClick={addCustomEntity}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm 
                hover:bg-purple-700 transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Custom
            </button>
          </div>

          <div className="space-y-3">
            {customEntities.map((entity, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      placeholder="Entity name (e.g., Book, Habit, Skill)"
                      value={entity.name}
                      onChange={(e) => updateCustomEntity(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border 
                        border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={entity.description}
                      onChange={(e) => updateCustomEntity(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border 
                        border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-600 dark:text-gray-400">Color:</label>
                      <input
                        type="color"
                        value={entity.color}
                        onChange={(e) => updateCustomEntity(index, 'color', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeCustomEntity(index)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 
            hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={buildHybridStructure}
          disabled={
            selectedStructures.size === 0 && customEntities.filter((e) => e.name).length === 0
          }
          className="px-6 py-3 bg-purple-600 text-white rounded-lg 
            hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed 
            transition-colors flex items-center gap-2"
        >
          <Shapes className="w-5 h-5" />
          Create Hybrid Structure
        </button>
      </div>
    </div>
  );
};
