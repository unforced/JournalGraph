// Settings management utilities

interface AppSettings {
  vaultPath?: string;
  lastImportDate?: string;
  autoImportEnabled?: boolean;
  autoImportTime?: string; // Time in HH:MM format, default "04:00"
  onboardingCompleted?: boolean;
}

const SETTINGS_KEY = 'journalgraph_settings';

export function getSettings(): AppSettings {
  const stored = localStorage.getItem(SETTINGS_KEY);
  if (!stored) {
    return {
      autoImportEnabled: true,
      autoImportTime: '04:00',
    };
  }
  return JSON.parse(stored);
}

export function updateSettings(updates: Partial<AppSettings>) {
  const current = getSettings();
  const updated = { ...current, ...updates };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

export function shouldCheckForImports(): boolean {
  const settings = getSettings();

  // If auto-import is disabled, return false
  if (!settings.autoImportEnabled) {
    return false;
  }

  // If no vault path is set, return false
  if (!settings.vaultPath) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();

  // Parse the auto-import time (default 4 AM)
  const [importHour] = (settings.autoImportTime || '04:00').split(':').map(Number);

  // Check if it's after the import time
  if (currentHour < importHour) {
    return false;
  }

  // Check if we've already imported today
  const lastImport = settings.lastImportDate;
  const today = now.toISOString().split('T')[0];

  if (lastImport === today) {
    return false;
  }

  return true;
}
