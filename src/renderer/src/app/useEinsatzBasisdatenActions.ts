import { readError } from '@renderer/utils/error';
import type { EditEinsatzForm } from '@renderer/types/ui';
import type { Dispatch, SetStateAction } from 'react';

interface UseEinsatzBasisdatenActionsProps {
  selectedEinsatzId: string;
  isArchived: boolean;
  editEinsatzForm: EditEinsatzForm;
  setEditEinsatzForm: Dispatch<SetStateAction<EditEinsatzForm>>;
  setShowEditEinsatzDialog: Dispatch<SetStateAction<boolean>>;
  currentEinsatzName: string;
  currentFuestName: string;
  setError: (message: string | null) => void;
  loadEinsatz: (
    einsatzId: string,
    preferredAbschnittId?: string,
    options?: { waitForFullOverview?: boolean },
  ) => Promise<void>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Provides Einsatz Basisdaten dialog lifecycle and update actions.
 */
export function useEinsatzBasisdatenActions(props: UseEinsatzBasisdatenActionsProps) {
  const openEditEinsatzDialog = buildOpenEditEinsatzDialog(props);
  const submitEditEinsatz = buildSubmitEditEinsatz(props);
  const closeEditEinsatzDialog = buildCloseEditEinsatzDialog(props);

  return {
    openEditEinsatzDialog,
    submitEditEinsatz,
    closeEditEinsatzDialog,
  };
}

/**
 * Creates callback for opening the Einsatz edit dialog.
 */
function buildOpenEditEinsatzDialog(props: UseEinsatzBasisdatenActionsProps) {
  return () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    props.setEditEinsatzForm({
      name: props.currentEinsatzName,
      fuestName: props.currentFuestName,
    });
    props.setShowEditEinsatzDialog(true);
  };
}

/**
 * Creates callback for saving Einsatz Basisdaten edits.
 */
function buildSubmitEditEinsatz(props: UseEinsatzBasisdatenActionsProps) {
  return async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    if (!props.editEinsatzForm.name.trim()) {
      props.setError('Bitte Namen für den Einsatz eingeben.');
      return;
    }
    await props.withBusy(async () => {
      await window.api.updateEinsatz({
        einsatzId: props.selectedEinsatzId,
        name: props.editEinsatzForm.name.trim(),
        fuestName: props.editEinsatzForm.fuestName.trim(),
      });
      props.setShowEditEinsatzDialog(false);
      await props.loadEinsatz(props.selectedEinsatzId);
    });
  };
}

/**
 * Creates callback for closing the Einsatz edit dialog.
 */
function buildCloseEditEinsatzDialog(props: UseEinsatzBasisdatenActionsProps) {
  return () => {
    props.setShowEditEinsatzDialog(false);
  };
}
