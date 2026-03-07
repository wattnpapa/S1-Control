import path from 'node:path';
import { dialog, ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { ensureSessionUserRecord } from '../services/auth';
import { debugSync } from '../services/debug';
import {
  createEinsatzInOwnDatabase,
} from '../services/einsatz-files';
import {
  archiveEinsatz,
  createAbschnitt,
  listAbschnittDetails,
  listAbschnittDetailsBatch,
  listAbschnitte,
  updateAbschnitt,
} from '../services/einsatz';
import { exportEinsatzakte } from '../services/export';
import { ensureRecordEditLockOwnership } from '../services/record-lock';
import {
  reopenDbContextAfterRestore,
  showCreateEinsatzDialog,
  showOpenEinsatzDialog,
  showRestoreBackupDialog,
} from './register-einsatz-ipc-support';
import type { EntityIpcHelpers, EinsatzIpcHelpers, RegistrarCommon } from './register-support';
import type { AbschnittDetails, AbschnittNode } from '../../shared/types';

/**
 * Handles Register Einsatz Ipc.
 */
export function registerEinsatzIpc(
  common: RegistrarCommon,
  helpers: EinsatzIpcHelpers,
  entityHelpers: EntityIpcHelpers,
): void {
  registerEinsatzOpenHandlers(common, helpers);
  registerEinsatzCreateHandlers(common, helpers);
  registerAbschnittHandlers(common, helpers, entityHelpers);
  registerEinsatzRecoveryHandlers(common, helpers);
}

/**
 * Registers handlers for opening existing einsatz files.
 */
function registerEinsatzOpenHandlers(
  common: RegistrarCommon,
  helpers: EinsatzIpcHelpers,
): void {
  const { wrap, requireUser } = common;
  ipcMain.handle(
    IPC_CHANNEL.OPEN_EINSATZ,
    wrap(async (einsatzId: string) => {
      const user = requireUser();
      const dbPath = helpers.resolveRecentDbPathByEinsatzId(einsatzId);
      if (!dbPath) {
        return false;
      }
      const einsatz = helpers.openEinsatzByPathForUser(dbPath, user);
      return einsatz.id === einsatzId;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.OPEN_EINSATZ_BY_PATH,
    wrap(async (dbPath: string) => {
      const user = requireUser();
      return helpers.openEinsatzByPathForUser(dbPath, user);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.OPEN_EINSATZ_DIALOG,
    wrap(async () => {
      const user = requireUser();
      const selected = await showOpenEinsatzDialog(helpers.getBaseDir());
      if (!selected) {
        debugSync('einsatz', 'open-dialog:cancel');
        return null;
      }
      debugSync('einsatz', 'open-dialog:selected', { selected });
      return helpers.openEinsatzByPathForUser(selected, user);
    }),
  );
}

/**
 * Registers handlers for creating new einsatz files.
 */
function registerEinsatzCreateHandlers(
  common: RegistrarCommon,
  helpers: EinsatzIpcHelpers,
): void {
  const { state, wrap, requireUser } = common;
  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINSATZ,
    wrap(async (input: Parameters<RendererApi['createEinsatz']>[0]) => {
      const user = requireUser();
      const created = createEinsatzInOwnDatabase(helpers.getBaseDir(), input, user);
      const dbUser = ensureSessionUserRecord(created.ctx, user);
      state.setSessionUser(dbUser);
      state.setDbContext(created.ctx);
      if (state.clientHeartbeatEnabled && !state.perfSafeMode) {
        state.clientPresence.start(created.ctx);
      }
      state.einsatzSync.setContext({ dbPath: created.ctx.path, einsatzId: created.einsatz.id });
      if (!state.perfSafeMode) {
        state.backupCoordinator.start(created.ctx);
      }
      if (created.einsatz.dbPath) {
        helpers.rememberRecentDbPath(created.einsatz.dbPath, created.einsatz.id);
      }
      return created.einsatz;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINSATZ_DIALOG,
    wrap(async (input: Parameters<RendererApi['createEinsatzWithDialog']>[0]) => {
      const user = requireUser();
      const baseDir = helpers.getBaseDir();
      const normalized = await showCreateEinsatzDialog(baseDir, input.name);
      if (!normalized) {
        debugSync('einsatz', 'create-dialog:cancel');
        return null;
      }
      debugSync('einsatz', 'create-dialog:selected', { selected: normalized, normalized });

      const created = createEinsatzInOwnDatabase(path.dirname(normalized), input, user, normalized);
      const dbUser = ensureSessionUserRecord(created.ctx, user);
      state.setSessionUser(dbUser);
      state.setDbContext(created.ctx);
      if (state.clientHeartbeatEnabled && !state.perfSafeMode) {
        state.clientPresence.start(created.ctx);
      }
      state.einsatzSync.setContext({ dbPath: created.ctx.path, einsatzId: created.einsatz.id });
      if (!state.perfSafeMode) {
        state.backupCoordinator.start(created.ctx);
      }
      helpers.rememberRecentDbPath(normalized, created.einsatz.id);
      state.settingsStore.set({ dbPath: path.dirname(normalized) });
      debugSync('einsatz', 'create-dialog:ok', {
        einsatzId: created.einsatz.id,
        dbPath: normalized,
      });
      return created.einsatz;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.ARCHIVE_EINSATZ,
    wrap(async (einsatzId: string) => {
      requireUser();
      archiveEinsatz(state.getDbContext(), einsatzId);
      helpers.notifyEinsatzChanged(einsatzId, 'archive-einsatz');
    }),
  );
}

/**
 * Registers handlers for abschnitt CRUD and loading.
 */
function registerAbschnittHandlers(
  common: RegistrarCommon,
  helpers: EinsatzIpcHelpers,
  entityHelpers: EntityIpcHelpers,
): void {
  const { state, wrap, requireUser } = common;
  ipcMain.handle(
    IPC_CHANNEL.LIST_ABSCHNITTE,
    wrap(async (einsatzId: string) =>
      readAbschnitte(common, einsatzId),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_ABSCHNITT,
    wrap(async (input: Parameters<RendererApi['createAbschnitt']>[0]) => {
      requireUser();
      const abschnitt = createAbschnitt(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'create-abschnitt');
      return abschnitt;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_ABSCHNITT,
    wrap(async (input: Parameters<RendererApi['updateAbschnitt']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'ABSCHNITT', entityId: input.abschnittId },
        entityHelpers.lockIdentity(user),
      );
      updateAbschnitt(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'update-abschnitt');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_ABSCHNITT_DETAILS,
    wrap(async (einsatzId: string, abschnittId: string) =>
      readAbschnittDetails(common, einsatzId, abschnittId),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_ABSCHNITT_DETAILS_BATCH,
    wrap(async (einsatzId: string) =>
      readAbschnittDetailsBatch(common, einsatzId),
    ),
  );
}

/**
 * Reads abschnitte with high-priority utility-process delegation and local fallback.
 */
async function readAbschnitte(
  common: RegistrarCommon,
  einsatzId: string,
): Promise<AbschnittNode[]> {
  const { state } = common;
  const ctx = state.getDbContext();
  if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
    try {
      return await state.dbBridge.request(
        'list-abschnitte',
        {
          dbPath: ctx.path,
          einsatzId,
        },
        'high',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      debugSync('db-bridge', 'fallback:list-abschnitte', { einsatzId, message });
    }
  }
  return state.einsatzReadCache.getAbschnitte(ctx, einsatzId, () => listAbschnitte(ctx, einsatzId));
}

/**
 * Reads one abschnitt detail payload with high-priority utility-process delegation and local fallback.
 */
async function readAbschnittDetails(
  common: RegistrarCommon,
  einsatzId: string,
  abschnittId: string,
): Promise<AbschnittDetails> {
  const { state } = common;
  const ctx = state.getDbContext();
  if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
    try {
      return await state.dbBridge.request(
        'list-abschnitt-details',
        {
          dbPath: ctx.path,
          einsatzId,
          abschnittId,
        },
        'high',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      debugSync('db-bridge', 'fallback:list-abschnitt-details', { einsatzId, abschnittId, message });
    }
  }
  return state.einsatzReadCache.getAbschnittDetails(ctx, einsatzId, abschnittId, () =>
    listAbschnittDetails(ctx, einsatzId, abschnittId),
  );
}

/**
 * Reads all abschnitt detail payloads in one batch with high-priority utility-process delegation and local fallback.
 */
async function readAbschnittDetailsBatch(
  common: RegistrarCommon,
  einsatzId: string,
): Promise<Record<string, AbschnittDetails>> {
  const { state } = common;
  const ctx = state.getDbContext();
  if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
    try {
      return await state.dbBridge.request(
        'list-abschnitt-details-batch',
        {
          dbPath: ctx.path,
          einsatzId,
        },
        'high',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      debugSync('db-bridge', 'fallback:list-abschnitt-details-batch', { einsatzId, message });
    }
  }
  return state.einsatzReadCache.getAbschnittDetailsBatch(ctx, einsatzId, () => listAbschnittDetailsBatch(ctx, einsatzId));
}

/**
 * Registers handlers for backup restore and export flows.
 */
function registerEinsatzRecoveryHandlers(
  common: RegistrarCommon,
  helpers: EinsatzIpcHelpers,
): void {
  const { state, wrap, requireUser } = common;
  ipcMain.handle(
    IPC_CHANNEL.RESTORE_BACKUP,
    wrap(async (einsatzId: string) => {
      const user = requireUser();
      const dbPath = helpers.resolveRecentDbPathByEinsatzId(einsatzId);
      if (!dbPath) {
        return false;
      }

      const selected = await showRestoreBackupDialog(dbPath);
      if (!selected) {
        return false;
      }

      await state.backupCoordinator.restoreBackup(dbPath, selected);
      reopenDbContextAfterRestore(common, dbPath, einsatzId, user);
      helpers.notifyEinsatzChanged(einsatzId, 'restore-backup', dbPath);
      return true;
    }),
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

      await exportEinsatzakte(state.getDbContext(), einsatzId, result.filePath);
      return { outputPath: result.filePath };
    }),
  );
}
