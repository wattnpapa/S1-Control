import { readError } from '@renderer/utils/error';
import type { CreateFahrzeugForm, EditFahrzeugForm, FahrzeugOverviewItem, KraftOverviewItem } from '@renderer/types/ui';
import { useCallback } from 'react';
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
  const openCreateDialog = useCallback(() => {
    if (!props.selectedEinsatzId || !props.selectedAbschnittId || props.isArchived) {
      return;
    }
    if (props.allKraefte.length === 0) {
      props.setError('Bitte zuerst mindestens eine Einheit anlegen, bevor Fahrzeuge zugeordnet werden.');
      return;
    }
    props.setCreateFahrzeugForm({
      name: '',
      kennzeichen: '',
      status: 'AKTIV',
      einheitId: props.allKraefte[0]?.id ?? '',
      funkrufname: '',
      stanKonform: 'UNBEKANNT',
      sondergeraet: '',
      nutzlast: '',
    });
    props.setShowCreateFahrzeugDialog(true);
  }, [props]);

  const submitCreate = useCallback(async () => {
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
        stanKonform:
          props.createFahrzeugForm.stanKonform === 'UNBEKANNT'
            ? null
            : props.createFahrzeugForm.stanKonform === 'JA',
        sondergeraet: props.createFahrzeugForm.sondergeraet,
        nutzlast: props.createFahrzeugForm.nutzlast,
      });
      props.setShowCreateFahrzeugDialog(false);
      await props.refreshAll();
    });
  }, [props]);

  const openEditDialog = useCallback((fahrzeugId: string) => {
    void (async () => {
      if (!props.selectedEinsatzId || props.isArchived) {
        return;
      }
      props.closeEditEinheitDialog();
      const acquired = await props.acquireEditLock(props.selectedEinsatzId, 'FAHRZEUG', fahrzeugId);
      if (!acquired) {
        return;
      }
      const fahrzeug = props.allFahrzeuge.find((item) => item.id === fahrzeugId);
      if (!fahrzeug) {
        await props.releaseEditLock(props.selectedEinsatzId, 'FAHRZEUG', fahrzeugId);
        props.setError('Fahrzeug nicht gefunden.');
        return;
      }
      props.setEditFahrzeugForm({
        fahrzeugId,
        name: fahrzeug.name,
        kennzeichen: fahrzeug.kennzeichen ?? '',
        status: fahrzeug.status,
        einheitId: fahrzeug.aktuelleEinsatzEinheitId ?? '',
        funkrufname: fahrzeug.funkrufname ?? '',
        stanKonform: fahrzeug.stanKonform === null ? 'UNBEKANNT' : fahrzeug.stanKonform ? 'JA' : 'NEIN',
        sondergeraet: fahrzeug.sondergeraet ?? '',
        nutzlast: fahrzeug.nutzlast ?? '',
      });
      props.setShowEditEinheitDialog(false);
      props.setShowEditFahrzeugDialog(true);
    })().catch((err) => props.setError(readError(err)));
  }, [props]);

  const submitEdit = useCallback(async () => {
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
        stanKonform:
          props.editFahrzeugForm.stanKonform === 'UNBEKANNT'
            ? null
            : props.editFahrzeugForm.stanKonform === 'JA',
        sondergeraet: props.editFahrzeugForm.sondergeraet,
        nutzlast: props.editFahrzeugForm.nutzlast,
      });
      await props.releaseEditLock(props.selectedEinsatzId, 'FAHRZEUG', props.editFahrzeugForm.fahrzeugId);
      props.setShowEditFahrzeugDialog(false);
      await props.refreshAll();
    });
  }, [props]);

  return {
    openCreateDialog,
    submitCreate,
    openEditDialog,
    submitEdit,
  };
}
