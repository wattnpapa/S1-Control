import { useCallback } from 'react';
import { useConfirm } from '@renderer/app/confirm-context';
import type { FahrzeugOverviewItem } from '@renderer/types/ui';

interface UseFahrzeugRemoveActionsProps {
  selectedEinsatzId: string;
  isArchived: boolean;
  allFahrzeuge: FahrzeugOverviewItem[];
  refreshCurrentEinsatz: (options?: { includeFullOverview?: boolean }) => Promise<void>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Nimmt Fahrzeuge aus dem Einsatz.
 */
export function useFahrzeugRemoveActions(props: UseFahrzeugRemoveActionsProps) {
  const confirm = useConfirm();

  const removeFahrzeug = useCallback(
    async (fahrzeugId: string) => {
      if (!props.selectedEinsatzId || props.isArchived) {
        return;
      }
      const fahrzeug = props.allFahrzeuge.find((eintrag) => eintrag.id === fahrzeugId);
      const bestaetigt = await confirm({
        titel: 'Fahrzeug aus dem Einsatz nehmen?',
        text: `${fahrzeug?.name ?? 'Das Fahrzeug'} wird aus der Lage genommen.`,
        folgen: ['Der Vorgang steht im Protokoll und lässt sich mit "Rückgängig" zurückholen.'],
        bestaetigenText: 'Entfernen',
        gefahr: true,
      });
      if (!bestaetigt) {
        return;
      }
      await props.withBusy(async () => {
        await window.api.removeFahrzeug({ einsatzId: props.selectedEinsatzId, fahrzeugId });
        await props.refreshCurrentEinsatz({ includeFullOverview: true });
      });
    },
    [confirm, props],
  );

  return { removeFahrzeug };
}
