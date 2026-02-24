import path from 'node:path';
import { dialog, ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import type { SessionUser } from '../../shared/types';
import type { DbContext } from '../db/connection';
import { openDatabaseWithRetry } from '../db/connection';
import { SettingsStore } from '../db/settings-store';
import { ensureDefaultAdmin, login } from '../services/auth';
import { moveEinheit, moveFahrzeug, undoLastCommand } from '../services/command';
import { toSafeError } from '../services/errors';
import {
  archiveEinsatz,
  createAbschnitt,
  createEinheit,
  createEinsatz,
  createFahrzeug,
  splitEinheit,
  hasUndoableCommand,
  listAbschnittDetails,
  listAbschnitte,
  listEinsaetze,
} from '../services/einsatz';
import { exportEinsatzakte } from '../services/export';

interface AppState {
  dbContext: DbContext;
  setDbContext: (ctx: DbContext) => void;
  settingsStore: SettingsStore;
  getDefaultDbPath: () => string;
  getSessionUser: () => SessionUser | null;
  setSessionUser: (user: SessionUser | null) => void;
}

export function registerIpc(state: AppState): void {
  const wrap = <T extends unknown[], R>(handler: (...args: T) => R | Promise<R>) => {
    return async (_event: Electron.IpcMainInvokeEvent, ...args: T): Promise<R> => {
      try {
        return await handler(...args);
      } catch (error) {
        throw toSafeError(error);
      }
    };
  };

  const requireUser = (): SessionUser => {
    const user = state.getSessionUser();
    if (!user) {
      throw new Error('Nicht angemeldet');
    }
    return user;
  };

  ipcMain.handle(IPC_CHANNEL.GET_SESSION, wrap(async () => state.getSessionUser()));

  ipcMain.handle(
    IPC_CHANNEL.LOGIN,
    wrap(async (input: Parameters<RendererApi['login']>[0]) => {
      const user = login(state.dbContext, input.name, input.passwort);
      state.setSessionUser(user);
      return user;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LOGOUT,
    wrap(async () => {
      state.setSessionUser(null);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_SETTINGS,
    wrap(async () => {
      const stored = state.settingsStore.get();
      return { dbPath: stored.dbPath ?? state.getDefaultDbPath() };
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.SET_DB_PATH,
    wrap(async (dbPath: string) => {
      const nextContext = openDatabaseWithRetry(dbPath);
      ensureDefaultAdmin(nextContext);
      state.setDbContext(nextContext);
      state.settingsStore.set({ dbPath });
      return { dbPath };
    }),
  );

  ipcMain.handle(IPC_CHANNEL.LIST_EINSAETZE, wrap(async () => listEinsaetze(state.dbContext)));

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINSATZ,
    wrap(async (input: Parameters<RendererApi['createEinsatz']>[0]) => {
      requireUser();
      return createEinsatz(state.dbContext, input);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.ARCHIVE_EINSATZ,
    wrap(async (einsatzId: string) => {
      requireUser();
      archiveEinsatz(state.dbContext, einsatzId);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_ABSCHNITTE,
    wrap(async (einsatzId: string) => listAbschnitte(state.dbContext, einsatzId)),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_ABSCHNITT,
    wrap(async (input: Parameters<RendererApi['createAbschnitt']>[0]) => {
      requireUser();
      return createAbschnitt(state.dbContext, input);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_ABSCHNITT_DETAILS,
    wrap(async (einsatzId: string, abschnittId: string) =>
      listAbschnittDetails(state.dbContext, einsatzId, abschnittId),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['createEinheit']>[0]) => {
      requireUser();
      createEinheit(state.dbContext, input);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['createFahrzeug']>[0]) => {
      requireUser();
      createFahrzeug(state.dbContext, input);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.SPLIT_EINHEIT,
    wrap(async (input: Parameters<RendererApi['splitEinheit']>[0]) => {
      requireUser();
      splitEinheit(state.dbContext, input);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['moveEinheit']>[0]) => {
      const user = requireUser();
      moveEinheit(state.dbContext, input, user);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['moveFahrzeug']>[0]) => {
      const user = requireUser();
      moveFahrzeug(state.dbContext, input, user);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UNDO_LAST,
    wrap(async (einsatzId: string) => {
      const user = requireUser();
      return undoLastCommand(state.dbContext, einsatzId, user);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.HAS_UNDO,
    wrap(async (einsatzId: string) => hasUndoableCommand(state.dbContext, einsatzId)),
  );

  ipcMain.handle(
    IPC_CHANNEL.EXPORT_EINSATZAKTE,
    wrap(async (einsatzId: string) => {
      requireUser();
      const defaultPath = path.join(process.cwd(), `einsatzakte-${einsatzId}.zip`);
      const result = await dialog.showSaveDialog({
        title: 'Einsatzakte exportieren',
        defaultPath,
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      await exportEinsatzakte(state.dbContext, einsatzId, result.filePath);
      return { outputPath: result.filePath };
    }),
  );
}
