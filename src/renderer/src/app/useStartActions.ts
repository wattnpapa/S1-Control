import { upsertRecentEinsatz } from '@renderer/app/einsatz-list';
import type { EinsatzListItem } from '@shared/types';
import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface UseStartActionsProps {
  startNewEinsatzName: string;
  startNewFuestName: string;
  setError: (message: string | null) => void;
  setEinsaetze: Dispatch<SetStateAction<EinsatzListItem[]>>;
  setSelectedEinsatzId: Dispatch<SetStateAction<string>>;
  setStartNewEinsatzName: Dispatch<SetStateAction<string>>;
  setStartChoice: Dispatch<SetStateAction<'none' | 'open' | 'create'>>;
  loadEinsatz: (
    einsatzId: string,
    preferredAbschnittId?: string,
    options?: { waitForFullOverview?: boolean },
  ) => Promise<void>;
  setEinsatzInitialLoading: (value: boolean) => void;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Encapsulates start-screen open/create actions.
 */
export function useStartActions(props: UseStartActionsProps) {
  const openExisting = useCallback(async () => {
    let opened: EinsatzListItem | null = null;
    await props.withBusy(async () => {
      opened = await window.api.openEinsatzWithDialog();
      if (!opened) return;
      props.setEinsaetze((prev) => upsertRecentEinsatz(prev, opened!));
      props.setSelectedEinsatzId(opened.id);
      props.setStartChoice('open');
    });
    // loadEinsatz runs OUTSIDE withBusy so buttons are enabled immediately
    if (opened) {
      void props.loadEinsatz((opened as EinsatzListItem).id).catch(() => undefined);
    }
  }, [props]);

  const openKnown = useCallback(async (einsatzId: string) => {
    let ok = false;
    await props.withBusy(async () => {
      const opened = await window.api.openEinsatz(einsatzId);
      if (!opened) {
        throw new Error('Einsatz konnte im Standardpfad nicht geöffnet werden.');
      }
      props.setSelectedEinsatzId(einsatzId);
      props.setStartChoice('open');
      ok = true;
    });
    if (ok) {
      void props.loadEinsatz(einsatzId).catch(() => undefined);
    }
  }, [props]);

  const create = useCallback(async () => {
    if (!props.startNewEinsatzName.trim()) {
      props.setError('Bitte Einsatzname eingeben.');
      return;
    }

    let createdId: string | null = null;
    await props.withBusy(async () => {
      const created = await window.api.createEinsatzWithDialog({
        name: props.startNewEinsatzName.trim(),
        fuestName: props.startNewFuestName.trim() || 'FüSt 1',
      });
      if (!created) return;
      props.setStartNewEinsatzName('');
      props.setEinsaetze((prev) => upsertRecentEinsatz(prev, created));
      props.setSelectedEinsatzId(created.id);
      props.setStartChoice('open');
      createdId = created.id;
    });
    if (createdId) {
      void props.loadEinsatz(createdId).catch(() => undefined);
    }
  }, [props]);

  return {
    openExisting,
    openKnown,
    create,
  };
}
