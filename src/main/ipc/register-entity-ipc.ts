import { eq } from 'drizzle-orm';
import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { einsatzEinheitHelfer } from '../db/schema';
import { moveEinheit, moveFahrzeug, undoLastCommand } from '../services/command';
import {
  createEinheit,
  createEinheitHelfer,
  createFahrzeug,
  deleteEinheitHelfer,
  hasUndoableCommand,
  listEinheitHelfer,
  splitEinheit,
  updateEinheit,
  updateEinheitHelfer,
  updateFahrzeug,
} from '../services/einsatz';
import {
  acquireRecordEditLock,
  ensureRecordEditLockOwnership,
  listRecordEditLocks,
  refreshRecordEditLock,
  releaseRecordEditLock,
} from '../services/record-lock';
import type { EntityIpcHelpers, RegistrarCommon } from './register-support';

/**
 * Handles Register Entity Ipc.
 */
export function registerEntityIpc(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  registerEinheitHandlers(common, helpers);
  registerFahrzeugHandlers(common, helpers);
  registerHelferHandlers(common, helpers);
  registerEntityCommandHandlers(common, helpers);
  registerEditLockHandlers(common, helpers);
}

/**
 * Registers unit creation and update handlers.
 */
function registerEinheitHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;
  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['createEinheit']>[0]) => {
      requireUser();
      createEinheit(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'create-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['updateEinheit']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: input.einheitId },
        helpers.lockIdentity(user),
      );
      updateEinheit(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'update-einheit');
    }),
  );
}

/**
 * Registers vehicle creation and update handlers.
 */
function registerFahrzeugHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;
  ipcMain.handle(
    IPC_CHANNEL.CREATE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['createFahrzeug']>[0]) => {
      requireUser();
      createFahrzeug(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'create-fahrzeug');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['updateFahrzeug']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'FAHRZEUG', entityId: input.fahrzeugId },
        helpers.lockIdentity(user),
      );
      updateFahrzeug(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'update-fahrzeug');
    }),
  );
}

/**
 * Registers helfer CRUD handlers for units.
 */
function registerHelferHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;
  ipcMain.handle(
    IPC_CHANNEL.LIST_EINHEIT_HELFER,
    wrap(async (einheitId: string) => listEinheitHelfer(state.getDbContext(), einheitId)),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['createEinheitHelfer']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: input.einsatzEinheitId },
        helpers.lockIdentity(user),
      );
      createEinheitHelfer(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'create-helfer');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['updateEinheitHelfer']>[0]) => {
      const user = requireUser();
      const helfer = state
        .getDbContext()
        .db.select({ einsatzEinheitId: einsatzEinheitHelfer.einsatzEinheitId })
        .from(einsatzEinheitHelfer)
        .where(eq(einsatzEinheitHelfer.id, input.helferId))
        .get();
      if (!helfer) {
        throw new Error('Helfer nicht gefunden.');
      }
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: helfer.einsatzEinheitId },
        helpers.lockIdentity(user),
      );
      updateEinheitHelfer(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'update-helfer');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.DELETE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['deleteEinheitHelfer']>[0]) => {
      const user = requireUser();
      const helfer = state
        .getDbContext()
        .db.select({ einsatzEinheitId: einsatzEinheitHelfer.einsatzEinheitId })
        .from(einsatzEinheitHelfer)
        .where(eq(einsatzEinheitHelfer.id, input.helferId))
        .get();
      if (!helfer) {
        throw new Error('Helfer nicht gefunden.');
      }
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: helfer.einsatzEinheitId },
        helpers.lockIdentity(user),
      );
      deleteEinheitHelfer(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'delete-helfer');
    }),
  );
}

/**
 * Registers movement, split and undo handlers.
 */
function registerEntityCommandHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;
  ipcMain.handle(
    IPC_CHANNEL.SPLIT_EINHEIT,
    wrap(async (input: Parameters<RendererApi['splitEinheit']>[0]) => {
      requireUser();
      splitEinheit(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'split-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['moveEinheit']>[0]) => {
      const user = requireUser();
      moveEinheit(state.getDbContext(), input, user);
      helpers.notifyEinsatzChanged(input.einsatzId, 'move-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['moveFahrzeug']>[0]) => {
      const user = requireUser();
      moveFahrzeug(state.getDbContext(), input, user);
      helpers.notifyEinsatzChanged(input.einsatzId, 'move-fahrzeug');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UNDO_LAST,
    wrap(async (einsatzId: string) => {
      const user = requireUser();
      const undone = undoLastCommand(state.getDbContext(), einsatzId, user);
      if (undone) {
        helpers.notifyEinsatzChanged(einsatzId, 'undo-command');
      }
      return undone;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.HAS_UNDO,
    wrap(async (einsatzId: string) => hasUndoableCommand(state.getDbContext(), einsatzId)),
  );
}

/**
 * Registers record edit lock handlers.
 */
function registerEditLockHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;
  ipcMain.handle(
    IPC_CHANNEL.ACQUIRE_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['acquireEditLock']>[0]) => {
      const user = requireUser();
      return acquireRecordEditLock(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        helpers.lockIdentity(user),
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.REFRESH_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['refreshEditLock']>[0]) => {
      const user = requireUser();
      return refreshRecordEditLock(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        helpers.lockIdentity(user),
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.RELEASE_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['releaseEditLock']>[0]) => {
      const user = requireUser();
      releaseRecordEditLock(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        helpers.lockIdentity(user),
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_EDIT_LOCKS,
    wrap(async (einsatzId: string) => {
      requireUser();
      return listRecordEditLocks(state.getDbContext(), einsatzId, state.clientPresence.getClientId());
    }),
  );
}
