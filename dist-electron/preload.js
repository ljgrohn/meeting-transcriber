const { contextBridge, ipcRenderer } = require('electron');
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // API Keys
    getApiKeys: () => ipcRenderer.invoke('get-api-keys'),
    // File operations
    saveTranscript: (data) => ipcRenderer.invoke('save-transcript', data),
    openTranscript: () => ipcRenderer.invoke('open-transcript'),
    saveRecording: (data) => ipcRenderer.invoke('save-recording', data),
    // Desktop capture
    getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
    getDesktopStream: async (sourceId) => {
        try {
            // Note: System audio capture has limitations on Windows
            // This requires the source to have audio and may not work for all windows
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId
                    }
                },
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sourceId,
                        maxWidth: 1,
                        maxHeight: 1
                    }
                }
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
        }
        catch (error) {
            console.error('Error getting desktop stream:', error);
            if (error.name === 'NotAllowedError') {
                throw new Error('Screen recording permission denied.');
            }
            else if (error.message.includes('audio')) {
                throw new Error('System audio capture is not available for this source on Windows. Try using microphone recording instead.');
            }
            throw new Error('Failed to capture audio from this source. System audio has limitations on Windows.');
        }
    },
    // App paths
    getAppPath: (type) => ipcRenderer.invoke('get-app-path', type),
    // Menu events
    onMenuAction: (callback) => {
        ipcRenderer.on('menu-new-recording', () => callback('new-recording'));
        ipcRenderer.on('menu-open-transcript', () => callback('open-transcript'));
    },
    // Remove listeners
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
});
