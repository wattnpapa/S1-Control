import { useEffect } from 'react';
import type { SessionUser, UpdaterState } from '@shared/types';
import { readError } from '@renderer/utils/error';

interface UseAppBootstrapOptions {
  authReady: boolean;
  setAuthReady: (value: boolean) => void;
  setDbPath: (value: string) => void;
  setLanPeerUpdatesEnabled: (value: boolean) => void;
  setUpdaterState: (value: UpdaterState) => void;
  setSession: (value: SessionUser | null) => void;
  setQueuedOpenFilePath: (value: string | null) => void;
  setNow: (value: Date) => void;
  setError: (value: string | null) => void;
  refreshEinsaetze: () => Promise<unknown>;
}

/**
 * Bootstraps renderer state and global event subscriptions.
 */
export function useAppBootstrap(options: UseAppBootstrapOptions): void {
  const {
    authReady,
    setAuthReady,
    setDbPath,
    setLanPeerUpdatesEnabled,
    setUpdaterState,
    setSession,
    setQueuedOpenFilePath,
    setNow,
    setError,
    refreshEinsaetze,
  } = options;

  useEffect(() => {
    void (async () => {
      try {
        const [currentSession, settings] = await Promise.all([window.api.getSession(), window.api.getSettings()]);
        setDbPath(settings.dbPath);
        setLanPeerUpdatesEnabled(settings.lanPeerUpdatesEnabled);
        setUpdaterState(await window.api.getUpdaterState());
        void window.api.checkForUpdates();
        const nextSession = currentSession ?? (await window.api.login({ name: 'admin', passwort: 'admin' }));
        setSession(nextSession);
        await refreshEinsaetze();
      } catch (err) {
        setError(readError(err));
      } finally {
        setAuthReady(true);
      }
    })();
  }, [refreshEinsaetze, setAuthReady, setDbPath, setError, setLanPeerUpdatesEnabled, setSession, setUpdaterState]);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    void (async () => {
      try {
        const pendingPath = await window.api.consumePendingOpenFilePath();
        if (pendingPath) {
          setQueuedOpenFilePath(pendingPath);
        }
      } catch (err) {
        setError(readError(err));
      }
    })();
  }, [authReady, setError, setQueuedOpenFilePath]);

  useEffect(() => {
    const unsubscribe = window.updaterEvents.onStateChanged((state) => {
      setUpdaterState(state as UpdaterState);
    });
    return () => unsubscribe();
  }, [setUpdaterState]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [setNow]);

  useEffect(() => {
    const unsubscribe = window.appEvents.onPendingOpenFile((dbPath) => {
      setQueuedOpenFilePath(dbPath);
    });
    return () => unsubscribe();
  }, [setQueuedOpenFilePath]);
}
