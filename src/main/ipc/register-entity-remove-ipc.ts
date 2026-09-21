import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { removeAbschnitt, removeEinheit, removeFahrzeug } from '../services/einsatz-write/entfernen';
import type { EntityIpcHelpers, RegistrarCommon } from './register-support';

/**
 * Registriert das Entfernen von Einheiten, Fahrzeugen und Abschnitten.
 */
export function registerEntityRemoveHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;

  ipcMain.handle(
    IPC_CHANNEL.REMOVE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['removeEinheit']>[0]) => {
      const user = requireUser();
      const ctx = state.getDbContext();
      await ctx.mutate(() => removeEinheit(ctx, input, user));
      helpers.notifyEinsatzChanged(input.einsatzId, 'remove-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.REMOVE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['removeFahrzeug']>[0]) => {
      const user = requireUser();
      const ctx = state.getDbContext();
      await ctx.mutate(() => removeFahrzeug(ctx, input, user));
      helpers.notifyEinsatzChanged(input.einsatzId, 'remove-fahrzeug');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.REMOVE_ABSCHNITT,
    wrap(async (input: Parameters<RendererApi['removeAbschnitt']>[0]) => {
      const user = requireUser();
      const ctx = state.getDbContext();
      await ctx.mutate(() => removeAbschnitt(ctx, input, user));
      helpers.notifyEinsatzChanged(input.einsatzId, 'remove-abschnitt');
    }),
  );
}
