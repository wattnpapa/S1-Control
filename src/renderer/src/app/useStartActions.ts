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
    await props.withBusy(async () => {
      props.setEinsatzInitialLoading(true);
      try {
        const opened = await window.api.openEinsatzWithDialog();
        if (!opened) {
          return;
        }

        props.setEinsaetze((prev) => upsertRecentEinsatz(prev, opened));
        props.setSelectedEinsatzId(opened.id);
        await props.loadEinsatz(opened.id);
        props.setStartChoice('open');
      } finally {
        props.setEinsatzInitialLoading(false);
      }
    });
  }, [props]);

  const openKnown = useCallback(async (einsatzId: string) => {
    await props.withBusy(async () => {
      props.setEinsatzInitialLoading(true);
      try {
        const opened = await window.api.openEinsatz(einsatzId);
        if (!opened) {
          throw new Error('Einsatz konnte im Standardpfad nicht geöffnet werden.');
        }

        props.setSelectedEinsatzId(einsatzId);
        await props.loadEinsatz(einsatzId);
        props.setStartChoice('open');
      } finally {
        props.setEinsatzInitialLoading(false);
      }
    });
  }, [props]);

  const create = useCallback(async () => {
    if (!props.startNewEinsatzName.trim()) {
      props.setError('Bitte Einsatzname eingeben.');
      return;
    }

    await props.withBusy(async () => {
      props.setEinsatzInitialLoading(true);
      try {
        const created = await window.api.createEinsatzWithDialog({
          name: props.startNewEinsatzName.trim(),
          fuestName: props.startNewFuestName.trim() || 'FüSt 1',
        });
        if (!created) {
          return;
        }

        props.setStartNewEinsatzName('');
        props.setEinsaetze((prev) => upsertRecentEinsatz(prev, created));
        props.setSelectedEinsatzId(created.id);
        await props.loadEinsatz(created.id);
        props.setStartChoice('open');
      } finally {
        props.setEinsatzInitialLoading(false);
      }
    });
  }, [props]);

  return {
    openExisting,
    openKnown,
    create,
  };
}
