import { useMemo } from 'react';
import type { EinsatzListItem } from '@shared/types';
import type { WorkspaceView } from '@renderer/types/ui';
import { selectBroadcastMonitorLogs, selectUdpDebugMonitorLogs } from './diagnostics-log';

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
    () => selectBroadcastMonitorLogs(options.debugSyncLogs),
    [options.debugSyncLogs],
  );

  const udpDebugMonitorLogs = useMemo(
    () => selectUdpDebugMonitorLogs(options.debugSyncLogs),
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
