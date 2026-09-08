import { useCallback } from 'react';
import type { AbschnittDetails, ActiveClientInfo, EinheitHelfer } from '@shared/types';
import type { FahrzeugOverviewItem, KraftOverviewItem, TacticalStrength } from '@renderer/types/ui';

interface UseWorkspaceLifecycleOptions {
  selectedEinsatzId: string;
  editEinheitId: string;
  editFahrzeugId: string;
  setSelectedEinsatzId: (id: string) => void;
  setAbschnitte: (next: Awaited<ReturnType<typeof window.api.listAbschnitte>>) => void;
  setSelectedAbschnittId: (id: string) => void;
  setDetails: (next: AbschnittDetails) => void;
  setAllKraefte: (next: KraftOverviewItem[]) => void;
  setAllFahrzeuge: (next: FahrzeugOverviewItem[]) => void;
  setGesamtStaerke: (next: TacticalStrength) => void;
  setActiveClients: (next: ActiveClientInfo[]) => void;
  clearLocks: () => void;
  setShowEditEinheitDialog: (open: boolean) => void;
  setEditEinheitHelfer: (next: EinheitHelfer[]) => void;
  setShowEditFahrzeugDialog: (open: boolean) => void;
  releaseEditLock: (einsatzId: string, type: 'EINHEIT' | 'FAHRZEUG', entityId: string) => Promise<void>;
  emptyDetails: AbschnittDetails;
  emptyStrength: TacticalStrength;
}

/**
 * Provides lifecycle callbacks for clearing and closing editors.
 */
export function useWorkspaceLifecycle(options: UseWorkspaceLifecycleOptions) {
  const clearSelectedEinsatz = useCallback(() => {
    options.setSelectedEinsatzId('');
    options.setAbschnitte([]);
    options.setSelectedAbschnittId('');
    options.setDetails(options.emptyDetails);
    options.setAllKraefte([]);
    options.setAllFahrzeuge([]);
    options.setGesamtStaerke(options.emptyStrength);
    options.setActiveClients([]);
    options.clearLocks();
  }, [options]);

  const closeEditEinheitDialog = useCallback(() => {
    const einheitId = options.editEinheitId;
    options.setShowEditEinheitDialog(false);
    options.setEditEinheitHelfer([]);
    if (!options.selectedEinsatzId || !einheitId) {
      return;
    }
    void options.releaseEditLock(options.selectedEinsatzId, 'EINHEIT', einheitId).catch(() => undefined);
  }, [options]);

  const closeEditFahrzeugDialog = useCallback(() => {
    const fahrzeugId = options.editFahrzeugId;
    options.setShowEditFahrzeugDialog(false);
    if (!options.selectedEinsatzId || !fahrzeugId) {
      return;
    }
    void options.releaseEditLock(options.selectedEinsatzId, 'FAHRZEUG', fahrzeugId).catch(() => undefined);
  }, [options]);

  return {
    clearSelectedEinsatz,
    closeEditEinheitDialog,
    closeEditFahrzeugDialog,
  };
}
