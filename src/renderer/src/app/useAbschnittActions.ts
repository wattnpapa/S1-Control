import { readError } from '@renderer/utils/error';
import type { AbschnittNode } from '@shared/types';
import type { CreateAbschnittForm, EditAbschnittForm } from '@renderer/types/ui';
import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface UseAbschnittActionsProps {
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  isArchived: boolean;
  abschnitte: AbschnittNode[];
  selectedAbschnittLock?: { computerName: string; userName: string; isSelf: boolean };
  selectedAbschnittLockedByOther: boolean;
  createAbschnittForm: CreateAbschnittForm;
  editAbschnittForm: EditAbschnittForm;
  setError: (message: string | null) => void;
  setCreateAbschnittForm: Dispatch<SetStateAction<CreateAbschnittForm>>;
  setEditAbschnittForm: Dispatch<SetStateAction<EditAbschnittForm>>;
  setShowCreateAbschnittDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditAbschnittDialog: Dispatch<SetStateAction<boolean>>;
  acquireEditLock: (einsatzId: string, entityType: 'ABSCHNITT', entityId: string) => Promise<boolean>;
  releaseEditLock: (einsatzId: string, entityType: 'ABSCHNITT', entityId: string) => Promise<boolean>;
  loadEinsatz: (einsatzId: string, preferredAbschnittId?: string) => Promise<void>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Provides Abschnitt dialog lifecycle and create/update actions.
 */
export function useAbschnittActions(props: UseAbschnittActionsProps) {
  const closeEditDialog = useCallback(() => {
    const abschnittId = props.editAbschnittForm.abschnittId;
    props.setShowEditAbschnittDialog(false);
    if (!props.selectedEinsatzId || !abschnittId) {
      return;
    }
    void props.releaseEditLock(props.selectedEinsatzId, 'ABSCHNITT', abschnittId).catch(() => undefined);
  }, [props]);

  const openCreateDialog = useCallback(() => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    props.setCreateAbschnittForm({
      name: '',
      systemTyp: 'NORMAL',
      parentId: props.selectedAbschnittId || '',
    });
    props.setShowCreateAbschnittDialog(true);
  }, [props]);

  const openEditSelectedDialog = useCallback(() => {
    void (async () => {
      if (!props.selectedAbschnittId || !props.selectedEinsatzId || props.isArchived) {
        return;
      }
      if (props.selectedAbschnittLockedByOther) {
        props.setError(
          `Datensatz wird gerade von ${props.selectedAbschnittLock?.computerName} (${props.selectedAbschnittLock?.userName}) bearbeitet.`,
        );
        return;
      }
      const current = props.abschnitte.find((item) => item.id === props.selectedAbschnittId);
      if (!current) {
        props.setError('Abschnitt nicht gefunden.');
        return;
      }
      const acquired = await props.acquireEditLock(props.selectedEinsatzId, 'ABSCHNITT', props.selectedAbschnittId);
      if (!acquired) {
        return;
      }
      props.setEditAbschnittForm({
        abschnittId: current.id,
        name: current.name,
        systemTyp: current.systemTyp,
        parentId: current.parentId ?? '',
      });
      props.setShowEditAbschnittDialog(true);
    })().catch((err) => props.setError(readError(err)));
  }, [props]);

  const submitCreate = useCallback(async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    if (!props.createAbschnittForm.name.trim()) {
      props.setError('Bitte Namen für den Abschnitt eingeben.');
      return;
    }

    await props.withBusy(async () => {
      const created = await window.api.createAbschnitt({
        einsatzId: props.selectedEinsatzId,
        name: props.createAbschnittForm.name.trim(),
        systemTyp: props.createAbschnittForm.systemTyp,
        parentId: props.createAbschnittForm.parentId || null,
      });
      props.setShowCreateAbschnittDialog(false);
      await props.loadEinsatz(props.selectedEinsatzId, created.id);
    });
  }, [props]);

  const submitEdit = useCallback(async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    if (!props.editAbschnittForm.name.trim()) {
      props.setError('Bitte Namen für den Abschnitt eingeben.');
      return;
    }

    await props.withBusy(async () => {
      await window.api.updateAbschnitt({
        einsatzId: props.selectedEinsatzId,
        abschnittId: props.editAbschnittForm.abschnittId,
        name: props.editAbschnittForm.name.trim(),
        systemTyp: props.editAbschnittForm.systemTyp,
        parentId: props.editAbschnittForm.parentId || null,
      });
      await props.releaseEditLock(props.selectedEinsatzId, 'ABSCHNITT', props.editAbschnittForm.abschnittId);
      props.setShowEditAbschnittDialog(false);
      await props.loadEinsatz(props.selectedEinsatzId, props.editAbschnittForm.abschnittId);
    });
  }, [props]);

  return {
    closeEditDialog,
    openCreateDialog,
    openEditSelectedDialog,
    submitCreate,
    submitEdit,
  };
}
