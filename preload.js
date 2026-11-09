const { contextBridge, ipcRenderer } = require('electron');

// Las ventanitas no tienen Node: solo estas funciones concretas.
contextBridge.exposeInMainWorld('widgetName', {
  get: () => ipcRenderer.invoke('widget:get-name'),
  save: (value) => ipcRenderer.invoke('widget:set-name', String(value == null ? '' : value)),
  close: () => ipcRenderer.invoke('widget:close-editor')
});

contextBridge.exposeInMainWorld('widgetSettings', {
  get: () => ipcRenderer.invoke('widget:get-settings'),
  save: (patch) => ipcRenderer.invoke('widget:set-settings', patch || {}),
  close: () => ipcRenderer.invoke('widget:close-settings')
});
