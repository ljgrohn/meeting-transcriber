import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // API Keys
  getApiKeys: () => ipcRenderer.invoke('get-api-keys'),

  // File operations
  saveTranscript: (data: { filename: string; content: string }) =>
    ipcRenderer.invoke('save-transcript', data),
  openTranscript: () => ipcRenderer.invoke('open-transcript'),

  // Menu events
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-new-recording', () => callback('new-recording'));
    ipcRenderer.on('menu-open-transcript', () => callback('open-transcript'));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// TypeScript types for the API
export interface IElectronAPI {
  getApiKeys: () => Promise<{
    assemblyai: string;
    openai: string;
  }>;
  saveTranscript: (data: { filename: string; content: string }) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
    cancelled?: boolean;
  }>;
  openTranscript: () => Promise<{
    success: boolean;
    content?: string;
    error?: string;
    cancelled?: boolean;
  }>;
  onMenuAction: (callback: (action: string) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}