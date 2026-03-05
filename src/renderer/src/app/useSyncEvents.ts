import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type {
  ActiveClientInfo,
  AbschnittDetails,
  EinsatzListItem,
  PeerUpdateStatus,
  SessionUser,
} from '@shared/types';
import type { WorkspaceView } from '@renderer/types/ui';
import { readError } from '@renderer/utils/error';
import { upsertRecentEinsatz } from './einsatz-list';
import { appendDebugSyncLogLine, trimDebugSyncLogs } from './diagnostics-log';

interface UseSyncEventsOptions {
  session: SessionUser | null;
  authReady: boolean;
  busy: boolean;
  activeView: WorkspaceView;
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  queuedOpenFilePath: string | null;
  setQueuedOpenFilePath: (value: string | null) => void;
  setError: (value: string | null) => void;
  setDetails: (value: AbschnittDetails) => void;
  setActiveClients: (value: ActiveClientInfo[]) => void;
  setDbPath: (value: string) => void;
  setLanPeerUpdatesEnabled: (value: boolean) => void;
  setPeerUpdateStatus: (value: PeerUpdateStatus | null) => void;
  setDebugSyncLogs: (value: string[] | ((prev: string[]) => string[])) => void;
  setEinsaetze: (value: EinsatzListItem[] | ((prev: EinsatzListItem[]) => EinsatzListItem[])) => void;
  setSelectedEinsatzId: (value: string) => void;
  setStartChoice: (value: 'none' | 'open' | 'create') => void;
  loadEinsatz: (einsatzId: string, preferredAbschnittId?: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Polls selected Einsatz to keep distributed state aligned.
 */
function usePeriodicRefreshEffect(options: UseSyncEventsOptions): void {
  const { refreshAll, selectedEinsatzId, session } = options;
  useEffect(() => {
    if (!session || !selectedEinsatzId) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshAll();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [refreshAll, selectedEinsatzId, session]);
}

/**
 * Loads selected Abschnitt details when selection changes.
 */
function useAbschnittDetailsEffect(options: UseSyncEventsOptions): void {
  const { selectedAbschnittId, selectedEinsatzId, session, setDetails, setError } = options;
  useEffect(() => {
    if (!session || !selectedEinsatzId || !selectedAbschnittId) {
      return;
    }
    void (async () => {
      try {
        setDetails(await window.api.listAbschnittDetails(selectedEinsatzId, selectedAbschnittId));
      } catch (err) {
        setError(readError(err));
      }
    })();
  }, [selectedAbschnittId, selectedEinsatzId, session, setDetails, setError]);
}

/**
 * Refreshes settings/peer/client state while settings view is active.
 */
function useSettingsViewSyncEffect(options: UseSyncEventsOptions): void {
  const { activeView, selectedEinsatzId, session, setActiveClients, setDbPath, setError, setLanPeerUpdatesEnabled, setPeerUpdateStatus } =
    options;
  useEffect(() => {
    if (!session || !selectedEinsatzId || activeView !== 'einstellungen') {
      return;
    }
    const loadClients = async () => {
      try {
        const [clients, settings, peerStatus] = await Promise.all([
          window.api.listActiveClients(),
          window.api.getSettings(),
          window.api.getPeerUpdateStatus(),
        ]);
        setActiveClients(clients);
        setDbPath(settings.dbPath);
        setLanPeerUpdatesEnabled(settings.lanPeerUpdatesEnabled);
        setPeerUpdateStatus(peerStatus);
      } catch (err) {
        setError(readError(err));
      }
    };
    void loadClients();
    const timer = window.setInterval(() => {
      void loadClients();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeView, selectedEinsatzId, session, setActiveClients, setDbPath, setError, setLanPeerUpdatesEnabled, setPeerUpdateStatus]);
}

/**
 * Opens queued file path once session/bootstrap are ready.
 */
function useQueuedFileOpenEffect(options: UseSyncEventsOptions): void {
  const {
    authReady,
    busy,
    loadEinsatz,
    queuedOpenFilePath,
    session,
    setEinsaetze,
    setQueuedOpenFilePath,
    setSelectedEinsatzId,
    setStartChoice,
    withBusy,
  } = options;
  useEffect(() => {
    if (!session || !authReady || busy || !queuedOpenFilePath) {
      return;
    }
    const dbPath = queuedOpenFilePath;
    setQueuedOpenFilePath(null);
    void withBusy(async () => {
      const opened = await window.api.openEinsatzByPath(dbPath);
      setEinsaetze((prev) => upsertRecentEinsatz(prev, opened));
      setSelectedEinsatzId(opened.id);
      await loadEinsatz(opened.id);
      setStartChoice('open');
    });
  }, [
    authReady,
    busy,
    loadEinsatz,
    queuedOpenFilePath,
    session,
    setEinsaetze,
    setQueuedOpenFilePath,
    setSelectedEinsatzId,
    setStartChoice,
    withBusy,
  ]);
}

/**
 * Subscribes live debug lines from main process sync logs.
 */
function useDebugLogSubscriptionEffect(setDebugSyncLogs: UseSyncEventsOptions['setDebugSyncLogs']): void {
  useEffect(() => {
    const unsubscribe = window.appEvents.onDebugSyncLog((line) => {
      setDebugSyncLogs((prev) => appendDebugSyncLogLine(prev, line));
    });
    return () => unsubscribe();
  }, [setDebugSyncLogs]);
}

/**
 * Refreshes state on remote change broadcast for current Einsatz.
 */
function useEinsatzChangedEffect(options: UseSyncEventsOptions, lastRemoteRefreshAtRef: MutableRefObject<number>): void {
  const { refreshAll, selectedEinsatzId, session, setError } = options;
  useEffect(() => {
    const unsubscribe = window.appEvents.onEinsatzChanged((signal) => {
      if (!session || !selectedEinsatzId || signal.einsatzId !== selectedEinsatzId) {
        return;
      }
      const nowTs = Date.now();
      if (nowTs - lastRemoteRefreshAtRef.current < 800) {
        return;
      }
      lastRemoteRefreshAtRef.current = nowTs;
      void refreshAll().catch((err: unknown) => {
        setError(readError(err));
      });
    });
    return () => unsubscribe();
  }, [refreshAll, selectedEinsatzId, session, setError, lastRemoteRefreshAtRef]);
}

/**
 * Loads existing debug lines once session is active.
 */
function useInitialDebugLogLoadEffect(options: UseSyncEventsOptions): void {
  const { session, setDebugSyncLogs, setError } = options;
  useEffect(() => {
    if (!session) {
      return;
    }
    void (async () => {
      try {
        const logs = await window.api.getDebugSyncLogLines();
        setDebugSyncLogs(trimDebugSyncLogs(logs));
      } catch (err) {
        setError(readError(err));
      }
    })();
  }, [session, setDebugSyncLogs, setError]);
}

/**
 * Wires runtime sync, polling and broadcast-driven refresh flows.
 */
export function useSyncEvents(options: UseSyncEventsOptions): void {
  const lastRemoteRefreshAtRef = useRef(0);

  usePeriodicRefreshEffect(options);
  useAbschnittDetailsEffect(options);
  useSettingsViewSyncEffect(options);
  useQueuedFileOpenEffect(options);
  useDebugLogSubscriptionEffect(options.setDebugSyncLogs);
  useEinsatzChangedEffect(options, lastRemoteRefreshAtRef);
  useInitialDebugLogLoadEffect(options);
}
