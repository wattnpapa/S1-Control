import { useCallback } from 'react';
import type { HelferInput, UseEinheitActionsProps } from './types';

/**
 * Provides create/update/delete operations for Einheit helper rows.
 */
export function useEinheitHelferActions(props: UseEinheitActionsProps) {
  const reloadHelfer = useCallback(async () => {
    if (props.editEinheitForm.einheitId) {
      props.setEditEinheitHelfer(await window.api.listEinheitHelfer(props.editEinheitForm.einheitId));
    }
  }, [props]);

  const createHelfer = useCallback(
    async (input: HelferInput) => {
      if (!props.selectedEinsatzId || !props.editEinheitForm.einheitId || props.isArchived) {
        return;
      }
      await props.withBusy(async () => {
        await window.api.createEinheitHelfer({
          einsatzId: props.selectedEinsatzId,
          einsatzEinheitId: props.editEinheitForm.einheitId,
          name: input.name.trim(),
          rolle: input.rolle,
          geschlecht: input.geschlecht,
          anzahl: input.anzahl,
          funktion: input.funktion,
          telefon: input.telefon,
          erreichbarkeit: input.erreichbarkeit,
          vegetarisch: input.vegetarisch,
          bemerkung: input.bemerkung,
        });
        await reloadHelfer();
      });
    },
    [props, reloadHelfer],
  );

  const updateHelfer = useCallback(
    async (input: HelferInput & { helferId: string }) => {
      if (!props.selectedEinsatzId || props.isArchived) {
        return;
      }
      await props.withBusy(async () => {
        await window.api.updateEinheitHelfer({
          einsatzId: props.selectedEinsatzId,
          helferId: input.helferId,
          name: input.name.trim(),
          rolle: input.rolle,
          geschlecht: input.geschlecht,
          anzahl: input.anzahl,
          funktion: input.funktion,
          telefon: input.telefon,
          erreichbarkeit: input.erreichbarkeit,
          vegetarisch: input.vegetarisch,
          bemerkung: input.bemerkung,
        });
        await reloadHelfer();
      });
    },
    [props, reloadHelfer],
  );

  const deleteHelfer = useCallback(
    async (helferId: string) => {
      if (!props.selectedEinsatzId || props.isArchived) {
        return;
      }
      await props.withBusy(async () => {
        await window.api.deleteEinheitHelfer({ einsatzId: props.selectedEinsatzId, helferId });
        await reloadHelfer();
      });
    },
    [props, reloadHelfer],
  );

  return { createHelfer, updateHelfer, deleteHelfer };
}
