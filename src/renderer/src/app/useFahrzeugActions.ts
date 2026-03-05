import { readError } from '@renderer/utils/error';
import type { CreateFahrzeugForm, EditFahrzeugForm, FahrzeugOverviewItem, KraftOverviewItem } from '@renderer/types/ui';
import type { Dispatch, SetStateAction } from 'react';

interface UseFahrzeugActionsProps {
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  isArchived: boolean;
  allKraefte: KraftOverviewItem[];
  allFahrzeuge: FahrzeugOverviewItem[];
  createFahrzeugForm: CreateFahrzeugForm;
  editFahrzeugForm: EditFahrzeugForm;
  setError: (message: string | null) => void;
  setCreateFahrzeugForm: Dispatch<SetStateAction<CreateFahrzeugForm>>;
  setEditFahrzeugForm: Dispatch<SetStateAction<EditFahrzeugForm>>;
  setShowCreateFahrzeugDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditEinheitDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditFahrzeugDialog: Dispatch<SetStateAction<boolean>>;
  closeEditEinheitDialog: () => void;
  acquireEditLock: (einsatzId: string, entityType: 'FAHRZEUG', entityId: string) => Promise<boolean>;
  releaseEditLock: (einsatzId: string, entityType: 'FAHRZEUG', entityId: string) => Promise<boolean>;
  refreshAll: () => Promise<void>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Provides create/edit/open/submit actions for Fahrzeuge.
 */
export function useFahrzeugActions(props: UseFahrzeugActionsProps) {
  const openCreateDialog = buildOpenCreateDialog(props);
  const submitCreate = buildSubmitCreate(props);
  const openEditDialog = buildOpenEditDialog(props);
  const submitEdit = buildSubmitEdit(props);

  return {
    openCreateDialog,
    submitCreate,
    openEditDialog,
    submitEdit,
  };
}

/**
 * Builds default form payload for a new vehicle.
 */
function initialCreateFahrzeugForm(firstEinheitId: string): CreateFahrzeugForm {
  return {
    name: '',
    kennzeichen: '',
    status: 'AKTIV',
    einheitId: firstEinheitId,
    funkrufname: '',
    stanKonform: 'UNBEKANNT',
    sondergeraet: '',
    nutzlast: '',
  };
}

/**
 * Maps a tri-state STAN value to API payload.
 */
function toStanKonformPayload(value: 'JA' | 'NEIN' | 'UNBEKANNT'): boolean | null {
  return value === 'UNBEKANNT' ? null : value === 'JA';
}

/**
 * Creates callback for opening the vehicle create dialog.
 */
function buildOpenCreateDialog(props: UseFahrzeugActionsProps) {
  return () => {
    if (!props.selectedEinsatzId || !props.selectedAbschnittId || props.isArchived) {
      return;
    }
    if (props.allKraefte.length === 0) {
      props.setError('Bitte zuerst mindestens eine Einheit anlegen, bevor Fahrzeuge zugeordnet werden.');
      return;
    }
    props.setCreateFahrzeugForm(initialCreateFahrzeugForm(props.allKraefte[0]?.id ?? ''));
    props.setShowCreateFahrzeugDialog(true);
  };
}

/**
 * Creates callback for submitting a new vehicle.
 */
function buildSubmitCreate(props: UseFahrzeugActionsProps) {
  return async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    if (!props.createFahrzeugForm.name.trim()) {
      props.setError('Bitte Fahrzeugname eingeben.');
      return;
    }
    if (!props.createFahrzeugForm.einheitId) {
      props.setError('Bitte zugeordnete Einheit auswählen.');
      return;
    }
    await props.withBusy(async () => {
      await window.api.createFahrzeug({
        einsatzId: props.selectedEinsatzId,
        name: props.createFahrzeugForm.name.trim(),
        kennzeichen: props.createFahrzeugForm.kennzeichen.trim() || undefined,
        aktuelleEinsatzEinheitId: props.createFahrzeugForm.einheitId,
        status: props.createFahrzeugForm.status,
        funkrufname: props.createFahrzeugForm.funkrufname,
        stanKonform: toStanKonformPayload(props.createFahrzeugForm.stanKonform),
        sondergeraet: props.createFahrzeugForm.sondergeraet,
        nutzlast: props.createFahrzeugForm.nutzlast,
      });
      props.setShowCreateFahrzeugDialog(false);
      await props.refreshAll();
    });
  };
}

