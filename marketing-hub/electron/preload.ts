import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openDownloads: () => ipcRenderer.invoke('open-downloads'),
  encryptString: (value: string): Promise<string> => ipcRenderer.invoke('encrypt-string', value),
  decryptString: (encoded: string): Promise<string> => ipcRenderer.invoke('decrypt-string', encoded),
  platform: process.platform,
  isElectron: true,
})
