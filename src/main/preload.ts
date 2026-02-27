import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../shared/ipc';

const api: RendererApi = {
  getSession: () => ipcRenderer.invoke(IPC_CHANNEL.GET_SESSION),
  login: (input) => ipcRenderer.invoke(IPC_CHANNEL.LOGIN, input),
  logout: () => ipcRenderer.invoke(IPC_CHANNEL.LOGOUT),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNEL.GET_SETTINGS),
  setDbPath: (dbPath) => ipcRenderer.invoke(IPC_CHANNEL.SET_DB_PATH, dbPath),
  openEinsatz: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.OPEN_EINSATZ, einsatzId),
  openEinsatzByPath: (dbPath) => ipcRenderer.invoke(IPC_CHANNEL.OPEN_EINSATZ_BY_PATH, dbPath),
  openEinsatzWithDialog: () => ipcRenderer.invoke(IPC_CHANNEL.OPEN_EINSATZ_DIALOG),
  consumePendingOpenFilePath: () => ipcRenderer.invoke(IPC_CHANNEL.CONSUME_PENDING_OPEN_FILE),
  listEinsaetze: () => ipcRenderer.invoke(IPC_CHANNEL.LIST_EINSAETZE),
  createEinsatz: (input) => ipcRenderer.invoke(IPC_CHANNEL.CREATE_EINSATZ, input),
  createEinsatzWithDialog: (input) => ipcRenderer.invoke(IPC_CHANNEL.CREATE_EINSATZ_DIALOG, input),
  archiveEinsatz: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.ARCHIVE_EINSATZ, einsatzId),
  listAbschnitte: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.LIST_ABSCHNITTE, einsatzId),
  createAbschnitt: (input) => ipcRenderer.invoke(IPC_CHANNEL.CREATE_ABSCHNITT, input),
  updateAbschnitt: (input) => ipcRenderer.invoke(IPC_CHANNEL.UPDATE_ABSCHNITT, input),
  listAbschnittDetails: (einsatzId, abschnittId) =>
    ipcRenderer.invoke(IPC_CHANNEL.LIST_ABSCHNITT_DETAILS, einsatzId, abschnittId),
  createEinheit: (input) => ipcRenderer.invoke(IPC_CHANNEL.CREATE_EINHEIT, input),
  updateEinheit: (input) => ipcRenderer.invoke(IPC_CHANNEL.UPDATE_EINHEIT, input),
  createFahrzeug: (input) => ipcRenderer.invoke(IPC_CHANNEL.CREATE_FAHRZEUG, input),
  updateFahrzeug: (input) => ipcRenderer.invoke(IPC_CHANNEL.UPDATE_FAHRZEUG, input),
  listEinheitHelfer: (einheitId) => ipcRenderer.invoke(IPC_CHANNEL.LIST_EINHEIT_HELFER, einheitId),
  createEinheitHelfer: (input) => ipcRenderer.invoke(IPC_CHANNEL.CREATE_EINHEIT_HELFER, input),
  updateEinheitHelfer: (input) => ipcRenderer.invoke(IPC_CHANNEL.UPDATE_EINHEIT_HELFER, input),
  deleteEinheitHelfer: (input) => ipcRenderer.invoke(IPC_CHANNEL.DELETE_EINHEIT_HELFER, input),
  moveEinheit: (input) => ipcRenderer.invoke(IPC_CHANNEL.MOVE_EINHEIT, input),
  moveFahrzeug: (input) => ipcRenderer.invoke(IPC_CHANNEL.MOVE_FAHRZEUG, input),
  splitEinheit: (input) => ipcRenderer.invoke(IPC_CHANNEL.SPLIT_EINHEIT, input),
  undoLastCommand: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.UNDO_LAST, einsatzId),
  hasUndoableCommand: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.HAS_UNDO, einsatzId),
  exportEinsatzakte: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.EXPORT_EINSATZAKTE, einsatzId),
  restoreBackup: (einsatzId) => ipcRenderer.invoke(IPC_CHANNEL.RESTORE_BACKUP, einsatzId),
  listActiveClients: () => ipcRenderer.invoke(IPC_CHANNEL.LIST_ACTIVE_CLIENTS),
  getUpdaterState: () => ipcRenderer.invoke(IPC_CHANNEL.GET_UPDATER_STATE),
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNEL.CHECK_UPDATES),
  downloadUpdate: () => ipcRenderer.invoke(IPC_CHANNEL.DOWNLOAD_UPDATE),
  installDownloadedUpdate: () => ipcRenderer.invoke(IPC_CHANNEL.INSTALL_UPDATE),
  openExternalUrl: (url) => ipcRenderer.invoke(IPC_CHANNEL.OPEN_EXTERNAL_URL, url),
  getTacticalFormationSvg: (input) =>
    ipcRenderer.invoke(IPC_CHANNEL.GET_TACTICAL_FORMATION_SVG, input),
  getTacticalVehicleSvg: (input) =>
    ipcRenderer.invoke(IPC_CHANNEL.GET_TACTICAL_VEHICLE_SVG, input),
  getTacticalPersonSvg: (input) =>
    ipcRenderer.invoke(IPC_CHANNEL.GET_TACTICAL_PERSON_SVG, input),
  openStrengthDisplayWindow: () => ipcRenderer.invoke(IPC_CHANNEL.OPEN_STRENGTH_DISPLAY_WINDOW),
  closeStrengthDisplayWindow: () => ipcRenderer.invoke(IPC_CHANNEL.CLOSE_STRENGTH_DISPLAY_WINDOW),
  getStrengthDisplayState: () => ipcRenderer.invoke(IPC_CHANNEL.GET_STRENGTH_DISPLAY_STATE),
  setStrengthDisplayState: (input) => ipcRenderer.invoke(IPC_CHANNEL.SET_STRENGTH_DISPLAY_STATE, input),
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('updaterEvents', {
  onStateChanged: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on(IPC_CHANNEL.UPDATER_STATE_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNEL.UPDATER_STATE_CHANGED, listener);
  },
});

contextBridge.exposeInMainWorld('strengthDisplayEvents', {
  onStateChanged: (callback: (state: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown) => callback(state);
    ipcRenderer.on(IPC_CHANNEL.STRENGTH_DISPLAY_STATE_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNEL.STRENGTH_DISPLAY_STATE_CHANGED, listener);
  },
});

contextBridge.exposeInMainWorld('appEvents', {
  onPendingOpenFile: (callback: (dbPath: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, dbPath: string) => callback(dbPath);
    ipcRenderer.on(IPC_CHANNEL.PENDING_OPEN_FILE, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNEL.PENDING_OPEN_FILE, listener);
  },
});
