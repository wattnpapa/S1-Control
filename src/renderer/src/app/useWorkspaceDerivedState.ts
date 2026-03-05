import { useMemo } from 'react';
import type { EinsatzListItem } from '@shared/types';
import type { WorkspaceView } from '@renderer/types/ui';

interface UseWorkspaceDerivedStateOptions {
  einsaetze: EinsatzListItem[];
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  debugSyncLogs: string[];
  lockByAbschnittId: Record<string, { isSelf: boolean; computerName: string; userName: string }>;
  activeView: WorkspaceView;
}

/**
 * Computes derived workspace values from base state.
 */
export function useWorkspaceDerivedState(options: UseWorkspaceDerivedStateOptions) {
  const selectedEinsatz = useMemo(
    () => options.einsaetze.find((item) => item.id === options.selectedEinsatzId) ?? null,
    [options.einsaetze, options.selectedEinsatzId],
  );

  const broadcastMonitorLogs = useMemo(
    () =>
      options.debugSyncLogs
        .filter((line) => line.includes('[einsatz-sync] received') || line.includes('[einsatz-sync] remote-change'))
        .slice(-120),
    [options.debugSyncLogs],
  );

  const udpDebugMonitorLogs = useMemo(
    () =>
      options.debugSyncLogs
        .filter((line) => {
          const isUdpScope =
            line.includes('[einsatz-sync]') ||
            line.includes('[peer-service]') ||
            line.includes('[peer-discovery]') ||
            line.includes('[peer-offer]');
          if (!isUdpScope) {
            return false;
          }
          return (
            line.includes('udp-') ||
            line.includes('broadcast') ||
            line.includes('received') ||
            line.includes('query') ||
            line.includes('sent') ||
            line.includes('remote-change')
          );
        })
        .slice(-250),
    [options.debugSyncLogs],
  );

  const selectedAbschnittLock = options.selectedAbschnittId
    ? options.lockByAbschnittId[options.selectedAbschnittId]
    : undefined;
  const selectedAbschnittLockedByOther = Boolean(selectedAbschnittLock && !selectedAbschnittLock.isSelf);

  const isArchived = selectedEinsatz?.status === 'ARCHIVIERT';
  const showAbschnittSidebar = options.activeView === 'einsatz';

  return {
    selectedEinsatz,
    broadcastMonitorLogs,
    udpDebugMonitorLogs,
    selectedAbschnittLock,
    selectedAbschnittLockedByOther,
    isArchived,
    showAbschnittSidebar,
  };
}
