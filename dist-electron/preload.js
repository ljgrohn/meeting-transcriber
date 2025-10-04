"use strict";
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  // API Keys
  getApiKeys: () => ipcRenderer.invoke("get-api-keys"),
  // File operations
  saveTranscript: (data) => ipcRenderer.invoke("save-transcript", data),
  openTranscript: () => ipcRenderer.invoke("open-transcript"),
  saveRecording: (data) => ipcRenderer.invoke("save-recording", data),
  // Desktop capture
  getDesktopSources: () => ipcRenderer.invoke("get-desktop-sources"),
  getDesktopStream: async (sourceId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: sourceId
          }
        },
        video: false
      });
      return stream;
    } catch (error) {
      console.error("Error getting desktop stream:", error);
      throw error;
    }
  },
  // App paths
  getAppPath: (type) => ipcRenderer.invoke("get-app-path", type),
  // Menu events
  onMenuAction: (callback) => {
    ipcRenderer.on("menu-new-recording", () => callback("new-recording"));
    ipcRenderer.on("menu-open-transcript", () => callback("open-transcript"));
  },
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
