import { useCallback, useMemo, useState } from 'react';
import type {
  ActiveClientInfo,
  AbschnittDetails,
  EinsatzListItem,
  EinheitHelfer,
  OrganisationKey,
  PeerUpdateStatus,
  SessionUser,
  UpdaterState,
} from '@shared/types';
import { useAbschnittActions } from '@renderer/app/useAbschnittActions';
import { useAppBootstrap } from '@renderer/app/useAppBootstrap';
import { useEinsatzData } from '@renderer/app/useEinsatzData';
import { useEditLocks } from '@renderer/app/useEditLocks';
import { useEinheitActions } from '@renderer/app/useEinheitActions';
import { useFahrzeugActions } from '@renderer/app/useFahrzeugActions';
import { useStartActions } from '@renderer/app/useStartActions';
import { useSyncEvents } from '@renderer/app/useSyncEvents';
import { useSystemActions } from '@renderer/app/useSystemActions';
import { UpdaterNotices } from '@renderer/components/common/UpdaterUi';
import { CreateAbschnittDialog } from '@renderer/components/dialogs/CreateAbschnittDialog';
import { CreateFahrzeugDialog } from '@renderer/components/dialogs/CreateFahrzeugDialog';
import { EditAbschnittDialog } from '@renderer/components/dialogs/EditAbschnittDialog';
import { MoveDialog } from '@renderer/components/dialogs/MoveDialog';
import { SplitEinheitDialog } from '@renderer/components/dialogs/SplitEinheitDialog';
import { AbschnittSidebar } from '@renderer/components/layout/AbschnittSidebar';
import { Topbar } from '@renderer/components/layout/Topbar';
import { WorkspaceRail } from '@renderer/components/layout/WorkspaceRail';
import { AppEntryView } from '@renderer/components/views/AppEntryView';
import { WorkspaceContent } from '@renderer/components/views/WorkspaceContent';
import type {
  CreateAbschnittForm,
  CreateEinheitForm,
  CreateFahrzeugForm,
  EditAbschnittForm,
  EditEinheitForm,
  EditFahrzeugForm,
  FahrzeugOverviewItem,
  KraftOverviewItem,
  MoveDialogState,
  SplitEinheitForm,
  TacticalStrength,
  WorkspaceView,
} from '@renderer/types/ui';
import { readError } from '@renderer/utils/error';

const EMPTY_DETAILS: AbschnittDetails = { einheiten: [], fahrzeuge: [] };
const EMPTY_STRENGTH: TacticalStrength = { fuehrung: 0, unterfuehrung: 0, mannschaft: 0, gesamt: 0 };
const DEFAULT_UPDATER_STATE: UpdaterState = { stage: 'idle' };
/**
 * Handles App.
 */
