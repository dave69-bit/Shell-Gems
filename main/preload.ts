import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, payload?: unknown) => {
    const allowed = [
      'plugins:list',
      'plugins:functions',
      'plugins:params',
      'plugins:execute'
    ];
    if (!allowed.includes(channel)) throw new Error(`Blocked channel: ${channel}`);
    return ipcRenderer.invoke(channel, payload);
  }
});
