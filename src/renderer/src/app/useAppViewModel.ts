import { useState } from 'react';
import type { AppEntryViewProps } from '@renderer/components/views/AppEntryView';
import type { AppWorkspaceShellProps } from '@renderer/components/views/AppWorkspaceShell';
import { buildEntryProps, buildWorkspaceProps } from '@renderer/app/app-view-props';
import { useAppBootstrap } from '@renderer/app/useAppBootstrap';
import { EMPTY_DETAILS, EMPTY_STRENGTH } from '@renderer/app/defaultState';
import { useAppCoreState } from '@renderer/app/useAppCoreState';
import { useEinsatzData } from '@renderer/app/useEinsatzData';
import { useEntityActionsBundle } from '@renderer/app/useEntityActionsBundle';
import { useEditLocks } from '@renderer/app/useEditLocks';
import { useStartActions } from '@renderer/app/useStartActions';
import { useSyncEvents } from '@renderer/app/useSyncEvents';
import { useSystemActions } from '@renderer/app/useSystemActions';
import { useWorkspaceDerivedState } from '@renderer/app/useWorkspaceDerivedState';
import { useWorkspaceLifecycle } from '@renderer/app/useWorkspaceLifecycle';
import { useWorkspaceUiState } from '@renderer/app/useWorkspaceUiState';
import { readError } from '@renderer/utils/error';

/**
 * Holds root view model for the app root view switching.
 */
export interface AppViewModel {
  showWorkspace: boolean;
  entryProps: AppEntryViewProps;
  workspaceProps: AppWorkspaceShellProps | null;
}

/**
 * Builds all state, actions and view props for app root rendering.
 */
