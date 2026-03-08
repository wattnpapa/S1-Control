import { ipcMain } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipc';
import { getDebugSyncLogLines } from '../services/debug';
import type { RegistrarCommon } from './register-support';

/**
 * Handles Register Sync Ipc.
 */
export function registerSyncIpc(common: RegistrarCommon): void {
  const { wrap, state } = common;

  ipcMain.handle(
    IPC_CHANNEL.LIST_ACTIVE_CLIENTS,
    wrap(async () => {
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        return await state.dbBridge.request(
          'presence-list-active',
          {
            dbPath: state.getDbContext().path,
            selfClientId: state.clientPresence.getClientId(),
          },
          'low',
        );
      }
      return state.clientPresence.listActiveClients();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_DEBUG_SYNC_LOGS,
    wrap(async () => getDebugSyncLogLines()),
  );
}
