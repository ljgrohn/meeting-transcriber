"use strict";
const { app, BrowserWindow, ipcMain, dialog, Menu, desktopCapturer } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const dotenv = require("dotenv");
dotenv.config();
let mainWindow = null;
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    },
    titleBarStyle: "default",
    icon: process.platform === "win32" ? path.join(__dirname, "../build/icon.ico") : void 0
  });
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "New Recording",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow == null ? void 0 : mainWindow.webContents.send("menu-new-recording");
          }
        },
        {
          label: "Open Transcript",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            mainWindow == null ? void 0 : mainWindow.webContents.send("menu-open-transcript");
          }
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Meeting Transcriber",
              message: "Meeting Transcriber",
              detail: "A desktop application for transcribing and summarizing meetings.\n\nVersion: 1.0.0",
              buttons: ["OK"]
            });
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
ipcMain.handle("get-api-keys", async () => {
  return {
    assemblyai: process.env.ASSEMBLYAI_API_KEY || "",
    openai: process.env.OPENAI_API_KEY || ""
  };
});
ipcMain.handle("save-transcript", async (_, data) => {
  try {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: data.filename,
      filters: [
        { name: "JSON Files", extensions: ["json"] },
        { name: "Text Files", extensions: ["txt"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (filePath) {
      await fs.writeFile(filePath, data.content, "utf-8");
      return { success: true, path: filePath };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    console.error("Error saving transcript:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("open-transcript", async () => {
  try {
    const { filePaths } = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "JSON Files", extensions: ["json"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (filePaths && filePaths.length > 0) {
      const content = await fs.readFile(filePaths[0], "utf-8");
      return { success: true, content };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    console.error("Error opening transcript:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-desktop-sources", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window", "screen"],
      fetchWindowIcons: true
    });
    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error("Error getting desktop sources:", error);
    return [];
  }
});
ipcMain.handle("save-recording", async (_, data) => {
  try {
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: data.filename,
      filters: [
        { name: "WAV Files", extensions: ["wav"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (filePath) {
      const buffer = Buffer.from(data.buffer);
      await fs.writeFile(filePath, buffer);
      return { success: true, path: filePath };
    }
    return { success: false, cancelled: true };
  } catch (error) {
    console.error("Error saving recording:", error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-app-path", async (_, type) => {
  switch (type) {
    case "userData":
      return app.getPath("userData");
    case "temp":
      return app.getPath("temp");
    case "recordings":
      const recordingsPath = path.join(app.getPath("userData"), "recordings");
      await fs.mkdir(recordingsPath, { recursive: true });
      return recordingsPath;
    default:
      return app.getPath("userData");
  }
});
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
