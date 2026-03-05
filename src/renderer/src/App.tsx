import { useState } from 'react';
import type { EinsatzListItem, SessionUser } from '@shared/types';
import { useAppBootstrap } from '@renderer/app/useAppBootstrap';
import { useEntityActionsBundle } from '@renderer/app/useEntityActionsBundle';
import { useEinsatzData } from '@renderer/app/useEinsatzData';
import { useEditLocks } from '@renderer/app/useEditLocks';
import { DEFAULT_UPDATER_STATE, EMPTY_DETAILS, EMPTY_STRENGTH } from '@renderer/app/defaultState';
import { useStartActions } from '@renderer/app/useStartActions';
import { useSyncEvents } from '@renderer/app/useSyncEvents';
import { useSystemActions } from '@renderer/app/useSystemActions';
import { useWorkspaceDerivedState } from '@renderer/app/useWorkspaceDerivedState';
import { useWorkspaceLifecycle } from '@renderer/app/useWorkspaceLifecycle';
import { useWorkspaceUiState } from '@renderer/app/useWorkspaceUiState';
import { AppEntryView } from '@renderer/components/views/AppEntryView';
import { AppWorkspaceShell } from '@renderer/components/views/AppWorkspaceShell';
import type { FahrzeugOverviewItem, KraftOverviewItem } from '@renderer/types/ui';
import { readError } from '@renderer/utils/error';
/**
 * Handles App.
 */
