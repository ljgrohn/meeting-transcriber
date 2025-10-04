const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // API Keys
  getApiKeys: () => ipcRenderer.invoke('get-api-keys'),

  // File operations
  saveTranscript: (data: { filename: string; content: string }) =>
    ipcRenderer.invoke('save-transcript', data),
  openTranscript: () => ipcRenderer.invoke('open-transcript'),
  saveRecording: (data: { filename: string; buffer: ArrayBuffer }) =>
    ipcRenderer.invoke('save-recording', data),

  // Desktop capture
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  getDesktopStream: async (sourceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        } as any,
        video: false
      });
      return stream;
    } catch (error) {
      console.error('Error getting desktop stream:', error);
      throw error;
    }
  },

  // App paths
  getAppPath: (type: string) => ipcRenderer.invoke('get-app-path', type),

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
interface IElectronAPI {
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
  saveRecording: (data: { filename: string; buffer: ArrayBuffer }) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
    cancelled?: boolean;
  }>;
  getDesktopSources: () => Promise<Array<{
    id: string;
    name: string;
    thumbnail: string;
  }>>;
  getDesktopStream: (sourceId: string) => Promise<MediaStream>;
  getAppPath: (type: string) => Promise<string>;
  onMenuAction: (callback: (action: string) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}