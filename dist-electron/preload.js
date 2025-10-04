"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // API Keys
  getApiKeys: () => electron.ipcRenderer.invoke("get-api-keys"),
  // File operations
  saveTranscript: (data) => electron.ipcRenderer.invoke("save-transcript", data),
  openTranscript: () => electron.ipcRenderer.invoke("open-transcript"),
  // Menu events
  onMenuAction: (callback) => {
    electron.ipcRenderer.on("menu-new-recording", () => callback("new-recording"));
    electron.ipcRenderer.on("menu-open-transcript", () => callback("open-transcript"));
  },
  // Remove listeners
  removeAllListeners: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
});
