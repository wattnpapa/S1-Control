import { useAbschnittActions } from '@renderer/app/useAbschnittActions';
import { useEinheitActions } from '@renderer/app/useEinheitActions';
import { useFahrzeugActions } from '@renderer/app/useFahrzeugActions';
import type { EinheitHelfer } from '@shared/types';
import type { Dispatch, SetStateAction } from 'react';
import type {
  CreateAbschnittForm,
  CreateEinheitForm,
  CreateFahrzeugForm,
  EditAbschnittForm,
  EditEinheitForm,
  EditFahrzeugForm,
  FahrzeugOverviewItem,
  KraftOverviewItem,
  SplitEinheitForm,
} from '@renderer/types/ui';

interface UseEntityActionsBundleOptions {
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  isArchived: boolean;
  abschnitte: Awaited<ReturnType<typeof window.api.listAbschnitte>>;
  selectedAbschnittLock: { isSelf: boolean; computerName: string; userName: string } | undefined;
  selectedAbschnittLockedByOther: boolean;
  createAbschnittForm: CreateAbschnittForm;
  editAbschnittForm: EditAbschnittForm;
  setCreateAbschnittForm: Dispatch<SetStateAction<CreateAbschnittForm>>;
  setEditAbschnittForm: Dispatch<SetStateAction<EditAbschnittForm>>;
  setShowCreateAbschnittDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditAbschnittDialog: Dispatch<SetStateAction<boolean>>;
  allKraefte: KraftOverviewItem[];
  allFahrzeuge: FahrzeugOverviewItem[];
  createFahrzeugForm: CreateFahrzeugForm;
  editFahrzeugForm: EditFahrzeugForm;
  setCreateFahrzeugForm: Dispatch<SetStateAction<CreateFahrzeugForm>>;
  setEditFahrzeugForm: Dispatch<SetStateAction<EditFahrzeugForm>>;
  setShowCreateFahrzeugDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditEinheitDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditFahrzeugDialog: Dispatch<SetStateAction<boolean>>;
  closeEditEinheitDialog: () => void;
  createEinheitForm: CreateEinheitForm;
  editEinheitForm: EditEinheitForm;
  splitEinheitForm: SplitEinheitForm;
  editEinheitHelfer: EinheitHelfer[];
  setCreateEinheitForm: Dispatch<SetStateAction<CreateEinheitForm>>;
  setEditEinheitForm: Dispatch<SetStateAction<EditEinheitForm>>;
  setSplitEinheitForm: Dispatch<SetStateAction<SplitEinheitForm>>;
  setEditEinheitHelfer: Dispatch<SetStateAction<EinheitHelfer[]>>;
  setShowCreateEinheitDialog: Dispatch<SetStateAction<boolean>>;
  setShowSplitEinheitDialog: Dispatch<SetStateAction<boolean>>;
  closeEditFahrzeugDialog: () => void;
  setError: Dispatch<SetStateAction<string | null>>;
  acquireEditLock: (einsatzId: string, entityType: 'ABSCHNITT' | 'EINHEIT' | 'FAHRZEUG', entityId: string) => Promise<boolean>;
  releaseEditLock: (einsatzId: string, entityType: 'ABSCHNITT' | 'EINHEIT' | 'FAHRZEUG', entityId: string) => Promise<void>;
  loadEinsatz: (einsatzId: string, preferredAbschnittId?: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Composes Abschnitt-, Einheit- and Fahrzeug-actions with shared dependencies.
 */
export function useEntityActionsBundle(options: UseEntityActionsBundleOptions) {
  const abschnittActions = useAbschnittActions(createAbschnittActionsProps(options));
  const fahrzeugActions = useFahrzeugActions(createFahrzeugActionsProps(options));
  const einheitActions = useEinheitActions(createEinheitActionsProps(options));

  return {
    abschnittActions,
    fahrzeugActions,
    einheitActions,
  };
}

/**
 * Builds props object for Abschnitt action hook.
 */
function createAbschnittActionsProps(options: UseEntityActionsBundleOptions) {
  return {
    selectedEinsatzId: options.selectedEinsatzId,
    selectedAbschnittId: options.selectedAbschnittId,
    isArchived: options.isArchived,
    abschnitte: options.abschnitte,
    selectedAbschnittLock: options.selectedAbschnittLock,
    selectedAbschnittLockedByOther: options.selectedAbschnittLockedByOther,
    createAbschnittForm: options.createAbschnittForm,
    editAbschnittForm: options.editAbschnittForm,
    setError: options.setError,
    setCreateAbschnittForm: options.setCreateAbschnittForm,
    setEditAbschnittForm: options.setEditAbschnittForm,
    setShowCreateAbschnittDialog: options.setShowCreateAbschnittDialog,
    setShowEditAbschnittDialog: options.setShowEditAbschnittDialog,
    acquireEditLock: async (einsatzId: string, _entityType: 'ABSCHNITT', entityId: string) =>
      options.acquireEditLock(einsatzId, 'ABSCHNITT', entityId),
    releaseEditLock: async (einsatzId: string, _entityType: 'ABSCHNITT', entityId: string) =>
      options.releaseEditLock(einsatzId, 'ABSCHNITT', entityId),
    loadEinsatz: options.loadEinsatz,
    withBusy: options.withBusy,
  };
}

/**
 * Builds props object for Fahrzeug action hook.
 */
function createFahrzeugActionsProps(options: UseEntityActionsBundleOptions) {
  return {
    selectedEinsatzId: options.selectedEinsatzId,
    selectedAbschnittId: options.selectedAbschnittId,
    isArchived: options.isArchived,
    allKraefte: options.allKraefte,
    allFahrzeuge: options.allFahrzeuge,
    createFahrzeugForm: options.createFahrzeugForm,
    editFahrzeugForm: options.editFahrzeugForm,
    setError: options.setError,
    setCreateFahrzeugForm: options.setCreateFahrzeugForm,
    setEditFahrzeugForm: options.setEditFahrzeugForm,
    setShowCreateFahrzeugDialog: options.setShowCreateFahrzeugDialog,
    setShowEditEinheitDialog: options.setShowEditEinheitDialog,
    setShowEditFahrzeugDialog: options.setShowEditFahrzeugDialog,
    closeEditEinheitDialog: options.closeEditEinheitDialog,
    acquireEditLock: async (einsatzId: string, _entityType: 'FAHRZEUG', entityId: string) =>
      options.acquireEditLock(einsatzId, 'FAHRZEUG', entityId),
    releaseEditLock: async (einsatzId: string, _entityType: 'FAHRZEUG', entityId: string) =>
      options.releaseEditLock(einsatzId, 'FAHRZEUG', entityId),
    refreshAll: options.refreshAll,
    withBusy: options.withBusy,
  };
}

/**
 * Builds props object for Einheit action hook.
 */
function createEinheitActionsProps(options: UseEntityActionsBundleOptions) {
  return {
    selectedEinsatzId: options.selectedEinsatzId,
    selectedAbschnittId: options.selectedAbschnittId,
    isArchived: options.isArchived,
    allKraefte: options.allKraefte,
    allFahrzeuge: options.allFahrzeuge,
    createEinheitForm: options.createEinheitForm,
    editEinheitForm: options.editEinheitForm,
    splitEinheitForm: options.splitEinheitForm,
    editEinheitHelfer: options.editEinheitHelfer,
    setError: options.setError,
    setCreateEinheitForm: options.setCreateEinheitForm,
    setEditEinheitForm: options.setEditEinheitForm,
    setSplitEinheitForm: options.setSplitEinheitForm,
    setEditEinheitHelfer: options.setEditEinheitHelfer,
    setShowCreateEinheitDialog: options.setShowCreateEinheitDialog,
    setShowEditEinheitDialog: options.setShowEditEinheitDialog,
    setShowEditFahrzeugDialog: options.setShowEditFahrzeugDialog,
    setShowSplitEinheitDialog: options.setShowSplitEinheitDialog,
    closeEditEinheitDialog: options.closeEditEinheitDialog,
    closeEditFahrzeugDialog: options.closeEditFahrzeugDialog,
    acquireEinheitLock: async (einsatzId: string, einheitId: string) =>
      options.acquireEditLock(einsatzId, 'EINHEIT', einheitId),
    releaseEinheitLock: async (einsatzId: string, einheitId: string) =>
      options.releaseEditLock(einsatzId, 'EINHEIT', einheitId),
    acquireFahrzeugLock: async (einsatzId: string, fahrzeugId: string) =>
      options.acquireEditLock(einsatzId, 'FAHRZEUG', fahrzeugId),
    releaseFahrzeugLock: async (einsatzId: string, fahrzeugId: string) =>
      options.releaseEditLock(einsatzId, 'FAHRZEUG', fahrzeugId),
    refreshAll: options.refreshAll,
    withBusy: options.withBusy,
  };
}
