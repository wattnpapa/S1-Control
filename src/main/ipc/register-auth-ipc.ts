import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { login } from '../services/auth';
import type { RegistrarCommon } from './register-support';

/**
 * Handles Register Auth Ipc.
 */
export function registerAuthIpc(common: RegistrarCommon): void {
  const { state, wrap } = common;

  ipcMain.handle(IPC_CHANNEL.GET_SESSION, wrap(async () => state.getSessionUser()));

  ipcMain.handle(
    IPC_CHANNEL.LOGIN,
    wrap(async (input: Parameters<RendererApi['login']>[0]) => {
      const user = login(state.getDbContext(), input.name, input.passwort);
      state.setSessionUser(user);
      return user;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LOGOUT,
    wrap(async () => {
      state.backupCoordinator.stop();
      state.setSessionUser(null);
    }),
  );
}
