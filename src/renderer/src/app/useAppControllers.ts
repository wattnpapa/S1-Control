import { EMPTY_DETAILS, EMPTY_STRENGTH } from '@renderer/app/defaultState';
import { useEditLocks } from '@renderer/app/useEditLocks';
import { useEinsatzData } from '@renderer/app/useEinsatzData';
import { useEntityActionsBundle } from '@renderer/app/useEntityActionsBundle';
import { useStartActions } from '@renderer/app/useStartActions';
import { useSyncEvents } from '@renderer/app/useSyncEvents';
import { useSystemActions } from '@renderer/app/useSystemActions';
import { useWorkspaceDerivedState } from '@renderer/app/useWorkspaceDerivedState';
import { useWorkspaceLifecycle } from '@renderer/app/useWorkspaceLifecycle';
import type { WorkspaceUiState } from '@renderer/app/useWorkspaceUiState';
import { readError } from '@renderer/utils/error';
import { useAppCoreState } from '@renderer/app/useAppCoreState';

interface UseAppControllersParams {
  rootState: ReturnType<typeof useAppCoreState>;
  uiState: WorkspaceUiState;
  selectedAbschnittId: string;
  setSelectedAbschnittId: (value: string) => void;
}

/**
 * Creates shared busy/error wrapper used by async renderer actions.
 */
function createWithBusy(rootState: ReturnType<typeof useAppCoreState>) {
  return async (fn: () => Promise<void>) => {
    rootState.setBusy(true);
    rootState.setError(null);
    try {
      await fn();
    } catch (err) {
      rootState.setError(readError(err));
    } finally {
      rootState.setBusy(false);
    }
  };
}

/**
 * Builds lock maps and derived workspace state.
 */
function useLockAndDerivedState(params: UseAppControllersParams) {
  const { rootState, selectedAbschnittId, uiState } = params;
  const lockState = useEditLocks({
    sessionActive: Boolean(rootState.session),
    selectedEinsatzId: rootState.selectedEinsatzId,
    onError: rootState.setError,
  });
  const derivedState = useWorkspaceDerivedState({
    einsaetze: rootState.einsaetze,
    selectedEinsatzId: rootState.selectedEinsatzId,
    selectedAbschnittId,
    debugSyncLogs: uiState.debugSyncLogs,
    lockByAbschnittId: lockState.lockByAbschnittId,
    activeView: uiState.activeView,
  });
  return { ...lockState, derivedState };
}

/**
 * Builds lifecycle reset handlers and data loaders.
 */
function useLifecycleAndDataState(
  params: UseAppControllersParams,
  lockState: ReturnType<typeof useLockAndDerivedState>,
) {
  const { rootState, setSelectedAbschnittId, selectedAbschnittId, uiState } = params;
  const lifecycleState = useWorkspaceLifecycle({
    selectedEinsatzId: rootState.selectedEinsatzId,
    editEinheitId: uiState.editEinheitForm.einheitId,
    editFahrzeugId: uiState.editFahrzeugForm.fahrzeugId,
    setSelectedEinsatzId: rootState.setSelectedEinsatzId,
    setAbschnitte: rootState.setAbschnitte,
    setSelectedAbschnittId,
    setDetails: rootState.setDetails,
    setAllKraefte: rootState.setAllKraefte,
    setAllFahrzeuge: rootState.setAllFahrzeuge,
    setGesamtStaerke: uiState.setGesamtStaerke,
    setActiveClients: uiState.setActiveClients,
    clearLocks: lockState.clearLocks,
    setShowEditEinheitDialog: uiState.setShowEditEinheitDialog,
    setEditEinheitHelfer: uiState.setEditEinheitHelfer,
    setShowEditFahrzeugDialog: uiState.setShowEditFahrzeugDialog,
    releaseEditLock: async (einsatzId, type, entityId) => lockState.releaseEditLock(einsatzId, type, entityId),
    emptyDetails: EMPTY_DETAILS,
    emptyStrength: EMPTY_STRENGTH,
  });
  const dataState = useEinsatzData({
    selectedEinsatzId: rootState.selectedEinsatzId,
    selectedAbschnittId,
    setEinsaetze: rootState.setEinsaetze,
    setAbschnitte: rootState.setAbschnitte,
    setSelectedAbschnittId,
    setDetails: rootState.setDetails,
    setAllKraefte: rootState.setAllKraefte,
    setAllFahrzeuge: rootState.setAllFahrzeuge,
    setGesamtStaerke: uiState.setGesamtStaerke,
    clearSelectedEinsatz: lifecycleState.clearSelectedEinsatz,
    refreshEditLocks: lockState.refreshEditLocks,
    emptyDetails: EMPTY_DETAILS,
    emptyStrength: EMPTY_STRENGTH,
  });
  return { ...lifecycleState, ...dataState };
}

