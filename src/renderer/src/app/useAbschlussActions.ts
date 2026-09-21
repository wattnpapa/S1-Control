import { useCallback } from 'react';
import { useConfirm } from '@renderer/app/confirm-context';
import { readError } from '@renderer/utils/error';

interface UseAbschlussActionsProps {
  selectedEinsatzId: string;
  einsatzName: string;
  refreshEinsaetze: () => Promise<unknown>;
  refreshCurrentEinsatz: (options?: { includeFullOverview?: boolean }) => Promise<void>;
  setError: (message: string | null) => void;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Abschluss eines Einsatzes: Akte ausleiten, beenden, archivieren, wieder
 * öffnen. Alle Zustandswechsel werden bestätigt.
 */
export function useAbschlussActions(props: UseAbschlussActionsProps) {
  const confirm = useConfirm();

  const statusSetzen = useCallback(
    async (status: 'AKTIV' | 'BEENDET' | 'ARCHIVIERT') => {
      if (!props.selectedEinsatzId) {
        return;
      }
      await props.withBusy(async () => {
        try {
          await window.api.setEinsatzStatus({ einsatzId: props.selectedEinsatzId, status });
          await props.refreshEinsaetze();
          await props.refreshCurrentEinsatz({ includeFullOverview: true });
        } catch (error) {
          props.setError(readError(error));
        }
      });
    },
    [props],
  );

  const exportEinsatzakte = useCallback(async () => {
    if (!props.selectedEinsatzId) {
      return;
    }
    await props.withBusy(async () => {
      try {
        await window.api.exportEinsatzakte(props.selectedEinsatzId);
      } catch (error) {
        props.setError(readError(error));
      }
    });
  }, [props]);

  const beendeEinsatz = useCallback(async () => {
    const bestaetigt = await confirm({
      titel: 'Einsatz beenden?',
      text: `"${props.einsatzName}" wird als beendet gekennzeichnet.`,
      folgen: [
        'An allen Plätzen wird nichts mehr erfasst.',
        'Der Einsatz bleibt lesbar und lässt sich wieder öffnen.',
      ],
      bestaetigenText: 'Beenden',
    });
    if (bestaetigt) {
      await statusSetzen('BEENDET');
    }
  }, [confirm, props.einsatzName, statusSetzen]);

  const archiviereEinsatz = useCallback(async () => {
    const bestaetigt = await confirm({
      titel: 'Einsatz archivieren?',
      text: `"${props.einsatzName}" wird schreibgeschützt abgelegt.`,
      folgen: [
        'Danach sind keine Eintragungen mehr möglich.',
        'Die Einsatzakte sollte vorher exportiert sein.',
      ],
      bestaetigenText: 'Archivieren',
      gefahr: true,
    });
    if (bestaetigt) {
      await statusSetzen('ARCHIVIERT');
    }
  }, [confirm, props.einsatzName, statusSetzen]);

  const oeffneEinsatzWieder = useCallback(async () => {
    const bestaetigt = await confirm({
      titel: 'Einsatz wieder öffnen?',
      text: `"${props.einsatzName}" wird wieder zur Erfassung freigegeben.`,
      folgen: ['Das Ende-Datum wird zurückgesetzt.'],
      bestaetigenText: 'Wieder öffnen',
    });
    if (bestaetigt) {
      await statusSetzen('AKTIV');
    }
  }, [confirm, props.einsatzName, statusSetzen]);

  return { exportEinsatzakte, beendeEinsatz, archiviereEinsatz, oeffneEinsatzWieder };
}
