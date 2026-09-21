import { useCallback, useEffect, useState } from 'react';
import { useConfirm } from '@renderer/app/confirm-context';

const PRUEF_INTERVALL_MS = 6000;

interface UseUndoActionProps {
  selectedEinsatzId: string;
  isArchived: boolean;
  refreshAll: () => Promise<void>;
  setError: (message: string | null) => void;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Macht die im Kern vorhandene Rücknahme in der Oberfläche verfügbar und
 * hält vorher Rückfrage, welche Bewegung zurückgeht.
 */
export function useUndoAction(props: UseUndoActionProps) {
  const confirm = useConfirm();
  const [undoMoeglich, setUndoMoeglich] = useState(false);
  const { selectedEinsatzId } = props;

  useEffect(() => {
    if (!selectedEinsatzId) {
      setUndoMoeglich(false);
      return;
    }
    let abgemeldet = false;
    const pruefen = async (): Promise<void> => {
      try {
        const moeglich = await window.api.hasUndoableCommand(selectedEinsatzId);
        if (!abgemeldet) {
          setUndoMoeglich(moeglich);
        }
      } catch {
        // Ein fehlgeschlagener Blick auf den Verlauf darf nichts auslösen.
      }
    };
    void pruefen();
    const timer = window.setInterval(() => void pruefen(), PRUEF_INTERVALL_MS);
    return () => {
      abgemeldet = true;
      window.clearInterval(timer);
    };
  }, [selectedEinsatzId]);

  const undoLast = useCallback(async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    const letzte = await window.api.describeLastCommand(props.selectedEinsatzId);
    if (!letzte) {
      setUndoMoeglich(false);
      props.setError('Es gibt nichts zurückzunehmen.');
      return;
    }
    const bestaetigt = await confirm({
      titel: 'Letzte Bewegung zurücknehmen?',
      text: `Zurückgenommen wird: ${letzte.beschreibung}.`,
      folgen: ['Die Rücknahme wird selbst als Bewegung protokolliert.'],
      bestaetigenText: 'Zurücknehmen',
    });
    if (!bestaetigt) {
      return;
    }
    await props.withBusy(async () => {
      const zurueckgenommen = await window.api.undoLastCommand(props.selectedEinsatzId);
      if (!zurueckgenommen) {
        props.setError('Es gibt nichts zurückzunehmen.');
      }
      setUndoMoeglich(await window.api.hasUndoableCommand(props.selectedEinsatzId));
      await props.refreshAll();
    });
  }, [confirm, props]);

  return { undoMoeglich, undoLast };
}
