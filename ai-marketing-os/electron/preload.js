const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  // App info
  getVersion: () => ipcRenderer.invoke("app:version"),
  getLogsPath: () => ipcRenderer.invoke("app:logs-path"),
  getDataPath: () => ipcRenderer.invoke("app:data-path"),
  getBackendUrl: () => ipcRenderer.invoke("app:backend-url"),

  // File system
  openLogs: () => ipcRenderer.invoke("app:open-logs"),
  openData: () => ipcRenderer.invoke("app:open-data"),

  // Config
  getConfig: () => ipcRenderer.invoke("config:get"),
  setConfig: (config) => ipcRenderer.invoke("config:set", config),

  // Events from main → renderer
  onBackendCrashed: (callback) => {
    ipcRenderer.on("backend-crashed", (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners("backend-crashed")
  },

  // Environment
  isDesktop: true,
  platform: process.platform,
})
