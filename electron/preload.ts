import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveApiKey: (key: string): Promise<void> => ipcRenderer.invoke('api-key:save', key),
  getApiKey: (): Promise<string> => ipcRenderer.invoke('api-key:get')
});