/**
 * Registers runtime sync effects.
 */
function useRuntimeSync(
  params: UseAppControllersParams,
  dataState: ReturnType<typeof useLifecycleAndDataState>,
  withBusy: (fn: () => Promise<void>) => Promise<void>,
) {
  const { rootState, selectedAbschnittId, uiState } = params;
  useSyncEvents({
    session: rootState.session,
    authReady: rootState.authReady,
    busy: rootState.busy,
    activeView: uiState.activeView,
    selectedEinsatzId: rootState.selectedEinsatzId,
    selectedAbschnittId,
    queuedOpenFilePath: uiState.queuedOpenFilePath,
    setQueuedOpenFilePath: uiState.setQueuedOpenFilePath,
    setError: rootState.setError,
    setDetails: rootState.setDetails,
    setActiveClients: uiState.setActiveClients,
    setDbPath: rootState.setDbPath,
    setLanPeerUpdatesEnabled: rootState.setLanPeerUpdatesEnabled,
    setPeerUpdateStatus: uiState.setPeerUpdateStatus,
    setDebugSyncLogs: uiState.setDebugSyncLogs,
    setEinsaetze: rootState.setEinsaetze,
    setSelectedEinsatzId: rootState.setSelectedEinsatzId,
    setStartChoice: uiState.setStartChoice,
    loadEinsatz: dataState.loadEinsatz,
    refreshAll: dataState.refreshAll,
    withBusy,
  });
}

/**
 * Creates start and system action groups.
 */
function useStartAndSystemActions(
  params: UseAppControllersParams,
  dataState: ReturnType<typeof useLifecycleAndDataState>,
  withBusy: (fn: () => Promise<void>) => Promise<void>,
) {
  const { rootState, selectedAbschnittId, uiState } = params;
  const startActions = useStartActions({
    startNewEinsatzName: uiState.startNewEinsatzName,
    startNewFuestName: uiState.startNewFuestName,
    setError: rootState.setError,
    setEinsaetze: rootState.setEinsaetze,
    setSelectedEinsatzId: rootState.setSelectedEinsatzId,
    setStartNewEinsatzName: uiState.setStartNewEinsatzName,
    setStartChoice: uiState.setStartChoice,
    loadEinsatz: dataState.loadEinsatz,
    withBusy,
  });
  const systemActions = useSystemActions({
    dbPath: rootState.dbPath,
    selectedEinsatzId: rootState.selectedEinsatzId,
    selectedAbschnittId,
    moveDialog: uiState.moveDialog,
    moveTarget: uiState.moveTarget,
    gesamtStaerke: uiState.gesamtStaerke,
    setLanPeerUpdatesEnabled: rootState.setLanPeerUpdatesEnabled,
    setDbPath: rootState.setDbPath,
    setPeerUpdateStatus: uiState.setPeerUpdateStatus,
    clearSelectedEinsatz: dataState.clearSelectedEinsatz,
    refreshEinsaetze: dataState.refreshEinsaetze,
    loadEinsatz: dataState.loadEinsatz,
    refreshAll: dataState.refreshAll,
    setError: rootState.setError,
    setMoveDialog: uiState.setMoveDialog,
    setMoveTarget: uiState.setMoveTarget,
    withBusy,
  });
  return { startActions, systemActions };
}

/**
 * Creates Abschnitt/Einheit/Fahrzeug action groups.
 */
