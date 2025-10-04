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
      // Note: System audio capture has limitations on Windows
      // This requires the source to have audio and may not work for all windows
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        } as any,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            maxWidth: 1,
            maxHeight: 1
          }
        } as any
      });

      // Remove video track, keep only audio
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        stream.removeTrack(track);
        track.stop();
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio available from this source. Note: System audio capture is limited on Windows.');
      }

      return stream;
    } catch (error: any) {
      console.error('Error getting desktop stream:', error);
      if (error.name === 'NotAllowedError') {
        throw new Error('Screen recording permission denied.');
      } else if (error.message.includes('audio')) {
        throw new Error('System audio capture is not available for this source on Windows. Try using microphone recording instead.');
      }
      throw new Error('Failed to capture audio from this source. System audio has limitations on Windows.');
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