export function App() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [dbPath, setDbPath] = useState('');
  const [lanPeerUpdatesEnabled, setLanPeerUpdatesEnabled] = useState(false);
  const [einsaetze, setEinsaetze] = useState<EinsatzListItem[]>([]);
  const [selectedEinsatzId, setSelectedEinsatzId] = useState<string>('');
  const [abschnitte, setAbschnitte] = useState([] as Awaited<ReturnType<typeof window.api.listAbschnitte>>);
  const [selectedAbschnittId, setSelectedAbschnittId] = useState<string>('');
  const [details, setDetails] = useState<AbschnittDetails>(EMPTY_DETAILS);
  const [allKraefte, setAllKraefte] = useState<KraftOverviewItem[]>([]);
  const [allFahrzeuge, setAllFahrzeuge] = useState<FahrzeugOverviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updaterState, setUpdaterState] = useState<UpdaterState>(DEFAULT_UPDATER_STATE);

  const [moveDialog, setMoveDialog] = useState<MoveDialogState | null>(null);
  const [moveTarget, setMoveTarget] = useState('');

  const [showCreateEinheitDialog, setShowCreateEinheitDialog] = useState(false);
  const [showCreateAbschnittDialog, setShowCreateAbschnittDialog] = useState(false);
  const [createAbschnittForm, setCreateAbschnittForm] = useState<CreateAbschnittForm>({
    name: '',
    systemTyp: 'NORMAL',
    parentId: '',
  });
  const [showEditAbschnittDialog, setShowEditAbschnittDialog] = useState(false);
  const [editAbschnittForm, setEditAbschnittForm] = useState<EditAbschnittForm>({
    abschnittId: '',
    name: '',
    systemTyp: 'NORMAL',
    parentId: '',
  });
  const [createEinheitForm, setCreateEinheitForm] = useState<CreateEinheitForm>({
    nameImEinsatz: '',
    organisation: 'THW',
    fuehrung: '0',
    unterfuehrung: '1',
    mannschaft: '8',
    status: 'AKTIV',
    abschnittId: '',
    grFuehrerName: '',
    ovName: '',
    ovTelefon: '',
    ovFax: '',
    rbName: '',
    rbTelefon: '',
    rbFax: '',
    lvName: '',
    lvTelefon: '',
    lvFax: '',
    bemerkung: '',
    vegetarierVorhanden: false,
    erreichbarkeiten: '',
    tacticalSignMode: 'AUTO',
    tacticalSignUnit: '',
    tacticalSignTyp: 'none',
    tacticalSignDenominator: '',
  });
  const [showEditEinheitDialog, setShowEditEinheitDialog] = useState(false);
  const [editEinheitHelfer, setEditEinheitHelfer] = useState<EinheitHelfer[]>([]);
  const [editEinheitForm, setEditEinheitForm] = useState<EditEinheitForm>({
    einheitId: '',
    nameImEinsatz: '',
    organisation: 'THW',
    fuehrung: '0',
    unterfuehrung: '0',
    mannschaft: '0',
    status: 'AKTIV',
    grFuehrerName: '',
    ovName: '',
    ovTelefon: '',
    ovFax: '',
    rbName: '',
    rbTelefon: '',
    rbFax: '',
    lvName: '',
    lvTelefon: '',
    lvFax: '',
    bemerkung: '',
    vegetarierVorhanden: false,
    erreichbarkeiten: '',
    tacticalSignMode: 'AUTO',
    tacticalSignUnit: '',
    tacticalSignTyp: 'none',
    tacticalSignDenominator: '',
  });

  const [showSplitEinheitDialog, setShowSplitEinheitDialog] = useState(false);
  const [splitEinheitForm, setSplitEinheitForm] = useState<SplitEinheitForm>({
    sourceEinheitId: '',
    nameImEinsatz: '',
    organisation: 'THW',
    fuehrung: '0',
    unterfuehrung: '0',
    mannschaft: '1',
    status: 'AKTIV',
  });

  const [showCreateFahrzeugDialog, setShowCreateFahrzeugDialog] = useState(false);
  const [createFahrzeugForm, setCreateFahrzeugForm] = useState<CreateFahrzeugForm>({
    name: '',
    kennzeichen: '',
    status: 'AKTIV',
    einheitId: '',
    funkrufname: '',
    stanKonform: 'UNBEKANNT',
    sondergeraet: '',
    nutzlast: '',
  });
  const [showEditFahrzeugDialog, setShowEditFahrzeugDialog] = useState(false);
  const [editFahrzeugForm, setEditFahrzeugForm] = useState<EditFahrzeugForm>({
    fahrzeugId: '',
    name: '',
    kennzeichen: '',
    status: 'AKTIV',
    einheitId: '',
    funkrufname: '',
    stanKonform: 'UNBEKANNT',
    sondergeraet: '',
    nutzlast: '',
  });

  const [startChoice, setStartChoice] = useState<'none' | 'open' | 'create'>('open');
  const [startNewEinsatzName, setStartNewEinsatzName] = useState('');
  const [startNewFuestName, setStartNewFuestName] = useState('FüSt 1');
  const [queuedOpenFilePath, setQueuedOpenFilePath] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<WorkspaceView>('einsatz');
  const [kraefteOrgFilter, setKraefteOrgFilter] = useState<OrganisationKey | 'ALLE'>('ALLE');
  const [gesamtStaerke, setGesamtStaerke] = useState<TacticalStrength>(EMPTY_STRENGTH);
  const [now, setNow] = useState<Date>(new Date());
  const [activeClients, setActiveClients] = useState<ActiveClientInfo[]>([]);
  const [peerUpdateStatus, setPeerUpdateStatus] = useState<PeerUpdateStatus | null>(null);
  const [debugSyncLogs, setDebugSyncLogs] = useState<string[]>([]);

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

  const selectedEinsatz = useMemo(
    () => einsaetze.find((item) => item.id === selectedEinsatzId) ?? null,
    [einsaetze, selectedEinsatzId],
  );
  const broadcastMonitorLogs = useMemo(
    () =>
      debugSyncLogs
        .filter((line) => line.includes('[einsatz-sync] received') || line.includes('[einsatz-sync] remote-change'))
        .slice(-120),
    [debugSyncLogs],
  );
  const udpDebugMonitorLogs = useMemo(
    () =>
      debugSyncLogs
        .filter((line) => {
          const isUdpScope =
            line.includes('[einsatz-sync]') ||
            line.includes('[peer-service]') ||
            line.includes('[peer-discovery]') ||
            line.includes('[peer-offer]');
          if (!isUdpScope) {
            return false;
          }
          return (
            line.includes('udp-') ||
            line.includes('broadcast') ||
            line.includes('received') ||
            line.includes('query') ||
            line.includes('sent') ||
            line.includes('remote-change')
          );
        })
        .slice(-250),
    [debugSyncLogs],
  );
  const selectedAbschnittLock = selectedAbschnittId ? lockByAbschnittId[selectedAbschnittId] : undefined;
  const selectedAbschnittLockedByOther = Boolean(selectedAbschnittLock && !selectedAbschnittLock.isSelf);

  const isArchived = selectedEinsatz?.status === 'ARCHIVIERT';
  const showAbschnittSidebar = activeView === 'einsatz';

  const clearSelectedEinsatz = useCallback(() => {
    setSelectedEinsatzId('');
    setAbschnitte([]);
    setSelectedAbschnittId('');
    setDetails(EMPTY_DETAILS);
    setAllKraefte([]);
    setAllFahrzeuge([]);
    setGesamtStaerke(EMPTY_STRENGTH);
    setActiveClients([]);
    clearLocks();
  }, [clearLocks]);

  /**
   * Handles Close Edit Einheit Dialog.
   */
  const closeEditEinheitDialog = useCallback(() => {
    const einheitId = editEinheitForm.einheitId;
    setShowEditEinheitDialog(false);
    setEditEinheitHelfer([]);
    if (!selectedEinsatzId || !einheitId) {
      return;
    }
    void releaseEditLock(selectedEinsatzId, 'EINHEIT', einheitId).catch(() => undefined);
  }, [editEinheitForm.einheitId, releaseEditLock, selectedEinsatzId]);

  /**
   * Handles Close Edit Fahrzeug Dialog.
   */
  const closeEditFahrzeugDialog = useCallback(() => {
    const fahrzeugId = editFahrzeugForm.fahrzeugId;
    setShowEditFahrzeugDialog(false);
    if (!selectedEinsatzId || !fahrzeugId) {
      return;
    }
    void releaseEditLock(selectedEinsatzId, 'FAHRZEUG', fahrzeugId).catch(() => undefined);
  }, [editFahrzeugForm.fahrzeugId, releaseEditLock, selectedEinsatzId]);

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

  const abschnittActions = useAbschnittActions({
    selectedEinsatzId,
    selectedAbschnittId,
    isArchived: Boolean(isArchived),
    abschnitte,
    selectedAbschnittLock,
    selectedAbschnittLockedByOther,
    createAbschnittForm,
    editAbschnittForm,
    setError,
    setCreateAbschnittForm,
    setEditAbschnittForm,
    setShowCreateAbschnittDialog,
    setShowEditAbschnittDialog,
    acquireEditLock: async (einsatzId, _entityType, entityId) =>
      acquireEditLock(einsatzId, 'ABSCHNITT', entityId),
    releaseEditLock: async (einsatzId, _entityType, entityId) =>
      releaseEditLock(einsatzId, 'ABSCHNITT', entityId),
    loadEinsatz,
    withBusy,
  });

  const fahrzeugActions = useFahrzeugActions({
    selectedEinsatzId,
    selectedAbschnittId,
    isArchived: Boolean(isArchived),
    allKraefte,
    allFahrzeuge,
    createFahrzeugForm,
    editFahrzeugForm,
    setError,
    setCreateFahrzeugForm,
    setEditFahrzeugForm,
    setShowCreateFahrzeugDialog,
    setShowEditEinheitDialog,
    setShowEditFahrzeugDialog,
    closeEditEinheitDialog,
    acquireEditLock: async (einsatzId, _entityType, entityId) =>
      acquireEditLock(einsatzId, 'FAHRZEUG', entityId),
    releaseEditLock: async (einsatzId, _entityType, entityId) =>
      releaseEditLock(einsatzId, 'FAHRZEUG', entityId),
    refreshAll,
    withBusy,
  });

  const einheitActions = useEinheitActions({
    selectedEinsatzId,
    selectedAbschnittId,
    isArchived: Boolean(isArchived),
    allKraefte,
    allFahrzeuge,
    createEinheitForm,
    editEinheitForm,
    splitEinheitForm,
    editEinheitHelfer,
    setError,
    setCreateEinheitForm,
    setEditEinheitForm,
    setSplitEinheitForm,
    setEditEinheitHelfer,
    setShowCreateEinheitDialog,
    setShowEditEinheitDialog,
    setShowEditFahrzeugDialog,
    setShowSplitEinheitDialog,
    closeEditEinheitDialog,
    closeEditFahrzeugDialog,
    acquireEinheitLock: async (einsatzId, einheitId) =>
      acquireEditLock(einsatzId, 'EINHEIT', einheitId),
    releaseEinheitLock: async (einsatzId, einheitId) =>
      releaseEditLock(einsatzId, 'EINHEIT', einheitId),
    acquireFahrzeugLock: async (einsatzId, fahrzeugId) =>
      acquireEditLock(einsatzId, 'FAHRZEUG', fahrzeugId),
    releaseFahrzeugLock: async (einsatzId, fahrzeugId) =>
      releaseEditLock(einsatzId, 'FAHRZEUG', fahrzeugId),
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
    <div className="app-shell">
      <Topbar
        einsatzName={selectedEinsatz?.name ?? '-'}
        gesamtStaerke={gesamtStaerke}
        now={now}
        onOpenStrengthDisplay={() => void systemActions.openStrengthDisplay()}
        onCloseStrengthDisplay={() => void systemActions.closeStrengthDisplay()}
        busy={busy}
      />

      <UpdaterNotices
        updaterState={updaterState}
        busy={busy}
        onDownloadUpdate={() => void systemActions.downloadUpdate()}
        onOpenReleasePage={() => void systemActions.openReleasePage()}
      />

      {isArchived && <div className="banner">Einsatz ist archiviert (nur lesen).</div>}
      {error && <div className="error-banner">{error}</div>}

      <main className={showAbschnittSidebar ? 'content content-with-sidebar' : 'content content-no-sidebar'}>
        <WorkspaceRail activeView={activeView} onSelect={setActiveView} />
        {showAbschnittSidebar && (
          <AbschnittSidebar
            abschnitte={abschnitte}
            selectedId={selectedAbschnittId}
            einsatzName={selectedEinsatz?.name}
            locksByAbschnittId={lockByAbschnittId}
            onSelect={setSelectedAbschnittId}
            onEditSelected={abschnittActions.openEditSelectedDialog}
            editDisabled={busy || !selectedAbschnittId || isArchived || selectedAbschnittLockedByOther}
          />
        )}

        <WorkspaceContent
          activeView={activeView}
          busy={busy}
          isArchived={isArchived ?? false}
          selectedEinsatz={selectedEinsatz}
          selectedEinsatzId={selectedEinsatzId}
          selectedAbschnittId={selectedAbschnittId}
          abschnitte={abschnitte}
          details={details}
          allKraefte={allKraefte}
          allFahrzeuge={allFahrzeuge}
          broadcastMonitorLogs={broadcastMonitorLogs}
          debugSyncLogs={debugSyncLogs}
          udpDebugMonitorLogs={udpDebugMonitorLogs}
          activeClients={activeClients}
          dbPath={dbPath}
          lanPeerUpdatesEnabled={lanPeerUpdatesEnabled}
          peerUpdateStatus={peerUpdateStatus}
          kraefteOrgFilter={kraefteOrgFilter}
          setKraefteOrgFilter={setKraefteOrgFilter}
          showEditEinheitDialog={showEditEinheitDialog}
          editEinheitForm={editEinheitForm}
          setEditEinheitForm={setEditEinheitForm}
          editEinheitHelfer={editEinheitHelfer}
          onSubmitEditEinheit={() => void einheitActions.submitEdit()}
          onCloseEditEinheit={closeEditEinheitDialog}
          onCreateEinheitHelfer={einheitActions.createHelfer}
          onUpdateEinheitHelfer={einheitActions.updateHelfer}
          onDeleteEinheitHelfer={einheitActions.deleteHelfer}
          onCreateEinheitFahrzeug={einheitActions.createEinheitFahrzeug}
          onUpdateEinheitFahrzeug={einheitActions.updateEinheitFahrzeug}
          showCreateEinheitDialog={showCreateEinheitDialog}
          createEinheitForm={createEinheitForm}
          setCreateEinheitForm={setCreateEinheitForm}
          onSubmitCreateEinheit={() => void einheitActions.submitCreate()}
          onCloseCreateEinheit={() => setShowCreateEinheitDialog(false)}
          showEditFahrzeugDialog={showEditFahrzeugDialog}
          editFahrzeugForm={editFahrzeugForm}
          setEditFahrzeugForm={setEditFahrzeugForm}
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
          einheitLocksById={lockByEinheitId}
          fahrzeugLocksById={lockByFahrzeugId}
        />
      </main>

      <MoveDialog
        visible={Boolean(moveDialog)}
        type={moveDialog?.type ?? 'einheit'}
        abschnitte={abschnitte}
        moveTarget={moveTarget}
        isArchived={isArchived ?? false}
        onChangeTarget={setMoveTarget}
        onConfirm={() => void systemActions.move()}
        onClose={() => {
          setMoveDialog(null);
          setMoveTarget('');
        }}
      />

      <CreateAbschnittDialog
        visible={showCreateAbschnittDialog}
        busy={busy}
        isArchived={isArchived ?? false}
        form={createAbschnittForm}
        abschnitte={abschnitte}
        onChange={setCreateAbschnittForm}
        onSubmit={() => void abschnittActions.submitCreate()}
        onClose={() => setShowCreateAbschnittDialog(false)}
      />

      <EditAbschnittDialog
        visible={showEditAbschnittDialog}
        busy={busy}
        isArchived={isArchived ?? false}
        form={editAbschnittForm}
        abschnitte={abschnitte}
        onChange={setEditAbschnittForm}
        onSubmit={() => void abschnittActions.submitEdit()}
        onClose={abschnittActions.closeEditDialog}
      />

      <SplitEinheitDialog
        visible={showSplitEinheitDialog}
        busy={busy}
        isArchived={isArchived ?? false}
        form={splitEinheitForm}
        allKraefte={allKraefte}
        onChange={setSplitEinheitForm}
        onSubmit={() => void einheitActions.submitSplit()}
        onClose={() => setShowSplitEinheitDialog(false)}
      />

      <CreateFahrzeugDialog
        visible={showCreateFahrzeugDialog}
        busy={busy}
        isArchived={isArchived ?? false}
        form={createFahrzeugForm}
        allKraefte={allKraefte}
        onChange={setCreateFahrzeugForm}
        onSubmit={() => void fahrzeugActions.submitCreate()}
        onClose={() => setShowCreateFahrzeugDialog(false)}
      />

      <UpdaterOverlay updaterState={updaterState} />
    </div>
  );
}
