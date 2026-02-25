import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../shared/ipc';

const api: RendererApi = {
  getSession: () => ipcRenderer.invoke(IPC_CHANNEL.GET_SESSION),
  login: (input) => ipcRenderer.invoke(IPC_CHANNEL.LOGIN, input),
  logout: () => ipcRenderer.invoke(IPC_CHANNEL.LOGOUT),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNEL.GET_SETTINGS),
  setDbPath: (dbPath) => ipcRenderer.invoke(IPC_CHANNEL.SET_DB_PATH, dbPath),
  openEinsatz: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.OPEN_EINSATZ, einsatzId),
  listEinsaetze: () => ipcRenderer.invoke(IPC_CHANNEL.LIST_EINSAETZE),
  createEinsatz: (input) => ipcRenderer.invoke(IPC_CHANNEL.CREATE_EINSATZ, input),
  archiveEinsatz: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.ARCHIVE_EINSATZ, einsatzId),
  listAbschnitte: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.LIST_ABSCHNITTE, einsatzId),
  createAbschnitt: (input) => ipcRenderer.invoke(IPC_CHANNEL.CREATE_ABSCHNITT, input),
  listAbschnittDetails: (einsatzId, abschnittId) =>
    ipcRenderer.invoke(IPC_CHANNEL.LIST_ABSCHNITT_DETAILS, einsatzId, abschnittId),
  createEinheit: (input) => ipcRenderer.invoke(IPC_CHANNEL.CREATE_EINHEIT, input),
  createFahrzeug: (input) => ipcRenderer.invoke(IPC_CHANNEL.CREATE_FAHRZEUG, input),
  moveEinheit: (input) => ipcRenderer.invoke(IPC_CHANNEL.MOVE_EINHEIT, input),
  moveFahrzeug: (input) => ipcRenderer.invoke(IPC_CHANNEL.MOVE_FAHRZEUG, input),
  splitEinheit: (input) => ipcRenderer.invoke(IPC_CHANNEL.SPLIT_EINHEIT, input),
  undoLastCommand: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.UNDO_LAST, einsatzId),
  hasUndoableCommand: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.HAS_UNDO, einsatzId),
  exportEinsatzakte: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.EXPORT_EINSATZAKTE, einsatzId),
  restoreBackup: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.RESTORE_BACKUP, einsatzId),
  getUpdaterState: () => ipcRenderer.invoke(IPC_CHANNEL.GET_UPDATER_STATE),
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNEL.CHECK_UPDATES),
  downloadUpdate: () => ipcRenderer.invoke(IPC_CHANNEL.DOWNLOAD_UPDATE),
  installDownloadedUpdate: () => ipcRenderer.invoke(IPC_CHANNEL.INSTALL_UPDATE),
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('updaterEvents', {
  onStateChanged: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on(IPC_CHANNEL.UPDATER_STATE_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNEL.UPDATER_STATE_CHANGED, listener);
  },
});
