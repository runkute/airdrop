import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openDownloads: () => ipcRenderer.invoke('open-downloads'),
  platform: process.platform,
  isElectron: true,
})
