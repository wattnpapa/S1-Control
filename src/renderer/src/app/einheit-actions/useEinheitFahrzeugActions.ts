import { useCallback } from 'react';
import type { EinheitFahrzeugInput, UseEinheitActionsProps } from './types';

/**
 * Provides create/update actions for vehicles that belong to an Einheit.
 */
export function useEinheitFahrzeugActions(props: UseEinheitActionsProps) {
  const createEinheitFahrzeug = useCallback(
    async (input: EinheitFahrzeugInput) => {
      if (!props.selectedEinsatzId || !props.editEinheitForm.einheitId || props.isArchived) {
        return;
      }
      if (!input.name.trim()) {
        props.setError('Bitte Fahrzeugname eingeben.');
        return;
      }
      await props.withBusy(async () => {
        await window.api.createFahrzeug({
          einsatzId: props.selectedEinsatzId,
          name: input.name.trim(),
          kennzeichen: input.kennzeichen.trim() || undefined,
          aktuelleEinsatzEinheitId: props.editEinheitForm.einheitId,
          status: input.status,
          funkrufname: input.funkrufname,
          stanKonform: input.stanKonform === 'UNBEKANNT' ? null : input.stanKonform === 'JA',
          sondergeraet: input.sondergeraet,
          nutzlast: input.nutzlast,
        });
        await props.refreshAll();
      });
    },
    [props],
  );

  const updateEinheitFahrzeug = useCallback(
    async (input: EinheitFahrzeugInput & { fahrzeugId: string }) => {
      if (!props.selectedEinsatzId || !props.editEinheitForm.einheitId || props.isArchived) {
        return;
      }
      if (!input.name.trim()) {
        props.setError('Bitte Fahrzeugname eingeben.');
        return;
      }
      await props.withBusy(async () => {
        const acquired = await props.acquireFahrzeugLock(props.selectedEinsatzId, input.fahrzeugId);
        if (!acquired) {
          return;
        }
        try {
          await window.api.updateFahrzeug({
            einsatzId: props.selectedEinsatzId,
            fahrzeugId: input.fahrzeugId,
            name: input.name.trim(),
            kennzeichen: input.kennzeichen.trim() || undefined,
            aktuelleEinsatzEinheitId: props.editEinheitForm.einheitId,
            status: input.status,
            funkrufname: input.funkrufname,
            stanKonform: input.stanKonform === 'UNBEKANNT' ? null : input.stanKonform === 'JA',
            sondergeraet: input.sondergeraet,
            nutzlast: input.nutzlast,
          });
          await props.refreshAll();
        } finally {
          await props.releaseFahrzeugLock(props.selectedEinsatzId, input.fahrzeugId);
        }
      });
    },
    [props],
  );

  return { createEinheitFahrzeug, updateEinheitFahrzeug };
}