/**
 * Creates callback for opening an existing vehicle in edit mode.
 */
function buildOpenEditDialog(props: UseFahrzeugActionsProps) {
  return (fahrzeugId: string) => {
    void openEditDialogAsync(props, fahrzeugId).catch((err) => props.setError(readError(err)));
  };
}

/**
 * Opens an existing vehicle and acquires edit lock if possible.
 */
async function openEditDialogAsync(props: UseFahrzeugActionsProps, fahrzeugId: string): Promise<void> {
  if (!props.selectedEinsatzId || props.isArchived) {
    return;
  }
  props.closeEditEinheitDialog();
  if (!(await props.acquireEditLock(props.selectedEinsatzId, 'FAHRZEUG', fahrzeugId))) {
    return;
  }
  const fahrzeug = resolveFahrzeugById(props.allFahrzeuge, fahrzeugId);
  if (!fahrzeug) {
    await handleMissingFahrzeug(props, fahrzeugId);
    return;
  }
  props.setEditFahrzeugForm(toEditFahrzeugForm(fahrzeug));
  props.setShowEditEinheitDialog(false);
  props.setShowEditFahrzeugDialog(true);
}

/**
 * Resolves one vehicle by id from overview list.
 */
function resolveFahrzeugById(allFahrzeuge: FahrzeugOverviewItem[], fahrzeugId: string): FahrzeugOverviewItem | undefined {
  return allFahrzeuge.find((item) => item.id === fahrzeugId);
}

/**
 * Handles not-found case while ensuring lock cleanup.
 */
async function handleMissingFahrzeug(props: UseFahrzeugActionsProps, fahrzeugId: string): Promise<void> {
  await props.releaseEditLock(props.selectedEinsatzId, 'FAHRZEUG', fahrzeugId);
  props.setError('Fahrzeug nicht gefunden.');
}

/**
 * Maps overview item to edit form payload.
 */
function toEditFahrzeugForm(fahrzeug: FahrzeugOverviewItem): EditFahrzeugForm {
  return {
    fahrzeugId: fahrzeug.id,
    name: fahrzeug.name,
    kennzeichen: fahrzeug.kennzeichen ?? '',
    status: fahrzeug.status,
    einheitId: fahrzeug.aktuelleEinsatzEinheitId ?? '',
    funkrufname: fahrzeug.funkrufname ?? '',
    stanKonform: fahrzeug.stanKonform === null ? 'UNBEKANNT' : fahrzeug.stanKonform ? 'JA' : 'NEIN',
    sondergeraet: fahrzeug.sondergeraet ?? '',
    nutzlast: fahrzeug.nutzlast ?? '',
  };
}

/**
 * Creates callback for submitting vehicle edits.
 */
function buildSubmitEdit(props: UseFahrzeugActionsProps) {
  return async () => {
    if (!props.selectedEinsatzId || props.isArchived) {
      return;
    }
    if (!props.editFahrzeugForm.name.trim()) {
      props.setError('Bitte Fahrzeugname eingeben.');
      return;
    }
    if (!props.editFahrzeugForm.einheitId) {
      props.setError('Bitte zugeordnete Einheit auswählen.');
      return;
    }
    await props.withBusy(async () => {
      await window.api.updateFahrzeug({
        einsatzId: props.selectedEinsatzId,
        fahrzeugId: props.editFahrzeugForm.fahrzeugId,
        name: props.editFahrzeugForm.name.trim(),
        kennzeichen: props.editFahrzeugForm.kennzeichen.trim() || undefined,
        status: props.editFahrzeugForm.status,
        aktuelleEinsatzEinheitId: props.editFahrzeugForm.einheitId,
        funkrufname: props.editFahrzeugForm.funkrufname,
        stanKonform: toStanKonformPayload(props.editFahrzeugForm.stanKonform),
        sondergeraet: props.editFahrzeugForm.sondergeraet,
        nutzlast: props.editFahrzeugForm.nutzlast,
      });
      await props.releaseEditLock(props.selectedEinsatzId, 'FAHRZEUG', props.editFahrzeugForm.fahrzeugId);
      props.setShowEditFahrzeugDialog(false);
      await props.refreshAll();
    });
  };
}