export function App() {
  const [session, setSession] = useState<SessionUser | null>(null), [authReady, setAuthReady] = useState(false);
  const [dbPath, setDbPath] = useState(''), [lanPeerUpdatesEnabled, setLanPeerUpdatesEnabled] = useState(false);
  const [einsaetze, setEinsaetze] = useState<EinsatzListItem[]>([]);
  const [selectedEinsatzId, setSelectedEinsatzId] = useState<string>('');
  const [abschnitte, setAbschnitte] = useState([] as Awaited<ReturnType<typeof window.api.listAbschnitte>>);
  const [selectedAbschnittId, setSelectedAbschnittId] = useState<string>('');
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [allKraefte, setAllKraefte] = useState<KraftOverviewItem[]>([]);
  const [allFahrzeuge, setAllFahrzeuge] = useState<FahrzeugOverviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updaterState, setUpdaterState] = useState(DEFAULT_UPDATER_STATE);

  const {
    moveDialog,
    setMoveDialog,
    moveTarget,
    setMoveTarget,
    showCreateEinheitDialog,
    setShowCreateEinheitDialog,
    showCreateAbschnittDialog,
    setShowCreateAbschnittDialog,
    createAbschnittForm,
    setCreateAbschnittForm,
    showEditAbschnittDialog,
    setShowEditAbschnittDialog,
    editAbschnittForm,
    setEditAbschnittForm,
    createEinheitForm,
    setCreateEinheitForm,
    showEditEinheitDialog,
    setShowEditEinheitDialog,
    editEinheitHelfer,
    setEditEinheitHelfer,
    editEinheitForm,
    setEditEinheitForm,
    showSplitEinheitDialog,
    setShowSplitEinheitDialog,
    splitEinheitForm,
    setSplitEinheitForm,
    showCreateFahrzeugDialog,
    setShowCreateFahrzeugDialog,
    createFahrzeugForm,
    setCreateFahrzeugForm,
    showEditFahrzeugDialog,
    setShowEditFahrzeugDialog,
    editFahrzeugForm,
    setEditFahrzeugForm,
    startChoice,
    setStartChoice,
    startNewEinsatzName,
    setStartNewEinsatzName,
    startNewFuestName,
    setStartNewFuestName,
    queuedOpenFilePath,
    setQueuedOpenFilePath,
    activeView,
    setActiveView,
    kraefteOrgFilter,
    setKraefteOrgFilter,
    gesamtStaerke,
    setGesamtStaerke,
    now,
    setNow,
    activeClients,
    setActiveClients,
    peerUpdateStatus,
    setPeerUpdateStatus,
    debugSyncLogs,
    setDebugSyncLogs,
  } = useWorkspaceUiState();

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

  const {
    selectedEinsatz,
    broadcastMonitorLogs,
    udpDebugMonitorLogs,
    selectedAbschnittLock,
    selectedAbschnittLockedByOther,
    isArchived,
    showAbschnittSidebar,
  } = useWorkspaceDerivedState({
    einsaetze,
    selectedEinsatzId,
    selectedAbschnittId,
    debugSyncLogs,
    lockByAbschnittId,
    activeView,
  });

  const { clearSelectedEinsatz, closeEditEinheitDialog, closeEditFahrzeugDialog } = useWorkspaceLifecycle({
    selectedEinsatzId,
    editEinheitId: editEinheitForm.einheitId,
    editFahrzeugId: editFahrzeugForm.fahrzeugId,
    setSelectedEinsatzId,
    setAbschnitte,
    setSelectedAbschnittId,
    setDetails,
    setAllKraefte,
    setAllFahrzeuge,
    setGesamtStaerke,
    setActiveClients,
    clearLocks,
    setShowEditEinheitDialog,
    setEditEinheitHelfer,
    setShowEditFahrzeugDialog,
    releaseEditLock: async (einsatzId, type, entityId) => {
      await releaseEditLock(einsatzId, type, entityId);
    },
    emptyDetails: EMPTY_DETAILS,
    emptyStrength: EMPTY_STRENGTH,
  });

  const { loadEinsatz, refreshEinsaetze, refreshAll } = useEinsatzData({
    selectedEinsatzId,
    selectedAbschnittId,
    setEinsaetze,
    setAbschnitte,
    setSelectedAbschnittId,
    setDetails,
    setAllKraefte,
    setAllFahrzeuge,
    setGesamtStaerke,
    clearSelectedEinsatz,
    refreshEditLocks,
    emptyDetails: EMPTY_DETAILS,
    emptyStrength: EMPTY_STRENGTH,
  });

  /**
   * Handles With Busy.
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
    setQueuedOpenFilePath,
    setNow,
    setError,
    refreshEinsaetze,
  });

  useSyncEvents({
    session,
    authReady,
    busy,
    activeView,
    selectedEinsatzId,
    selectedAbschnittId,
    queuedOpenFilePath,
    setQueuedOpenFilePath,
    setError,
    setDetails,
    setActiveClients,
    setDbPath,
    setLanPeerUpdatesEnabled,
    setPeerUpdateStatus,
    setDebugSyncLogs,
    setEinsaetze,
    setSelectedEinsatzId,
    setStartChoice,
    loadEinsatz,
    refreshAll,
    withBusy,
  });

  const startActions = useStartActions({
    startNewEinsatzName,
    startNewFuestName,
    setError,
    setEinsaetze,
    setSelectedEinsatzId,
    setStartNewEinsatzName,
    setStartChoice,
    loadEinsatz,
    withBusy,
  });

  const systemActions = useSystemActions({
    dbPath,
    selectedEinsatzId,
    selectedAbschnittId,
    moveDialog,
    moveTarget,
    gesamtStaerke,
    setLanPeerUpdatesEnabled,
    setDbPath,
    setPeerUpdateStatus,
    clearSelectedEinsatz,
    refreshEinsaetze,
    loadEinsatz,
    refreshAll,
    setError,
    setMoveDialog,
    setMoveTarget,
    withBusy,
  });

  const { abschnittActions, fahrzeugActions, einheitActions } = useEntityActionsBundle({
    selectedEinsatzId,
    selectedAbschnittId,
    isArchived: Boolean(isArchived),
    abschnitte,
    selectedAbschnittLock,
    selectedAbschnittLockedByOther,
    createAbschnittForm,
    editAbschnittForm,
    setCreateAbschnittForm,
    setEditAbschnittForm,
    setShowCreateAbschnittDialog,
    setShowEditAbschnittDialog,
    allKraefte,
    allFahrzeuge,
    createFahrzeugForm,
    editFahrzeugForm,
    setCreateFahrzeugForm,
    setEditFahrzeugForm,
    setShowCreateFahrzeugDialog,
    setShowEditEinheitDialog,
    setShowEditFahrzeugDialog,
    closeEditEinheitDialog,
    createEinheitForm,
    editEinheitForm,
    splitEinheitForm,
    editEinheitHelfer,
    setCreateEinheitForm,
    setEditEinheitForm,
    setSplitEinheitForm,
    setEditEinheitHelfer,
    setShowCreateEinheitDialog,
    setShowSplitEinheitDialog,
    closeEditFahrzeugDialog,
    setError,
    acquireEditLock,
    releaseEditLock,
    loadEinsatz,
    refreshAll,
    withBusy,
  });

  if (!authReady || !session || !selectedEinsatzId) {
    return (
      <AppEntryView
        authReady={authReady}
        session={session}
        selectedEinsatzId={selectedEinsatzId}
        updaterState={updaterState}
        busy={busy}
        error={error}
        startChoice={startChoice}
        setStartChoice={setStartChoice}
        einsaetze={einsaetze}
        startNewEinsatzName={startNewEinsatzName}
        setStartNewEinsatzName={setStartNewEinsatzName}
        startNewFuestName={startNewFuestName}
        setStartNewFuestName={setStartNewFuestName}
        onDownloadUpdate={() => void systemActions.downloadUpdate()}
        onOpenReleasePage={() => void systemActions.openReleasePage()}
        onOpenExisting={() => void startActions.openExisting()}
        onOpenKnownEinsatz={(einsatzId) => void startActions.openKnown(einsatzId)}
        onCreate={() => void startActions.create()}
      />
    );
  }

  return (
    <AppWorkspaceShell
      busy={busy}
      now={now}
      error={error}
      isArchived={Boolean(isArchived)}
      activeView={activeView}
      selectedEinsatz={selectedEinsatz}
      selectedEinsatzId={selectedEinsatzId}
      selectedAbschnittId={selectedAbschnittId}
      abschnitte={abschnitte}
      details={details}
      allKraefte={allKraefte}
      allFahrzeuge={allFahrzeuge}
      gesamtStaerke={gesamtStaerke}
      updaterState={updaterState}
      kraefteOrgFilter={kraefteOrgFilter}
      setKraefteOrgFilter={setKraefteOrgFilter}
      setActiveView={setActiveView}
      setSelectedAbschnittId={setSelectedAbschnittId}
      showAbschnittSidebar={showAbschnittSidebar}
      selectedAbschnittLockedByOther={selectedAbschnittLockedByOther}
      lockByAbschnittId={lockByAbschnittId}
      lockByEinheitId={lockByEinheitId}
      lockByFahrzeugId={lockByFahrzeugId}
      showEditEinheitDialog={showEditEinheitDialog}
      editEinheitForm={editEinheitForm}
      setEditEinheitForm={setEditEinheitForm}
      editEinheitHelfer={editEinheitHelfer}
      showCreateEinheitDialog={showCreateEinheitDialog}
      createEinheitForm={createEinheitForm}
      setCreateEinheitForm={setCreateEinheitForm}
      showEditFahrzeugDialog={showEditFahrzeugDialog}
      editFahrzeugForm={editFahrzeugForm}
      setEditFahrzeugForm={setEditFahrzeugForm}
      showCreateAbschnittDialog={showCreateAbschnittDialog}
      createAbschnittForm={createAbschnittForm}
      setCreateAbschnittForm={setCreateAbschnittForm}
      showEditAbschnittDialog={showEditAbschnittDialog}
      editAbschnittForm={editAbschnittForm}
      setEditAbschnittForm={setEditAbschnittForm}
      showSplitEinheitDialog={showSplitEinheitDialog}
      splitEinheitForm={splitEinheitForm}
      setSplitEinheitForm={setSplitEinheitForm}
      showCreateFahrzeugDialog={showCreateFahrzeugDialog}
      createFahrzeugForm={createFahrzeugForm}
      setCreateFahrzeugForm={setCreateFahrzeugForm}
      moveDialog={moveDialog}
      moveTarget={moveTarget}
      setMoveDialog={setMoveDialog}
      setMoveTarget={setMoveTarget}
      dbPath={dbPath}
      lanPeerUpdatesEnabled={lanPeerUpdatesEnabled}
      peerUpdateStatus={peerUpdateStatus}
      activeClients={activeClients}
      broadcastMonitorLogs={broadcastMonitorLogs}
      debugSyncLogs={debugSyncLogs}
      udpDebugMonitorLogs={udpDebugMonitorLogs}
      onOpenStrengthDisplay={() => void systemActions.openStrengthDisplay()}
      onCloseStrengthDisplay={() => void systemActions.closeStrengthDisplay()}
      onDownloadUpdate={() => void systemActions.downloadUpdate()}
      onOpenReleasePage={() => void systemActions.openReleasePage()}
      onEditSelectedAbschnitt={abschnittActions.openEditSelectedDialog}
      onSubmitEditEinheit={() => void einheitActions.submitEdit()}
      onCloseEditEinheit={closeEditEinheitDialog}
      onCreateEinheitHelfer={einheitActions.createHelfer}
      onUpdateEinheitHelfer={einheitActions.updateHelfer}
      onDeleteEinheitHelfer={einheitActions.deleteHelfer}
      onCreateEinheitFahrzeug={einheitActions.createEinheitFahrzeug}
      onUpdateEinheitFahrzeug={einheitActions.updateEinheitFahrzeug}
      onSubmitCreateEinheit={() => void einheitActions.submitCreate()}
      onCloseCreateEinheit={() => setShowCreateEinheitDialog(false)}
      onSubmitEditFahrzeug={() => void fahrzeugActions.submitEdit()}
      onCloseEditFahrzeug={closeEditFahrzeugDialog}
      onCreateEinheit={einheitActions.openCreateDialog}
      onCreateAbschnitt={abschnittActions.openCreateDialog}
      onCreateFahrzeug={fahrzeugActions.openCreateDialog}
      onMoveEinheit={(id) => {
        setMoveDialog({ type: 'einheit', id });
        setMoveTarget(selectedAbschnittId);
      }}
      onEditEinheit={einheitActions.openEditDialog}
      onSplitEinheit={einheitActions.openSplitDialog}
      onMoveFahrzeug={(id) => {
        setMoveDialog({ type: 'fahrzeug', id });
        setMoveTarget(selectedAbschnittId);
      }}
      onEditFahrzeug={fahrzeugActions.openEditDialog}
      onSaveDbPath={() => void systemActions.saveDbPath()}
      onSetDbPath={setDbPath}
      onRestoreBackup={() => void systemActions.restoreBackup()}
      onToggleLanPeerUpdates={(enabled) => void systemActions.toggleLanPeerUpdates(enabled)}
      onMoveConfirm={() => void systemActions.move()}
      onSubmitCreateAbschnitt={() => void abschnittActions.submitCreate()}
      onCloseCreateAbschnitt={() => setShowCreateAbschnittDialog(false)}
      onSubmitEditAbschnitt={() => void abschnittActions.submitEdit()}
      onCloseEditAbschnitt={abschnittActions.closeEditDialog}
      onSubmitSplitEinheit={() => void einheitActions.submitSplit()}
      onCloseSplitEinheit={() => setShowSplitEinheitDialog(false)}
      onSubmitCreateFahrzeug={() => void fahrzeugActions.submitCreate()}
      onCloseCreateFahrzeug={() => setShowCreateFahrzeugDialog(false)}
    />
  );
}
