import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Backend communication
  sendToBackend: (channel: string, data: unknown) => {
    const validChannels = ['journal:import', 'schema:get', 'query:search'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
  },

  // File system operations
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  listFiles: (path: string, pattern: string) =>
    ipcRenderer.invoke('fs:list-files', { path, pattern }),

  // Event listeners
  onProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('import:progress', (_, progress) => callback(progress));
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Type definitions for TypeScript
export interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  getAppVersion: () => Promise<string>;
  sendToBackend: (channel: string, data: unknown) => Promise<unknown>;
  readFile: (path: string) => Promise<string>;
  listFiles: (path: string, pattern: string) => Promise<string[]>;
  onProgress: (callback: (progress: number) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
