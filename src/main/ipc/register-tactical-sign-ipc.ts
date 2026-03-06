import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { getTacticalFormationSvgDataUrl, getTacticalPersonSvgDataUrl, getTacticalVehicleSvgDataUrl } from '../services/tactical-signs';
import { inferTacticalSignConfig, listTacticalSignCatalog } from '../services/tactical-sign-inference';
import type { RegistrarCommon } from './register-support';

/**
 * Handles Register Tactical Sign Ipc.
 */
export function registerTacticalSignIpc(common: RegistrarCommon): void {
  const { wrap } = common;

  ipcMain.handle(
    IPC_CHANNEL.GET_TACTICAL_FORMATION_SVG,
    wrap(async (input: Parameters<RendererApi['getTacticalFormationSvg']>[0]) =>
      getTacticalFormationSvgDataUrl(input.organisation, input.tacticalSignConfig ?? null),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_TACTICAL_FORMATION_SVGS,
    wrap(async (input: Parameters<RendererApi['getTacticalFormationSvgs']>[0]) => {
      const result: Record<string, string> = {};
      for (const item of input) {
        result[item.cacheKey] = getTacticalFormationSvgDataUrl(item.organisation, item.tacticalSignConfig ?? null);
      }
      return result;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.INFER_TACTICAL_SIGN,
    wrap(async (input: Parameters<RendererApi['inferTacticalSign']>[0]) =>
      inferTacticalSignConfig(input.nameImEinsatz, input.organisation),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_TACTICAL_SIGN_CATALOG,
    wrap(async (input: Parameters<RendererApi['listTacticalSignCatalog']>[0]) =>
      listTacticalSignCatalog(input.organisation, input.query),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_TACTICAL_VEHICLE_SVG,
    wrap(async (input: Parameters<RendererApi['getTacticalVehicleSvg']>[0]) =>
      getTacticalVehicleSvgDataUrl(input.organisation, input.unit),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_TACTICAL_VEHICLE_SVGS,
    wrap(async (input: Parameters<RendererApi['getTacticalVehicleSvgs']>[0]) => {
      const result: Record<string, string> = {};
      for (const item of input) {
        result[item.cacheKey] = getTacticalVehicleSvgDataUrl(item.organisation, item.unit);
      }
      return result;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_TACTICAL_PERSON_SVG,
    wrap(async (input: Parameters<RendererApi['getTacticalPersonSvg']>[0]) =>
      getTacticalPersonSvgDataUrl(input.organisation, input.rolle),
    ),
  );
}
