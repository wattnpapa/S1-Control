import { useCallback } from 'react';
import { useConfirm } from '@renderer/app/confirm-context';
import { readError } from '@renderer/utils/error';
import type { AbschnittNode } from '@shared/types';
import type {
  CreateAbschnittForm,
  EditAbschnittForm,
} from '@renderer/types/ui';
import type { Dispatch, SetStateAction } from 'react';

interface UseAbschnittActionsProps {
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  isArchived: boolean;
  abschnitte: AbschnittNode[];
  selectedAbschnittLock?: {
    computerName: string;
    userName: string;
    isSelf: boolean;
  };
  selectedAbschnittLockedByOther: boolean;
  createAbschnittForm: CreateAbschnittForm;
  editAbschnittForm: EditAbschnittForm;
  setError: (message: string | null) => void;
  setCreateAbschnittForm: Dispatch<SetStateAction<CreateAbschnittForm>>;
  setEditAbschnittForm: Dispatch<SetStateAction<EditAbschnittForm>>;
  setShowCreateAbschnittDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditAbschnittDialog: Dispatch<SetStateAction<boolean>>;
  acquireEditLock: (
    einsatzId: string,
    entityType: 'ABSCHNITT',
    entityId: string,
  ) => Promise<boolean>;
  releaseEditLock: (
    einsatzId: string,
    entityType: 'ABSCHNITT',
    entityId: string,
  ) => Promise<unknown>;
  loadEinsatz: (
    einsatzId: string,
    preferredAbschnittId?: string,
    options?: { waitForFullOverview?: boolean },
  ) => Promise<void>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Provides Abschnitt dialog lifecycle and create/update actions.
 */
export function useAbschnittActions(props: UseAbschnittActionsProps) {
  const closeEditDialog = buildCloseEditDialog(props);
  const openCreateDialog = buildOpenCreateDialog(props);
  const openEditSelectedDialog = buildOpenEditSelectedDialog(props);
  const openEditDialog = buildOpenEditDialog(props);
  const submitCreate = buildSubmitCreate(props);
  const submitEdit = useSubmitEditMitRueckfrage(props);
  const removeAbschnitt = useRemoveAbschnitt(props);

  return {
    removeAbschnitt,
    closeEditDialog,
    openCreateDialog,
    openEditSelectedDialog,
    openEditDialog,
    submitCreate,
    submitEdit,
  };
}

/**
 * Speichert Änderungen an einem Abschnitt. Umhängen und Typwechsel wirken auf
 * den ganzen Teilbaum und werden deshalb vorher benannt.
 */
function useSubmitEditMitRueckfrage(props: UseAbschnittActionsProps) {
  const confirm = useConfirm();
  const speichern = buildSubmitEdit(props);
  return useCallback(async () => {
    const abschnittId = props.editAbschnittForm.abschnittId;
    const vorher = props.abschnitte.find((eintrag) => eintrag.id === abschnittId);
    const neuerParent = props.editAbschnittForm.parentId || null;
    const parentWechsel = Boolean(vorher) && (vorher?.parentId ?? null) !== neuerParent;
    const typWechsel = Boolean(vorher) && vorher?.systemTyp !== props.editAbschnittForm.systemTyp;

    if (parentWechsel || typWechsel) {
      const kinder = props.abschnitte.filter((eintrag) => eintrag.parentId === abschnittId).length;
      const folgen: string[] = [];
      if (parentWechsel && kinder > 0) {
        folgen.push(`${kinder} Unterabschnitt(e) wandern mit.`);
      }
      if (typWechsel && props.editAbschnittForm.systemTyp === 'ANFAHRT') {
        folgen.push('Kräfte in diesem Abschnitt zählen danach nicht mehr zur gemeldeten Stärke.');
      }
      if (typWechsel && vorher?.systemTyp === 'ANFAHRT') {
        folgen.push('Kräfte in diesem Abschnitt zählen danach zur gemeldeten Stärke.');
      }
      const bestaetigt = await confirm({
        titel: 'Abschnitt umhängen?',
        text: `Die Gliederung unter "${vorher?.name ?? ''}" ändert sich.`,
        folgen: folgen.length > 0 ? folgen : undefined,
        bestaetigenText: 'Übernehmen',
      });
      if (!bestaetigt) {
        return;
      }
    }
    await speichern();
  }, [confirm, props, speichern]);
}

/**
 * Entfernt einen leeren Abschnitt nach Rückfrage.
 */
function useRemoveAbschnitt(props: UseAbschnittActionsProps) {
  const confirm = useConfirm();
  return useCallback(async () => {
    const abschnittId = props.editAbschnittForm.abschnittId;
    if (!props.selectedEinsatzId || !abschnittId || props.isArchived) {
      return;
    }
    const abschnitt = props.abschnitte.find((eintrag) => eintrag.id === abschnittId);
    const bestaetigt = await confirm({
      titel: 'Abschnitt entfernen?',
      text: `Der Abschnitt "${abschnitt?.name ?? ''}" wird aus der Gliederung genommen.`,
      folgen: [
        'Das geht nur, solange der Abschnitt keine Kräfte, Fahrzeuge oder Unterabschnitte trägt.',
        'Der Vorgang steht im Protokoll und lässt sich mit "Rückgängig" zurückholen.',
      ],
      bestaetigenText: 'Entfernen',
      gefahr: true,
    });
    if (!bestaetigt) {
      return;
    }
    await props.withBusy(async () => {
      try {
        await window.api.removeAbschnitt({ einsatzId: props.selectedEinsatzId, abschnittId });
        props.setShowEditAbschnittDialog(false);
        await props.loadEinsatz(props.selectedEinsatzId);
      } catch (error) {
        props.setError(readError(error));
      }
    });
  }, [confirm, props]);
}

/**
 * Creates callback for closing the Abschnitt edit dialog and releasing lock.
 */
function buildCloseEditDialog(props: UseAbschnittActionsProps) {
  return () => {
    const abschnittId = props.editAbschnittForm.abschnittId;
    props.setShowEditAbschnittDialog(false);
    if (!props.selectedEinsatzId || !abschnittId) {
      return;
    }
    void props
      .releaseEditLock(props.selectedEinsatzId, 'ABSCHNITT', abschnittId)
      .catch(() => undefined);
  };
}

/**
 * Creates callback for opening Abschnitt create dialog.
 */
function buildOpenCreateDialog(props: UseAbschnittActionsProps) {
  return () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    props.setCreateAbschnittForm({
      name: '',
      systemTyp: 'NORMAL',
      parentId: props.selectedAbschnittId || '',
    });
    props.setShowCreateAbschnittDialog(true);
  };
}

