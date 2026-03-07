import { toTaktischeStaerke } from '@renderer/utils/tactical';
import type { PeerUpdateStatus } from '@shared/types';
import type { MoveDialogState, TacticalStrength } from '@renderer/types/ui';
import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';

const RELEASES_URL = 'https://github.com/wattnpapa/S1-Control/releases/latest';

interface UseSystemActionsProps {
  dbPath: string;
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  moveDialog: MoveDialogState | null;
  moveTarget: string;
  gesamtStaerke: TacticalStrength;
  setLanPeerUpdatesEnabled: Dispatch<SetStateAction<boolean>>;
  setDbPath: Dispatch<SetStateAction<string>>;
  setPeerUpdateStatus: Dispatch<SetStateAction<PeerUpdateStatus | null>>;
  clearSelectedEinsatz: () => void;
  refreshEinsaetze: () => Promise<unknown>;
  loadEinsatz: (einsatzId: string, preferredAbschnittId?: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  setError: (message: string | null) => void;
  setMoveDialog: Dispatch<SetStateAction<MoveDialogState | null>>;
  setMoveTarget: Dispatch<SetStateAction<string>>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Provides settings actions for db path and LAN peer updater toggles.
 */
function useSystemSettingsActions(props: UseSystemActionsProps) {
  const saveDbPath = useCallback(async () => {
    await props.withBusy(async () => {
      await window.api.setDbPath(props.dbPath);
      props.clearSelectedEinsatz();
      await props.refreshEinsaetze();
    });
  }, [props]);

  const toggleLanPeerUpdates = useCallback(async (enabled: boolean) => {
    await props.withBusy(async () => {
      const settings = await window.api.setLanPeerUpdatesEnabled(enabled);
      props.setLanPeerUpdatesEnabled(settings.lanPeerUpdatesEnabled);
      props.setDbPath(settings.dbPath);
      props.setPeerUpdateStatus(await window.api.getPeerUpdateStatus());
    });
  }, [props]);

  const restoreBackup = useCallback(async () => {
    if (!props.selectedEinsatzId) {
      props.setError('Bitte zuerst einen Einsatz auswählen.');
      return;
    }

    await props.withBusy(async () => {
      const restored = await window.api.restoreBackup(props.selectedEinsatzId);
      if (!restored) {
        return;
      }

      const reopened = await window.api.openEinsatz(props.selectedEinsatzId);
      if (!reopened) {
        throw new Error('Einsatz konnte nach Backup-Wiederherstellung nicht geöffnet werden.');
      }

      await props.loadEinsatz(props.selectedEinsatzId, props.selectedAbschnittId);
    });
  }, [props]);

  return { saveDbPath, toggleLanPeerUpdates, restoreBackup };
}

/**
 * Provides move and updater actions.
 */
function useSystemProcessActions(props: UseSystemActionsProps) {
  const openMainDevTools = useCallback(async () => {
    props.setError(null);
    try {
      await window.api.openMainDevTools();
    } catch (error) {
      props.setError(error instanceof Error ? error.message : String(error));
    }
  }, [props]);

  const checkForUpdates = useCallback(async () => {
    props.setError(null);
    try {
      await window.api.checkForUpdates();
    } catch (error) {
      props.setError(error instanceof Error ? error.message : String(error));
    }
  }, [props]);

  const move = useCallback(async () => {
    if (!props.moveDialog || !props.selectedEinsatzId || !props.moveTarget) {
      return;
    }

    await props.withBusy(async () => {
      if (props.moveDialog.type === 'einheit') {
        await window.api.moveEinheit({
          einsatzId: props.selectedEinsatzId,
          einheitId: props.moveDialog.id,
          nachAbschnittId: props.moveTarget,
        });
      } else {
        await window.api.moveFahrzeug({
          einsatzId: props.selectedEinsatzId,
          fahrzeugId: props.moveDialog.id,
          nachAbschnittId: props.moveTarget,
        });
      }

      props.setMoveDialog(null);
      props.setMoveTarget('');
      await props.refreshAll();
    });
  }, [props]);

  const downloadUpdate = useCallback(async () => {
    await props.withBusy(async () => {
      await window.api.downloadUpdate();
    });
  }, [props]);

  const openReleasePage = useCallback(async () => {
    await props.withBusy(async () => {
      await window.api.openExternalUrl(RELEASES_URL);
    });
  }, [props]);

  return { openMainDevTools, checkForUpdates, move, downloadUpdate, openReleasePage };
}

/**
 * Provides strength display actions and sync effect.
 */
function useStrengthDisplayActions(props: UseSystemActionsProps) {
  const openStrengthDisplay = useCallback(async () => {
    props.setError(null);
    try {
      await window.api.openStrengthDisplayWindow();
      await window.api.setStrengthDisplayState({
        taktischeStaerke: toTaktischeStaerke(props.gesamtStaerke).replace(/\/(\d+)$/, '//$1'),
      });
    } catch (error) {
      props.setError(error instanceof Error ? error.message : String(error));
    }
  }, [props]);

  const closeStrengthDisplay = useCallback(async () => {
    props.setError(null);
    try {
      await window.api.closeStrengthDisplayWindow();
    } catch (error) {
      props.setError(error instanceof Error ? error.message : String(error));
    }
  }, [props]);

  useEffect(() => {
    void window.api.setStrengthDisplayState({
      taktischeStaerke: toTaktischeStaerke(props.gesamtStaerke).replace(/\/(\d+)$/, '//$1'),
    });
  }, [props.gesamtStaerke]);

  return { openStrengthDisplay, closeStrengthDisplay };
}

/**
 * Provides shared settings, updater, movement and strength display actions.
 */
export function useSystemActions(props: UseSystemActionsProps) {
  const settingsActions = useSystemSettingsActions(props);
  const processActions = useSystemProcessActions(props);
  const strengthDisplayActions = useStrengthDisplayActions(props);

  return {
    ...settingsActions,
    ...processActions,
    ...strengthDisplayActions,
  };
}
