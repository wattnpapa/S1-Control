import { useCallback } from 'react';
import { useConfirm } from '@renderer/app/confirm-context';
import type { UseEinheitActionsProps } from './types';

/**
 * Nimmt Einheiten aus dem Einsatz — der Korrekturweg für falsch angelegte
 * oder versehentlich aufgeteilte Einheiten.
 */
export function useEinheitRemoveActions(props: UseEinheitActionsProps) {
  const confirm = useConfirm();

  const removeEinheit = useCallback(
    async (einheitId: string) => {
      if (!props.selectedEinsatzId || props.isArchived) {
        return;
      }
      const einheit = props.allKraefte.find((eintrag) => eintrag.id === einheitId);
      const fahrzeuge = props.allFahrzeuge.filter(
        (fahrzeug) => fahrzeug.aktuelleEinsatzEinheitId === einheitId,
      ).length;
      const folgen = [
        'Die Einheit zählt danach nicht mehr zur Stärke.',
        'Der Vorgang steht im Protokoll und lässt sich mit "Rückgängig" zurückholen.',
      ];
      if (fahrzeuge > 0) {
        folgen.unshift(
          `Der Einheit sind noch ${fahrzeuge} Fahrzeug(e) zugeordnet — diese zuerst umhängen oder entfernen.`,
        );
      }
      const bestaetigt = await confirm({
        titel: 'Einheit aus dem Einsatz nehmen?',
        text: `${einheit?.nameImEinsatz ?? 'Die Einheit'} wird aus der Lage genommen.`,
        folgen,
        bestaetigenText: 'Entfernen',
        gefahr: true,
      });
      if (!bestaetigt) {
        return;
      }
      await props.withBusy(async () => {
        await window.api.removeEinheit({ einsatzId: props.selectedEinsatzId, einheitId });
        await props.refreshCurrentEinsatz({ includeFullOverview: true });
      });
    },
    [confirm, props],
  );

  return { removeEinheit };
}
