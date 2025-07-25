import { useState, useEffect } from 'react';
import { FolderIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { SchemaBuilder } from '../components/SchemaBuilder';
import { getSettings, updateSettings } from '../utils/settings';
import { adminApi } from '../api/admin';

export function Settings() {
  const [vaultPath, setVaultPath] = useState('');
  const [isSchemaBuilderOpen, setIsSchemaBuilderOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const settings = getSettings();
    setVaultPath(settings.vaultPath || '');
  }, []);

  const handleSelectVault = async () => {
    try {
      const result = await window.electronAPI.selectFolder();
      if (result) {
        setVaultPath(result);
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const settings = getSettings();
      updateSettings({
        ...settings,
        vaultPath,
      });

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Failed to save settings');
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAllData = async () => {
    setIsResetting(true);
    try {
      // Clear all data
      await adminApi.resetAllData();

      // Clear local storage
      localStorage.clear();

      // Reload the app to trigger onboarding
      window.location.reload();
    } catch (error) {
      console.error('Failed to reset data:', error);
      setSaveMessage('Failed to reset data');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {/* Vault Settings */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Obsidian Vault</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Vault Path</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={vaultPath}
                  onChange={(e) => setVaultPath(e.target.value)}
                  placeholder="Select your Obsidian vault folder..."
                  className="flex-1 bg-gray-700 text-white rounded px-3 py-2"
                  readOnly
                />
                <button
                  onClick={handleSelectVault}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <FolderIcon className="h-4 w-4" />
                  Browse
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                This is where your Obsidian journal files are stored
              </p>
            </div>
          </div>
        </div>

        {/* Personal Schema Settings */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Personal Knowledge Schema</h2>

          <p className="text-gray-300 mb-4">
            Customize what types of information JournalGraph extracts from your journal entries.
            Define entity types that matter to you - like goals, moods, insights, or habits.
          </p>

          <button
            onClick={() => setIsSchemaBuilderOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
          >
            <SparklesIcon className="h-4 w-4" />
            Open Schema Builder
          </button>
        </div>

        {/* Reset Data Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-red-900/20">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Danger Zone</h2>

          <p className="text-gray-300 mb-4">
            Reset all data and start fresh. This will delete all your imported journal entries,
            knowledge graph data, and personal schema configuration. You'll go through the initial
            setup process again.
          </p>

          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
              Reset All Data
            </button>
          ) : (
            <div className="bg-red-900/20 rounded p-4 border border-red-900/40">
              <p className="text-red-300 mb-4 font-semibold">
                Are you absolutely sure? This action cannot be undone!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleResetAllData}
                  disabled={isResetting}
                  className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
                >
                  {isResetting ? 'Resetting...' : 'Yes, Reset Everything'}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end items-center gap-4">
          {saveMessage && (
            <span
              className={`text-sm ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}
            >
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Schema Builder Modal */}
      <SchemaBuilder isOpen={isSchemaBuilderOpen} onClose={() => setIsSchemaBuilderOpen(false)} />
    </div>
  );
}
