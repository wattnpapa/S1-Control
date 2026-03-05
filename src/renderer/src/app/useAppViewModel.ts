import { useState } from 'react';
import type { AppEntryViewProps } from '@renderer/components/views/AppEntryView';
import type { AppWorkspaceShellProps } from '@renderer/components/views/AppWorkspaceShell';
import { useAppBootstrap } from '@renderer/app/useAppBootstrap';
import { DEFAULT_UPDATER_STATE, EMPTY_DETAILS, EMPTY_STRENGTH } from '@renderer/app/defaultState';
import { useEinsatzData } from '@renderer/app/useEinsatzData';
import { useEntityActionsBundle } from '@renderer/app/useEntityActionsBundle';
import { useEditLocks } from '@renderer/app/useEditLocks';
import { useStartActions } from '@renderer/app/useStartActions';
import { useSyncEvents } from '@renderer/app/useSyncEvents';
import { useSystemActions } from '@renderer/app/useSystemActions';
import { useWorkspaceDerivedState } from '@renderer/app/useWorkspaceDerivedState';
import { useWorkspaceLifecycle } from '@renderer/app/useWorkspaceLifecycle';
import { useWorkspaceUiState } from '@renderer/app/useWorkspaceUiState';
import type { FahrzeugOverviewItem, KraftOverviewItem } from '@renderer/types/ui';
import type { EinsatzListItem, SessionUser } from '@shared/types';
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
  const [session, setSession] = useState<SessionUser | null>(null), [authReady, setAuthReady] = useState(false);
  const [dbPath, setDbPath] = useState(''), [lanPeerUpdatesEnabled, setLanPeerUpdatesEnabled] = useState(false);
  const [einsaetze, setEinsaetze] = useState<EinsatzListItem[]>([]);
  const [selectedEinsatzId, setSelectedEinsatzId] = useState<string>('');
  const [abschnitte, setAbschnitte] = useState([] as Awaited<ReturnType<typeof window.api.listAbschnitte>>);
  const [, setSelectedAbschnittId] = useState<string>('');
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [allKraefte, setAllKraefte] = useState<KraftOverviewItem[]>([]);
  const [allFahrzeuge, setAllFahrzeuge] = useState<FahrzeugOverviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updaterState, setUpdaterState] = useState(DEFAULT_UPDATER_STATE);

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
    sessionActive: Boolean(session),
    selectedEinsatzId,
    onError: (message) => setError(message),
  });

  const derivedState = useWorkspaceDerivedState({
    einsaetze,
    selectedEinsatzId,
    selectedAbschnittId: uiState.selectedAbschnittId,
    debugSyncLogs: uiState.debugSyncLogs,
    lockByAbschnittId,
    activeView: uiState.activeView,
  });

  const { clearSelectedEinsatz, closeEditEinheitDialog, closeEditFahrzeugDialog } = useWorkspaceLifecycle({
    selectedEinsatzId,
    editEinheitId: uiState.editEinheitForm.einheitId,
    editFahrzeugId: uiState.editFahrzeugForm.fahrzeugId,
    setSelectedEinsatzId,
    setAbschnitte,
    setSelectedAbschnittId,
    setDetails,
    setAllKraefte,
    setAllFahrzeuge,
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
    selectedEinsatzId,
    selectedAbschnittId: uiState.selectedAbschnittId,
    setEinsaetze,
    setAbschnitte,
    setSelectedAbschnittId,
    setDetails,
    setAllKraefte,
    setAllFahrzeuge,
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
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(readError(err));
    } finally {
      setBusy(false);
    }
  };

  useAppBootstrap({
    authReady,
    setAuthReady,
    setDbPath,
    setLanPeerUpdatesEnabled,
    setUpdaterState,
    setSession,
    setQueuedOpenFilePath: uiState.setQueuedOpenFilePath,
    setNow: uiState.setNow,
    setError,
    refreshEinsaetze,
  });

  useSyncEvents({
    session,
    authReady,
    busy,
    activeView: uiState.activeView,
    selectedEinsatzId,
    selectedAbschnittId: uiState.selectedAbschnittId,
    queuedOpenFilePath: uiState.queuedOpenFilePath,
    setQueuedOpenFilePath: uiState.setQueuedOpenFilePath,
    setError,
    setDetails,
    setActiveClients: uiState.setActiveClients,
    setDbPath,
    setLanPeerUpdatesEnabled,
    setPeerUpdateStatus: uiState.setPeerUpdateStatus,
    setDebugSyncLogs: uiState.setDebugSyncLogs,
    setEinsaetze,
    setSelectedEinsatzId,
    setStartChoice: uiState.setStartChoice,
    loadEinsatz,
    refreshAll,
    withBusy,
  });

  const startActions = useStartActions({
    startNewEinsatzName: uiState.startNewEinsatzName,
    startNewFuestName: uiState.startNewFuestName,
    setError,
    setEinsaetze,
    setSelectedEinsatzId,
    setStartNewEinsatzName: uiState.setStartNewEinsatzName,
    setStartChoice: uiState.setStartChoice,
    loadEinsatz,
    withBusy,
  });

  const systemActions = useSystemActions({
    dbPath,
    selectedEinsatzId,
    selectedAbschnittId: uiState.selectedAbschnittId,
    moveDialog: uiState.moveDialog,
    moveTarget: uiState.moveTarget,
    gesamtStaerke: uiState.gesamtStaerke,
    setLanPeerUpdatesEnabled,
    setDbPath,
    setPeerUpdateStatus: uiState.setPeerUpdateStatus,
    clearSelectedEinsatz,
    refreshEinsaetze,
    loadEinsatz,
    refreshAll,
    setError,
    setMoveDialog: uiState.setMoveDialog,
    setMoveTarget: uiState.setMoveTarget,
    withBusy,
  });

  const { abschnittActions, fahrzeugActions, einheitActions } = useEntityActionsBundle({
    selectedEinsatzId,
    selectedAbschnittId: uiState.selectedAbschnittId,
    isArchived: Boolean(derivedState.isArchived),
    abschnitte,
    selectedAbschnittLock: derivedState.selectedAbschnittLock,
    selectedAbschnittLockedByOther: derivedState.selectedAbschnittLockedByOther,
    createAbschnittForm: uiState.createAbschnittForm,
    editAbschnittForm: uiState.editAbschnittForm,
    setCreateAbschnittForm: uiState.setCreateAbschnittForm,
    setEditAbschnittForm: uiState.setEditAbschnittForm,
    setShowCreateAbschnittDialog: uiState.setShowCreateAbschnittDialog,
    setShowEditAbschnittDialog: uiState.setShowEditAbschnittDialog,
    allKraefte,
    allFahrzeuge,
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
    setError,
    acquireEditLock,
    releaseEditLock,
    loadEinsatz,
    refreshAll,
    withBusy,
  });

  const showWorkspace = Boolean(authReady && session && selectedEinsatzId);

  const entryProps: AppEntryViewProps = {
    authReady,
    session,
    selectedEinsatzId,
    updaterState,
    busy,
    error,
    startChoice: uiState.startChoice,
    setStartChoice: uiState.setStartChoice,
    einsaetze,
    startNewEinsatzName: uiState.startNewEinsatzName,
    setStartNewEinsatzName: uiState.setStartNewEinsatzName,
    startNewFuestName: uiState.startNewFuestName,
    setStartNewFuestName: uiState.setStartNewFuestName,
    onDownloadUpdate: () => void systemActions.downloadUpdate(),
    onOpenReleasePage: () => void systemActions.openReleasePage(),
    onOpenExisting: () => void startActions.openExisting(),
    onOpenKnownEinsatz: (einsatzId) => void startActions.openKnown(einsatzId),
    onCreate: () => void startActions.create(),
  };

  if (!showWorkspace) {
    return {
      showWorkspace,
      entryProps,
      workspaceProps: null,
    };
  }

  const workspaceProps: AppWorkspaceShellProps = {
    busy,
    now: uiState.now,
    error,
    isArchived: Boolean(derivedState.isArchived),
    activeView: uiState.activeView,
    selectedEinsatz: derivedState.selectedEinsatz,
    selectedEinsatzId,
    selectedAbschnittId: uiState.selectedAbschnittId,
    abschnitte,
    details,
    allKraefte,
    allFahrzeuge,
    gesamtStaerke: uiState.gesamtStaerke,
    updaterState,
    kraefteOrgFilter: uiState.kraefteOrgFilter,
    setKraefteOrgFilter: uiState.setKraefteOrgFilter,
    setActiveView: uiState.setActiveView,
    setSelectedAbschnittId,
    showAbschnittSidebar: derivedState.showAbschnittSidebar,
    selectedAbschnittLockedByOther: derivedState.selectedAbschnittLockedByOther,
    lockByAbschnittId,
    lockByEinheitId,
    lockByFahrzeugId,
    showEditEinheitDialog: uiState.showEditEinheitDialog,
    editEinheitForm: uiState.editEinheitForm,
    setEditEinheitForm: uiState.setEditEinheitForm,
    editEinheitHelfer: uiState.editEinheitHelfer,
    showCreateEinheitDialog: uiState.showCreateEinheitDialog,
    createEinheitForm: uiState.createEinheitForm,
    setCreateEinheitForm: uiState.setCreateEinheitForm,
    showEditFahrzeugDialog: uiState.showEditFahrzeugDialog,
    editFahrzeugForm: uiState.editFahrzeugForm,
    setEditFahrzeugForm: uiState.setEditFahrzeugForm,
    showCreateAbschnittDialog: uiState.showCreateAbschnittDialog,
    createAbschnittForm: uiState.createAbschnittForm,
    setCreateAbschnittForm: uiState.setCreateAbschnittForm,
    showEditAbschnittDialog: uiState.showEditAbschnittDialog,
    editAbschnittForm: uiState.editAbschnittForm,
    setEditAbschnittForm: uiState.setEditAbschnittForm,
    showSplitEinheitDialog: uiState.showSplitEinheitDialog,
    splitEinheitForm: uiState.splitEinheitForm,
    setSplitEinheitForm: uiState.setSplitEinheitForm,
    showCreateFahrzeugDialog: uiState.showCreateFahrzeugDialog,
    createFahrzeugForm: uiState.createFahrzeugForm,
    setCreateFahrzeugForm: uiState.setCreateFahrzeugForm,
    moveDialog: uiState.moveDialog,
    moveTarget: uiState.moveTarget,
    setMoveDialog: uiState.setMoveDialog,
    setMoveTarget: uiState.setMoveTarget,
    dbPath,
    lanPeerUpdatesEnabled,
    peerUpdateStatus: uiState.peerUpdateStatus,
    activeClients: uiState.activeClients,
    broadcastMonitorLogs: derivedState.broadcastMonitorLogs,
    debugSyncLogs: uiState.debugSyncLogs,
    udpDebugMonitorLogs: derivedState.udpDebugMonitorLogs,
    onOpenStrengthDisplay: () => void systemActions.openStrengthDisplay(),
    onCloseStrengthDisplay: () => void systemActions.closeStrengthDisplay(),
    onDownloadUpdate: () => void systemActions.downloadUpdate(),
    onOpenReleasePage: () => void systemActions.openReleasePage(),
    onEditSelectedAbschnitt: abschnittActions.openEditSelectedDialog,
    onSubmitEditEinheit: () => void einheitActions.submitEdit(),
    onCloseEditEinheit: closeEditEinheitDialog,
    onCreateEinheitHelfer: einheitActions.createHelfer,
    onUpdateEinheitHelfer: einheitActions.updateHelfer,
    onDeleteEinheitHelfer: einheitActions.deleteHelfer,
    onCreateEinheitFahrzeug: einheitActions.createEinheitFahrzeug,
    onUpdateEinheitFahrzeug: einheitActions.updateEinheitFahrzeug,
    onSubmitCreateEinheit: () => void einheitActions.submitCreate(),
    onCloseCreateEinheit: () => uiState.setShowCreateEinheitDialog(false),
    onSubmitEditFahrzeug: () => void fahrzeugActions.submitEdit(),
    onCloseEditFahrzeug: closeEditFahrzeugDialog,
    onCreateEinheit: einheitActions.openCreateDialog,
    onCreateAbschnitt: abschnittActions.openCreateDialog,
    onCreateFahrzeug: fahrzeugActions.openCreateDialog,
    onMoveEinheit: (id) => {
      uiState.setMoveDialog({ type: 'einheit', id });
      uiState.setMoveTarget(uiState.selectedAbschnittId);
    },
    onEditEinheit: einheitActions.openEditDialog,
    onSplitEinheit: einheitActions.openSplitDialog,
    onMoveFahrzeug: (id) => {
      uiState.setMoveDialog({ type: 'fahrzeug', id });
      uiState.setMoveTarget(uiState.selectedAbschnittId);
    },
    onEditFahrzeug: fahrzeugActions.openEditDialog,
    onSaveDbPath: () => void systemActions.saveDbPath(),
    onSetDbPath: setDbPath,
    onRestoreBackup: () => void systemActions.restoreBackup(),
    onToggleLanPeerUpdates: (enabled) => void systemActions.toggleLanPeerUpdates(enabled),
    onMoveConfirm: () => void systemActions.move(),
    onSubmitCreateAbschnitt: () => void abschnittActions.submitCreate(),
    onCloseCreateAbschnitt: () => uiState.setShowCreateAbschnittDialog(false),
    onSubmitEditAbschnitt: () => void abschnittActions.submitEdit(),
    onCloseEditAbschnitt: abschnittActions.closeEditDialog,
    onSubmitSplitEinheit: () => void einheitActions.submitSplit(),
    onCloseSplitEinheit: () => uiState.setShowSplitEinheitDialog(false),
    onSubmitCreateFahrzeug: () => void fahrzeugActions.submitCreate(),
    onCloseCreateFahrzeug: () => uiState.setShowCreateFahrzeugDialog(false),
  };

  return {
    showWorkspace,
    entryProps,
    workspaceProps,
  };
}
