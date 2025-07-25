import { useState, useEffect } from 'react';
import {
  PersonalSchema,
  SchemaTemplate,
  EntityTypeDefinition,
  FieldDefinition,
} from '../../../shared/types/personalSchema';
import {
  getPersonalSchema,
  getSchemaTemplates,
  addEntityType,
  removeEntityType,
  applyTemplate,
} from '../api/personalSchema';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface SchemaBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SchemaBuilder({ isOpen, onClose }: SchemaBuilderProps) {
  const [schema, setSchema] = useState<PersonalSchema | null>(null);
  const [templates, setTemplates] = useState<SchemaTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom entity creation state
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityDescription, setNewEntityDescription] = useState('');
  const [newEntityColor, setNewEntityColor] = useState('#3B82F6');
  const [newEntityIcon, setNewEntityIcon] = useState('');
  const [newEntityHints, setNewEntityHints] = useState('');
  const [newEntityFields, setNewEntityFields] = useState<FieldDefinition[]>([
    { name: '', field_type: 'string', required: true },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [schemaData, templatesData] = await Promise.all([
        getPersonalSchema(),
        getSchemaTemplates(),
      ]);
      setSchema(schemaData);
      setTemplates(templatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    setError(null);
    try {
      const result = await applyTemplate(selectedTemplate);
      setSchema(result.schema);
      setSelectedTemplate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEntityType = async (entityName: string) => {
    if (!confirm(`Are you sure you want to remove the entity type "${entityName}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await removeEntityType(entityName);
      setSchema(result.schema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove entity type');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setNewEntityFields([...newEntityFields, { name: '', field_type: 'string', required: true }]);
  };

  const handleRemoveField = (index: number) => {
    setNewEntityFields(newEntityFields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: Partial<FieldDefinition>) => {
    const updated = [...newEntityFields];
    updated[index] = { ...updated[index], ...field };
    setNewEntityFields(updated);
  };

  const handleCreateCustomEntity = async () => {
    if (!newEntityName.trim()) {
      setError('Entity name is required');
      return;
    }

    const validFields = newEntityFields.filter((f) => f.name.trim());
    if (validFields.length === 0) {
      setError('At least one field is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const entityType: EntityTypeDefinition = {
        name: newEntityName,
        description: newEntityDescription || undefined,
        fields: validFields,
        color: newEntityColor || undefined,
        icon: newEntityIcon || undefined,
        extraction_hints: newEntityHints || undefined,
      };

      const result = await addEntityType(entityType);
      setSchema(result.schema);

      // Reset form
      setIsCreatingCustom(false);
      setNewEntityName('');
      setNewEntityDescription('');
      setNewEntityColor('#3B82F6');
      setNewEntityIcon('');
      setNewEntityHints('');
      setNewEntityFields([{ name: '', field_type: 'string', required: true }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entity type');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Personal Schema Builder</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading...</p>
          </div>
        ) : (
          <>
            {/* Current Entity Types */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Your Entity Types</h3>
              {schema && Object.keys(schema.entity_types).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(schema.entity_types).map(([name, entityType]) => (
                    <div key={name} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4
                            className="font-semibold text-white"
                            style={{ color: entityType.color || '#ffffff' }}
                          >
                            {name}
                          </h4>
                          {entityType.description && (
                            <p className="text-sm text-gray-400">{entityType.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveEntityType(name)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {entityType.fields.map((field) => (
                          <div key={field.name} className="text-sm">
                            <span className="text-gray-300">{field.name}</span>
                            <span className="text-gray-500 ml-2">
                              ({field.field_type}){field.required ? '' : ' - optional'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No custom entity types yet. Add one below!</p>
              )}
            </div>

            {/* Apply Template Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Apply a Template</h3>
              <div className="flex gap-4">
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="flex-1 bg-gray-700 text-white rounded px-3 py-2"
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleApplyTemplate}
                  disabled={!selectedTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Template
                </button>
              </div>
            </div>

            {/* Create Custom Entity Type */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Create Custom Entity Type</h3>
                {!isCreatingCustom && (
                  <button
                    onClick={() => setIsCreatingCustom(true)}
                    className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    <PlusIcon className="h-4 w-4" />
                    New Entity Type
                  </button>
                )}
              </div>

              {isCreatingCustom && (
                <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Entity Name
                    </label>
                    <input
                      type="text"
                      value={newEntityName}
                      onChange={(e) => setNewEntityName(e.target.value)}
                      placeholder="e.g., Goal, Challenge, Decision"
                      className="w-full bg-gray-600 text-white rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={newEntityDescription}
                      onChange={(e) => setNewEntityDescription(e.target.value)}
                      placeholder="What does this entity represent?"
                      className="w-full bg-gray-600 text-white rounded px-3 py-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                      <input
                        type="color"
                        value={newEntityColor}
                        onChange={(e) => setNewEntityColor(e.target.value)}
                        className="w-full h-10 bg-gray-600 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Icon (optional)
                      </label>
                      <input
                        type="text"
                        value={newEntityIcon}
                        onChange={(e) => setNewEntityIcon(e.target.value)}
                        placeholder="Icon identifier"
                        className="w-full bg-gray-600 text-white rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Extraction Hints
                    </label>
                    <textarea
                      value={newEntityHints}
                      onChange={(e) => setNewEntityHints(e.target.value)}
                      placeholder="Help the AI understand what to look for (e.g., 'Look for goal statements, objectives, aspirations')"
                      className="w-full bg-gray-600 text-white rounded px-3 py-2 h-20"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-300">Fields</label>
                      <button
                        onClick={handleAddField}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        + Add Field
                      </button>
                    </div>
                    <div className="space-y-2">
                      {newEntityFields.map((field, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => handleFieldChange(index, { name: e.target.value })}
                            placeholder="Field name"
                            className="flex-1 bg-gray-600 text-white rounded px-2 py-1 text-sm"
                          />
                          <select
                            value={field.field_type}
                            onChange={(e) =>
                              handleFieldChange(index, {
                                field_type: e.target.value as FieldDefinition['field_type'],
                              })
                            }
                            className="bg-gray-600 text-white rounded px-2 py-1 text-sm"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="list">List</option>
                            <option value="reference">Reference</option>
                          </select>
                          <label className="flex items-center text-sm text-gray-300">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) =>
                                handleFieldChange(index, { required: e.target.checked })
                              }
                              className="mr-1"
                            />
                            Required
                          </label>
                          {newEntityFields.length > 1 && (
                            <button
                              onClick={() => handleRemoveField(index)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => {
                        setIsCreatingCustom(false);
                        setNewEntityName('');
                        setNewEntityDescription('');
                        setNewEntityFields([{ name: '', field_type: 'string', required: true }]);
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateCustomEntity}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Create Entity Type
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
