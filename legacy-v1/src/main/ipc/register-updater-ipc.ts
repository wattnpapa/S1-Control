import { ipcMain, shell } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipc';
import type { RegistrarCommon } from './register-support';

/**
 * Handles Register Updater Ipc.
 */
export function registerUpdaterIpc(common: RegistrarCommon): void {
  const { wrap, state } = common;

  ipcMain.handle(
    IPC_CHANNEL.GET_UPDATER_STATE,
    wrap(async () => state.updater.getState()),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_PEER_UPDATE_STATUS,
    wrap(async () => state.updater.getPeerUpdateStatus()),
  );

  ipcMain.handle(
    IPC_CHANNEL.CHECK_UPDATES,
    wrap(async () => {
      await state.updater.checkForUpdates();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.DOWNLOAD_UPDATE,
    wrap(async () => {
      await state.updater.downloadUpdate();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.INSTALL_UPDATE,
    wrap(async () => {
      state.updater.installDownloadedUpdate();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.OPEN_EXTERNAL_URL,
    wrap(async (url: string) => {
      if (!/^https:\/\//i.test(url)) {
        throw new Error('Nur HTTPS-URLs sind erlaubt.');
      }
      await shell.openExternal(url);
    }),
  );
}