export function useAppViewModel(): AppViewModel {
  const rootState = useAppCoreState();
  const [selectedAbschnittId, setSelectedAbschnittId] = useState('');

  const uiState = useWorkspaceUiState();

  const {
    lockByEinheitId,
    lockByFahrzeugId,
    lockByAbschnittId,
    refreshEditLocks,
    acquireEditLock,
    releaseEditLock,
    clearLocks,
  } = useEditLocks({
    sessionActive: Boolean(rootState.session),
    selectedEinsatzId: rootState.selectedEinsatzId,
    onError: rootState.setError,
  });

  const derivedState = useWorkspaceDerivedState({
    einsaetze: rootState.einsaetze,
    selectedEinsatzId: rootState.selectedEinsatzId,
    selectedAbschnittId,
    debugSyncLogs: uiState.debugSyncLogs,
    lockByAbschnittId,
    activeView: uiState.activeView,
  });

  const { clearSelectedEinsatz, closeEditEinheitDialog, closeEditFahrzeugDialog } = useWorkspaceLifecycle({
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
    clearLocks,
    setShowEditEinheitDialog: uiState.setShowEditEinheitDialog,
    setEditEinheitHelfer: uiState.setEditEinheitHelfer,
    setShowEditFahrzeugDialog: uiState.setShowEditFahrzeugDialog,
    releaseEditLock: async (einsatzId, type, entityId) => {
      await releaseEditLock(einsatzId, type, entityId);
    },
    emptyDetails: EMPTY_DETAILS,
    emptyStrength: EMPTY_STRENGTH,
  });

  const { loadEinsatz, refreshEinsaetze, refreshAll } = useEinsatzData({
    selectedEinsatzId: rootState.selectedEinsatzId,
    selectedAbschnittId,
    setEinsaetze: rootState.setEinsaetze,
    setAbschnitte: rootState.setAbschnitte,
    setSelectedAbschnittId,
    setDetails: rootState.setDetails,
    setAllKraefte: rootState.setAllKraefte,
    setAllFahrzeuge: rootState.setAllFahrzeuge,
    setGesamtStaerke: uiState.setGesamtStaerke,
    clearSelectedEinsatz,
    refreshEditLocks,
    emptyDetails: EMPTY_DETAILS,
    emptyStrength: EMPTY_STRENGTH,
  });

  /**
   * Executes action with UI busy and shared error handling.
   */
  const withBusy = async (fn: () => Promise<void>) => {
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

  useAppBootstrap({
    authReady: rootState.authReady,
    setAuthReady: rootState.setAuthReady,
    setDbPath: rootState.setDbPath,
    setLanPeerUpdatesEnabled: rootState.setLanPeerUpdatesEnabled,
    setUpdaterState: rootState.setUpdaterState,
    setSession: rootState.setSession,
    setQueuedOpenFilePath: uiState.setQueuedOpenFilePath,
    setNow: uiState.setNow,
    setError: rootState.setError,
    refreshEinsaetze,
  });

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
    loadEinsatz,
    refreshAll,
    withBusy,
  });

  const startActions = useStartActions({
    startNewEinsatzName: uiState.startNewEinsatzName,
    startNewFuestName: uiState.startNewFuestName,
    setError: rootState.setError,
    setEinsaetze: rootState.setEinsaetze,
    setSelectedEinsatzId: rootState.setSelectedEinsatzId,
    setStartNewEinsatzName: uiState.setStartNewEinsatzName,
    setStartChoice: uiState.setStartChoice,
    loadEinsatz,
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
    clearSelectedEinsatz,
    refreshEinsaetze,
    loadEinsatz,
    refreshAll,
    setError: rootState.setError,
    setMoveDialog: uiState.setMoveDialog,
    setMoveTarget: uiState.setMoveTarget,
    withBusy,
  });

  const { abschnittActions, fahrzeugActions, einheitActions } = useEntityActionsBundle({
    selectedEinsatzId: rootState.selectedEinsatzId,
    selectedAbschnittId,
    isArchived: Boolean(derivedState.isArchived),
    abschnitte: rootState.abschnitte,
    selectedAbschnittLock: derivedState.selectedAbschnittLock,
    selectedAbschnittLockedByOther: derivedState.selectedAbschnittLockedByOther,
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
    closeEditEinheitDialog,
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
    closeEditFahrzeugDialog,
    setError: rootState.setError,
    acquireEditLock,
    releaseEditLock,
    loadEinsatz,
    refreshAll,
    withBusy,
  });

  const showWorkspace = Boolean(rootState.authReady && rootState.session && rootState.selectedEinsatzId);
  const entryProps: AppEntryViewProps = buildEntryProps({
    authReady: rootState.authReady,
    session: rootState.session,
    selectedEinsatzId: rootState.selectedEinsatzId,
    updaterState: rootState.updaterState,
    busy: rootState.busy,
    error: rootState.error,
    einsaetze: rootState.einsaetze,
    uiState,
    downloadUpdate: () => void systemActions.downloadUpdate(),
    openReleasePage: () => void systemActions.openReleasePage(),
    openExisting: () => void startActions.openExisting(),
    openKnownEinsatz: (einsatzId) => void startActions.openKnown(einsatzId),
    createEinsatz: () => void startActions.create(),
  });

  if (!showWorkspace) {
    return {
      showWorkspace,
      entryProps,
      workspaceProps: null,
    };
  }

  const workspaceProps: AppWorkspaceShellProps = buildWorkspaceProps({
    busy: rootState.busy,
    error: rootState.error,
    selectedEinsatzId: rootState.selectedEinsatzId,
    abschnitte: rootState.abschnitte,
    details: rootState.details,
    allKraefte: rootState.allKraefte,
    allFahrzeuge: rootState.allFahrzeuge,
    dbPath: rootState.dbPath,
    lanPeerUpdatesEnabled: rootState.lanPeerUpdatesEnabled,
    setDbPath: rootState.setDbPath,
    setSelectedAbschnittId,
    uiState,
    derivedState,
    lockByAbschnittId,
    lockByEinheitId,
    lockByFahrzeugId,
    closeEditEinheitDialog,
    closeEditFahrzeugDialog,
    updaterState: rootState.updaterState,
    abschnittActions,
    einheitActions,
    fahrzeugActions,
    systemActions,
  });

  return {
    showWorkspace,
    entryProps,
    workspaceProps,
  };
}
