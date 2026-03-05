import { useCallback } from 'react';
import { parseAndValidateStrength } from './types';
import type { UseEinheitActionsProps } from './types';

/**
 * Provides split dialog open/submit actions for Einheiten.
 */
export function useEinheitSplitActions(props: UseEinheitActionsProps) {
  const openSplitDialog = useCallback(
    (sourceEinheitId: string) => {
      const source = props.allKraefte.find((einheit) => einheit.id === sourceEinheitId);
      props.setSplitEinheitForm({
        sourceEinheitId,
        nameImEinsatz: source ? `${source.nameImEinsatz} - Teil 1` : '',
        organisation: source?.organisation ?? 'THW',
        fuehrung: '0',
        unterfuehrung: '0',
        mannschaft: '1',
        status: source?.status ?? 'AKTIV',
      });
      props.setShowSplitEinheitDialog(true);
    },
    [props],
  );

  const submitSplit = useCallback(async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    if (!props.splitEinheitForm.sourceEinheitId) {
      props.setError('Bitte Quell-Einheit wählen.');
      return;
    }
    if (!props.splitEinheitForm.nameImEinsatz.trim()) {
      props.setError('Bitte Namen für die Teileinheit eingeben.');
      return;
    }
    const parsed = parseAndValidateStrength(props.setError, {
      fuehrungRaw: props.splitEinheitForm.fuehrung,
      unterfuehrungRaw: props.splitEinheitForm.unterfuehrung,
      mannschaftRaw: props.splitEinheitForm.mannschaft,
      errorMessage: 'Split-Stärke muss aus Zahlen >= 0 bestehen.',
    });
    if (!parsed) {
      return;
    }
    await props.withBusy(async () => {
      await window.api.splitEinheit({
        einsatzId: props.selectedEinsatzId,
        sourceEinheitId: props.splitEinheitForm.sourceEinheitId,
        nameImEinsatz: props.splitEinheitForm.nameImEinsatz.trim(),
        organisation: props.splitEinheitForm.organisation,
        fuehrung: parsed.fuehrung,
        unterfuehrung: parsed.unterfuehrung,
        mannschaft: parsed.mannschaft,
        status: props.splitEinheitForm.status,
      });
      props.setShowSplitEinheitDialog(false);
      await props.refreshAll();
    });
  }, [props]);

  return { openSplitDialog, submitSplit };
}