/**
 * Creates callback for opening edit dialog for selected Abschnitt.
 */
function buildOpenEditSelectedDialog(props: UseAbschnittActionsProps) {
  return () => {
    void openEditSelectedDialogAsync(props).catch((err) =>
      props.setError(readError(err)),
    );
  };
}

/**
 * Creates callback for opening edit dialog for a specific Abschnitt by ID.
 */
function buildOpenEditDialog(props: UseAbschnittActionsProps) {
  return (abschnittId: string) => {
    void openEditDialogAsync(props, abschnittId).catch((err) =>
      props.setError(readError(err)),
    );
  };
}

/**
 * Opens a specific Abschnitt in edit mode after lock acquisition.
 */
async function openEditDialogAsync(
  props: UseAbschnittActionsProps,
  abschnittId: string,
): Promise<void> {
  if (!abschnittId || !props.selectedEinsatzId || props.isArchived) {
    return;
  }
  const current = props.abschnitte.find((item) => item.id === abschnittId);
  if (!current) {
    props.setError('Abschnitt nicht gefunden.');
    return;
  }
  const acquired = await props.acquireEditLock(
    props.selectedEinsatzId,
    'ABSCHNITT',
    abschnittId,
  );
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
}

/**
 * Opens selected Abschnitt in edit mode after lock acquisition.
 */
async function openEditSelectedDialogAsync(
  props: UseAbschnittActionsProps,
): Promise<void> {
  if (
    !props.selectedAbschnittId ||
    !props.selectedEinsatzId ||
    props.isArchived
  ) {
    return;
  }
  if (props.selectedAbschnittLockedByOther) {
    props.setError(
      `Datensatz wird gerade von ${props.selectedAbschnittLock?.computerName} (${props.selectedAbschnittLock?.userName}) bearbeitet.`,
    );
    return;
  }
  const current = props.abschnitte.find(
    (item) => item.id === props.selectedAbschnittId,
  );
  if (!current) {
    props.setError('Abschnitt nicht gefunden.');
    return;
  }
  const acquired = await props.acquireEditLock(
    props.selectedEinsatzId,
    'ABSCHNITT',
    props.selectedAbschnittId,
  );
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
}

/**
 * Creates callback for creating a new Abschnitt.
 */
function buildSubmitCreate(props: UseAbschnittActionsProps) {
  return async () => {
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
      // Der gewählte Abschnitt bleibt stehen: mitten in der Kräfteerfassung
      // in einen neuen, leeren Abschnitt zu springen kostet den Faden.
      await props.loadEinsatz(props.selectedEinsatzId, props.selectedAbschnittId || created.id);
    });
  };
}

/**
 * Creates callback for saving selected Abschnitt edits.
 */
function buildSubmitEdit(props: UseAbschnittActionsProps) {
  return async () => {
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
      await props.releaseEditLock(
        props.selectedEinsatzId,
        'ABSCHNITT',
        props.editAbschnittForm.abschnittId,
      );
      props.setShowEditAbschnittDialog(false);
      await props.loadEinsatz(
        props.selectedEinsatzId,
        props.editAbschnittForm.abschnittId,
      );
    });
  };
}
