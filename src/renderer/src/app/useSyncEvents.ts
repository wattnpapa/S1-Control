import { useEffect, useRef } from 'react';
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
 * Wires runtime sync, polling and broadcast-driven refresh flows.
 */
export function useSyncEvents(options: UseSyncEventsOptions): void {
  const {
    session,
    authReady,
    busy,
    activeView,
    selectedEinsatzId,
    selectedAbschnittId,
    queuedOpenFilePath,
    setQueuedOpenFilePath,
    setError,
    setDetails,
    setActiveClients,
    setDbPath,
    setLanPeerUpdatesEnabled,
    setPeerUpdateStatus,
    setDebugSyncLogs,
    setEinsaetze,
    setSelectedEinsatzId,
    setStartChoice,
    loadEinsatz,
    refreshAll,
    withBusy,
  } = options;
  const lastRemoteRefreshAtRef = useRef(0);

  useEffect(() => {
    if (!session || !selectedEinsatzId) {
      return;
    }
    const timer = window.setInterval(() => {
      void refreshAll();
    }, 6000);
    return () => window.clearInterval(timer);
  }, [refreshAll, selectedEinsatzId, session]);

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

  useEffect(() => {
    if (!session || !selectedEinsatzId || activeView !== 'einstellungen') {
      return;
    }
    /**
     * Loads settings-page runtime data from the main process.
     */
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
  }, [
    activeView,
    selectedEinsatzId,
    session,
    setActiveClients,
    setDbPath,
    setError,
    setLanPeerUpdatesEnabled,
    setPeerUpdateStatus,
  ]);

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

  useEffect(() => {
    const unsubscribe = window.appEvents.onDebugSyncLog((line) => {
      setDebugSyncLogs((prev) => {
        const next = [...prev, line];
        return next.slice(-400);
      });
    });
    return () => unsubscribe();
  }, [setDebugSyncLogs]);

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
  }, [refreshAll, selectedEinsatzId, session, setError]);

  useEffect(() => {
    if (!session) {
      return;
    }
    void (async () => {
      try {
        const logs = await window.api.getDebugSyncLogLines();
        setDebugSyncLogs(logs.slice(-400));
      } catch (err) {
        setError(readError(err));
      }
    })();
  }, [session, setDebugSyncLogs, setError]);
}
