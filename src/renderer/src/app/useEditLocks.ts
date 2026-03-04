import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RecordEditLockInfo, RecordEditLockType } from '@shared/types';

interface OwnedEditLock {
  entityType: RecordEditLockType;
  entityId: string;
}

interface UseEditLocksParams {
  sessionActive: boolean;
  selectedEinsatzId: string;
  onError: (message: string) => void;
}

interface UseEditLocksResult {
  editLocks: RecordEditLockInfo[];
  ownedEditLocks: OwnedEditLock[];
  lockByEinheitId: Record<string, RecordEditLockInfo>;
  lockByFahrzeugId: Record<string, RecordEditLockInfo>;
  lockByAbschnittId: Record<string, RecordEditLockInfo>;
  refreshEditLocks: (einsatzId: string) => Promise<void>;
  acquireEditLock: (einsatzId: string, entityType: RecordEditLockType, entityId: string) => Promise<boolean>;
  releaseEditLock: (einsatzId: string, entityType: RecordEditLockType, entityId: string) => Promise<void>;
  clearLocks: () => void;
}

/**
 * Handles Use Edit Locks.
 */
export function useEditLocks(params: UseEditLocksParams): UseEditLocksResult {
  const { onError, selectedEinsatzId, sessionActive } = params;
  const [editLocks, setEditLocks] = useState<RecordEditLockInfo[]>([]);
  const [ownedEditLocks, setOwnedEditLocks] = useState<OwnedEditLock[]>([]);

  /**
   * Handles Refresh Edit Locks.
   */
  const refreshEditLocks = useCallback(async (einsatzId: string) => {
    const locks = await window.api.listEditLocks(einsatzId);
    setEditLocks(locks);
  }, []);

  /**
   * Handles Acquire Edit Lock.
   */
  const acquireEditLock = useCallback(
    async (einsatzId: string, entityType: RecordEditLockType, entityId: string): Promise<boolean> => {
      const result = await window.api.acquireEditLock({ einsatzId, entityType, entityId });
      await refreshEditLocks(einsatzId);
      if (!result.acquired) {
        onError(`Datensatz wird gerade von ${result.lock.computerName} (${result.lock.userName}) bearbeitet.`);
        return false;
      }
      setOwnedEditLocks((prev) => {
        if (prev.some((item) => item.entityType === entityType && item.entityId === entityId)) {
          return prev;
        }
        return [...prev, { entityType, entityId }];
      });
      return true;
    },
    [onError, refreshEditLocks],
  );

  /**
   * Handles Release Edit Lock.
   */
  const releaseEditLock = useCallback(
    async (einsatzId: string, entityType: RecordEditLockType, entityId: string) => {
      try {
        await window.api.releaseEditLock({ einsatzId, entityType, entityId });
      } finally {
        setOwnedEditLocks((prev) => prev.filter((item) => !(item.entityType === entityType && item.entityId === entityId)));
        if (einsatzId) {
          await refreshEditLocks(einsatzId);
        }
      }
    },
    [refreshEditLocks],
  );

  /**
   * Handles Clear Locks.
   */
  const clearLocks = useCallback(() => {
    setEditLocks([]);
    setOwnedEditLocks([]);
  }, []);

  const lockByEinheitId = useMemo(
    () =>
      Object.fromEntries(
        editLocks
          .filter((lock) => lock.entityType === 'EINHEIT')
          .map((lock) => [lock.entityId, lock] as const),
      ),
    [editLocks],
  );
  const lockByFahrzeugId = useMemo(
    () =>
      Object.fromEntries(
        editLocks
          .filter((lock) => lock.entityType === 'FAHRZEUG')
          .map((lock) => [lock.entityId, lock] as const),
      ),
    [editLocks],
  );
  const lockByAbschnittId = useMemo(
    () =>
      Object.fromEntries(
        editLocks
          .filter((lock) => lock.entityType === 'ABSCHNITT')
          .map((lock) => [lock.entityId, lock] as const),
      ),
    [editLocks],
  );

  useEffect(() => {
    if (!sessionActive || !selectedEinsatzId || ownedEditLocks.length === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      void (async () => {
        for (const lock of ownedEditLocks) {
          try {
            await window.api.refreshEditLock({
              einsatzId: selectedEinsatzId,
              entityType: lock.entityType,
              entityId: lock.entityId,
            });
          } catch {
            // ignore transient refresh errors
          }
        }
        await refreshEditLocks(selectedEinsatzId);
      })();
    }, 8000);
    return () => window.clearInterval(timer);
  }, [ownedEditLocks, refreshEditLocks, selectedEinsatzId, sessionActive]);

  return {
    editLocks,
    ownedEditLocks,
    lockByEinheitId,
    lockByFahrzeugId,
    lockByAbschnittId,
    refreshEditLocks,
    acquireEditLock,
    releaseEditLock,
    clearLocks,
  };
}