function useEntityActions(
  params: UseAppControllersParams,
  lockState: ReturnType<typeof useLockAndDerivedState>,
  dataState: ReturnType<typeof useLifecycleAndDataState>,
  withBusy: (fn: () => Promise<void>) => Promise<void>,
) {
  const { rootState, selectedAbschnittId, uiState } = params;
  return useEntityActionsBundle({
    selectedEinsatzId: rootState.selectedEinsatzId,
    selectedAbschnittId,
    isArchived: Boolean(lockState.derivedState.isArchived),
    abschnitte: rootState.abschnitte,
    selectedAbschnittLock: lockState.derivedState.selectedAbschnittLock,
    selectedAbschnittLockedByOther: lockState.derivedState.selectedAbschnittLockedByOther,
    createAbschnittForm: uiState.createAbschnittForm,
    editAbschnittForm: uiState.editAbschnittForm,
    setCreateAbschnittForm: uiState.setCreateAbschnittForm,
    setEditAbschnittForm: uiState.setEditAbschnittForm,
    setShowCreateAbschnittDialog: uiState.setShowCreateAbschnittDialog,
    setShowEditAbschnittDialog: uiState.setShowEditAbschnittDialog,
    allKraefte: rootState.allKraefte,
    allFahrzeuge: rootState.allFahrzeuge,
    createFahrzeugForm: uiState.createFahrzeugForm,
    editFahrzeugForm: uiState.editFahrzeugForm,
    setCreateFahrzeugForm: uiState.setCreateFahrzeugForm,
    setEditFahrzeugForm: uiState.setEditFahrzeugForm,
    setShowCreateFahrzeugDialog: uiState.setShowCreateFahrzeugDialog,
    setShowEditEinheitDialog: uiState.setShowEditEinheitDialog,
    setShowEditFahrzeugDialog: uiState.setShowEditFahrzeugDialog,
    closeEditEinheitDialog: dataState.closeEditEinheitDialog,
    createEinheitForm: uiState.createEinheitForm,
    editEinheitForm: uiState.editEinheitForm,
    splitEinheitForm: uiState.splitEinheitForm,
    editEinheitHelfer: uiState.editEinheitHelfer,
    setCreateEinheitForm: uiState.setCreateEinheitForm,
    setEditEinheitForm: uiState.setEditEinheitForm,
    setSplitEinheitForm: uiState.setSplitEinheitForm,
    setEditEinheitHelfer: uiState.setEditEinheitHelfer,
    setShowCreateEinheitDialog: uiState.setShowCreateEinheitDialog,
    setShowSplitEinheitDialog: uiState.setShowSplitEinheitDialog,
    closeEditFahrzeugDialog: dataState.closeEditFahrzeugDialog,
    setError: rootState.setError,
    acquireEditLock: lockState.acquireEditLock,
    releaseEditLock: lockState.releaseEditLock,
    loadEinsatz: dataState.loadEinsatz,
    refreshAll: dataState.refreshAll,
    withBusy,
  });
}

/**
 * Composes derived state and action hooks used by the root app view model.
 */
export function useAppControllers(params: UseAppControllersParams) {
  const lockState = useLockAndDerivedState(params);
  const dataState = useLifecycleAndDataState(params, lockState);
  const withBusy = createWithBusy(params.rootState);
  useRuntimeSync(params, dataState, withBusy);
  const { startActions, systemActions } = useStartAndSystemActions(params, dataState, withBusy);
  const { abschnittActions, fahrzeugActions, einheitActions } = useEntityActions(params, lockState, dataState, withBusy);

  return {
    derivedState: lockState.derivedState,
    lockByEinheitId: lockState.lockByEinheitId,
    lockByFahrzeugId: lockState.lockByFahrzeugId,
    lockByAbschnittId: lockState.lockByAbschnittId,
    refreshEinsaetze: dataState.refreshEinsaetze,
    closeEditEinheitDialog: dataState.closeEditEinheitDialog,
    closeEditFahrzeugDialog: dataState.closeEditFahrzeugDialog,
    startActions,
    systemActions,
    abschnittActions,
    fahrzeugActions,
    einheitActions,
  };
}
