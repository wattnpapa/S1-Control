import type { AppEntryViewProps } from '@renderer/components/views/AppEntryView';
import type { AppWorkspaceShellProps } from '@renderer/components/views/AppWorkspaceShell';
import type { WorkspaceDerivedState } from '@renderer/app/useWorkspaceDerivedState';
import type { WorkspaceUiState } from '@renderer/app/useWorkspaceUiState';

/**
 * Arguments for start screen props creation.
 */
export interface BuildEntryPropsArgs {
  authReady: boolean;
  session: AppEntryViewProps['session'];
  selectedEinsatzId: string;
  updaterState: AppEntryViewProps['updaterState'];
  busy: boolean;
  error: string | null;
  einsaetze: AppEntryViewProps['einsaetze'];
  uiState: WorkspaceUiState;
  checkForUpdates: () => void;
  downloadUpdate: () => void;
  openReleasePage: () => void;
  openExisting: () => void;
  openKnownEinsatz: (einsatzId: string) => void;
  createEinsatz: () => void;
}

/**
 * Creates entry/start view props.
 */
export function buildEntryProps(args: BuildEntryPropsArgs): AppEntryViewProps {
  return {
    authReady: args.authReady,
    session: args.session,
    selectedEinsatzId: args.selectedEinsatzId,
    updaterState: args.updaterState,
    busy: args.busy,
    error: args.error,
    startChoice: args.uiState.startChoice,
    setStartChoice: args.uiState.setStartChoice,
    einsaetze: args.einsaetze,
    startNewEinsatzName: args.uiState.startNewEinsatzName,
    setStartNewEinsatzName: args.uiState.setStartNewEinsatzName,
    startNewFuestName: args.uiState.startNewFuestName,
    setStartNewFuestName: args.uiState.setStartNewFuestName,
    onCheckForUpdates: args.checkForUpdates,
    onDownloadUpdate: args.downloadUpdate,
    onOpenReleasePage: args.openReleasePage,
    onOpenExisting: args.openExisting,
    onOpenKnownEinsatz: args.openKnownEinsatz,
    onCreate: args.createEinsatz,
  };
}

/**
 * Arguments for workspace props creation.
 */
export interface BuildWorkspacePropsArgs {
  busy: boolean;
  error: string | null;
  selectedEinsatzId: string;
  abschnitte: AppWorkspaceShellProps['abschnitte'];
  details: AppWorkspaceShellProps['details'];
  allKraefte: AppWorkspaceShellProps['allKraefte'];
  allFahrzeuge: AppWorkspaceShellProps['allFahrzeuge'];
  dbPath: string;
  lanPeerUpdatesEnabled: boolean;
  setDbPath: (value: string) => void;
  setSelectedAbschnittId: (value: string) => void;
  uiState: WorkspaceUiState;
  derivedState: WorkspaceDerivedState;
  lockByAbschnittId: AppWorkspaceShellProps['lockByAbschnittId'];
  lockByEinheitId: AppWorkspaceShellProps['lockByEinheitId'];
  lockByFahrzeugId: AppWorkspaceShellProps['lockByFahrzeugId'];
  closeEditEinheitDialog: () => void;
  closeEditFahrzeugDialog: () => void;
  updaterState: AppWorkspaceShellProps['updaterState'];
  abschnittActions: {
    openEditSelectedDialog: () => void;
    openCreateDialog: () => void;
    submitCreate: () => Promise<void>;
    submitEdit: () => Promise<void>;
    closeEditDialog: () => void;
  };
  einheitActions: {
    submitEdit: () => Promise<void>;
    createHelfer: () => Promise<void>;
    updateHelfer: (helferId: string) => Promise<void>;
    deleteHelfer: (helferId: string) => Promise<void>;
    createEinheitFahrzeug: () => Promise<void>;
    updateEinheitFahrzeug: (fahrzeugId: string) => Promise<void>;
    submitCreate: () => Promise<void>;
    openCreateDialog: () => void;
    openEditDialog: (einheitId: string) => void;
    openSplitDialog: (einheitId: string) => void;
    submitSplit: () => Promise<void>;
  };
  fahrzeugActions: {
    submitEdit: () => Promise<void>;
    openCreateDialog: () => void;
    openEditDialog: (fahrzeugId: string) => void;
    submitCreate: () => Promise<void>;
  };
  systemActions: {
    checkForUpdates: () => Promise<void>;
    openStrengthDisplay: () => void;
    closeStrengthDisplay: () => void;
    downloadUpdate: () => void;
    openReleasePage: () => void;
    saveDbPath: () => Promise<void>;
    restoreBackup: () => Promise<void>;
    toggleLanPeerUpdates: (enabled: boolean) => Promise<void>;
    move: () => Promise<void>;
  };
}

/**
 * Creates workspace/shell props from prepared app state and actions.
 */
export function buildWorkspaceProps(args: BuildWorkspacePropsArgs): AppWorkspaceShellProps {
  return {
    ...buildWorkspaceStateProps(args),
    ...buildWorkspaceCallbacks(args),
  };
}

/**
 * Creates workspace state props excluding interactive callbacks.
 */
function buildWorkspaceStateProps(args: BuildWorkspacePropsArgs): Omit<AppWorkspaceShellProps, keyof ReturnType<typeof buildWorkspaceCallbacks>> {
  return {
    busy: args.busy,
    error: args.error,
    isArchived: Boolean(args.derivedState.isArchived),
    activeView: args.uiState.activeView,
    selectedEinsatz: args.derivedState.selectedEinsatz,
    selectedEinsatzId: args.selectedEinsatzId,
    selectedAbschnittId: args.uiState.selectedAbschnittId,
    abschnitte: args.abschnitte,
    details: args.details,
    allKraefte: args.allKraefte,
    allFahrzeuge: args.allFahrzeuge,
    gesamtStaerke: args.uiState.gesamtStaerke,
    updaterState: args.updaterState,
    kraefteOrgFilter: args.uiState.kraefteOrgFilter,
    setKraefteOrgFilter: args.uiState.setKraefteOrgFilter,
    setActiveView: args.uiState.setActiveView,
    setSelectedAbschnittId: args.setSelectedAbschnittId,
    showAbschnittSidebar: args.derivedState.showAbschnittSidebar,
    selectedAbschnittLockedByOther: args.derivedState.selectedAbschnittLockedByOther,
    lockByAbschnittId: args.lockByAbschnittId,
    lockByEinheitId: args.lockByEinheitId,
    lockByFahrzeugId: args.lockByFahrzeugId,
    showEditEinheitDialog: args.uiState.showEditEinheitDialog,
    editEinheitForm: args.uiState.editEinheitForm,
    setEditEinheitForm: args.uiState.setEditEinheitForm,
    editEinheitHelfer: args.uiState.editEinheitHelfer,
    showCreateEinheitDialog: args.uiState.showCreateEinheitDialog,
    createEinheitForm: args.uiState.createEinheitForm,
    setCreateEinheitForm: args.uiState.setCreateEinheitForm,
    showEditFahrzeugDialog: args.uiState.showEditFahrzeugDialog,
    editFahrzeugForm: args.uiState.editFahrzeugForm,
    setEditFahrzeugForm: args.uiState.setEditFahrzeugForm,
    showCreateAbschnittDialog: args.uiState.showCreateAbschnittDialog,
    createAbschnittForm: args.uiState.createAbschnittForm,
    setCreateAbschnittForm: args.uiState.setCreateAbschnittForm,
    showEditAbschnittDialog: args.uiState.showEditAbschnittDialog,
    editAbschnittForm: args.uiState.editAbschnittForm,
    setEditAbschnittForm: args.uiState.setEditAbschnittForm,
    showSplitEinheitDialog: args.uiState.showSplitEinheitDialog,
    splitEinheitForm: args.uiState.splitEinheitForm,
    setSplitEinheitForm: args.uiState.setSplitEinheitForm,
    showCreateFahrzeugDialog: args.uiState.showCreateFahrzeugDialog,
    createFahrzeugForm: args.uiState.createFahrzeugForm,
    setCreateFahrzeugForm: args.uiState.setCreateFahrzeugForm,
    moveDialog: args.uiState.moveDialog,
    moveTarget: args.uiState.moveTarget,
    setMoveDialog: args.uiState.setMoveDialog,
    setMoveTarget: args.uiState.setMoveTarget,
    dbPath: args.dbPath,
    lanPeerUpdatesEnabled: args.lanPeerUpdatesEnabled,
    peerUpdateStatus: args.uiState.peerUpdateStatus,
    activeClients: args.uiState.activeClients,
    broadcastMonitorLogs: args.derivedState.broadcastMonitorLogs,
    debugSyncLogs: args.uiState.debugSyncLogs,
    udpDebugMonitorLogs: args.derivedState.udpDebugMonitorLogs,
  };
}

/**
 * Creates workspace callback props.
 */
type WorkspaceCallbacks = Pick<
  AppWorkspaceShellProps,
  | 'onOpenStrengthDisplay'
  | 'onCloseStrengthDisplay'
  | 'onCheckForUpdates'
  | 'onDownloadUpdate'
  | 'onOpenReleasePage'
  | 'onEditSelectedAbschnitt'
  | 'onSubmitEditEinheit'
  | 'onCloseEditEinheit'
  | 'onCreateEinheitHelfer'
  | 'onUpdateEinheitHelfer'
  | 'onDeleteEinheitHelfer'
  | 'onCreateEinheitFahrzeug'
  | 'onUpdateEinheitFahrzeug'
  | 'onSubmitCreateEinheit'
  | 'onCloseCreateEinheit'
  | 'onSubmitEditFahrzeug'
  | 'onCloseEditFahrzeug'
  | 'onCreateEinheit'
  | 'onCreateAbschnitt'
  | 'onCreateFahrzeug'
  | 'onMoveEinheit'
  | 'onEditEinheit'
  | 'onSplitEinheit'
  | 'onMoveFahrzeug'
  | 'onEditFahrzeug'
  | 'onSaveDbPath'
  | 'onSetDbPath'
  | 'onRestoreBackup'
  | 'onToggleLanPeerUpdates'
  | 'onMoveConfirm'
  | 'onSubmitCreateAbschnitt'
  | 'onCloseCreateAbschnitt'
  | 'onSubmitEditAbschnitt'
  | 'onCloseEditAbschnitt'
  | 'onSubmitSplitEinheit'
  | 'onCloseSplitEinheit'
  | 'onSubmitCreateFahrzeug'
  | 'onCloseCreateFahrzeug'
>;

function buildWorkspaceCallbacks(args: BuildWorkspacePropsArgs): WorkspaceCallbacks {
  const closeCallbacks = buildWorkspaceCloseCallbacks(args);
  const moveCallbacks = buildWorkspaceMoveCallbacks(args);
  const storageCallbacks = buildWorkspaceStorageCallbacks(args);
  return {
    onOpenStrengthDisplay: args.systemActions.openStrengthDisplay,
    onCloseStrengthDisplay: args.systemActions.closeStrengthDisplay,
    onDownloadUpdate: args.systemActions.downloadUpdate,
    onOpenReleasePage: args.systemActions.openReleasePage,
    onEditSelectedAbschnitt: args.abschnittActions.openEditSelectedDialog,
    onSubmitEditEinheit: args.einheitActions.submitEdit,
    onCloseEditEinheit: args.closeEditEinheitDialog,
    onCreateEinheitHelfer: args.einheitActions.createHelfer,
    onUpdateEinheitHelfer: args.einheitActions.updateHelfer,
    onDeleteEinheitHelfer: args.einheitActions.deleteHelfer,
    onCreateEinheitFahrzeug: args.einheitActions.createEinheitFahrzeug,
    onUpdateEinheitFahrzeug: args.einheitActions.updateEinheitFahrzeug,
    onSubmitCreateEinheit: args.einheitActions.submitCreate,
    onCloseCreateEinheit: closeCallbacks.onCloseCreateEinheit,
    onSubmitEditFahrzeug: args.fahrzeugActions.submitEdit,
    onCloseEditFahrzeug: args.closeEditFahrzeugDialog,
    onCreateEinheit: args.einheitActions.openCreateDialog,
    onCreateAbschnitt: args.abschnittActions.openCreateDialog,
    onCreateFahrzeug: args.fahrzeugActions.openCreateDialog,
    onMoveEinheit: moveCallbacks.onMoveEinheit,
    onEditEinheit: args.einheitActions.openEditDialog,
    onSplitEinheit: args.einheitActions.openSplitDialog,
    onMoveFahrzeug: moveCallbacks.onMoveFahrzeug,
    onEditFahrzeug: args.fahrzeugActions.openEditDialog,
    ...storageCallbacks,
    onMoveConfirm: () => void args.systemActions.move(),
    onSubmitCreateAbschnitt: args.abschnittActions.submitCreate,
    onCloseCreateAbschnitt: closeCallbacks.onCloseCreateAbschnitt,
    onSubmitEditAbschnitt: args.abschnittActions.submitEdit,
    onCloseEditAbschnitt: args.abschnittActions.closeEditDialog,
    onSubmitSplitEinheit: args.einheitActions.submitSplit,
    onCloseSplitEinheit: closeCallbacks.onCloseSplitEinheit,
    onSubmitCreateFahrzeug: args.fahrzeugActions.submitCreate,
    onCloseCreateFahrzeug: closeCallbacks.onCloseCreateFahrzeug,
  };
}

/**
 * Builds workspace close callbacks for dialog visibility.
 */
function buildWorkspaceCloseCallbacks(args: BuildWorkspacePropsArgs) {
  return {
    onCloseCreateEinheit: () => args.uiState.setShowCreateEinheitDialog(false),
    onCloseCreateAbschnitt: () => args.uiState.setShowCreateAbschnittDialog(false),
    onCloseSplitEinheit: () => args.uiState.setShowSplitEinheitDialog(false),
    onCloseCreateFahrzeug: () => args.uiState.setShowCreateFahrzeugDialog(false),
  };
}

/**
 * Builds move callbacks used for Einheit/Fahrzeug transfer dialog.
 */
function buildWorkspaceMoveCallbacks(args: BuildWorkspacePropsArgs) {
  return {
    onMoveEinheit: (id: string) => {
      args.uiState.setMoveDialog({ type: 'einheit', id });
      args.uiState.setMoveTarget(args.uiState.selectedAbschnittId);
    },
    onMoveFahrzeug: (id: string) => {
      args.uiState.setMoveDialog({ type: 'fahrzeug', id });
      args.uiState.setMoveTarget(args.uiState.selectedAbschnittId);
    },
  };
}

/**
 * Builds settings/storage related callbacks.
 */
function buildWorkspaceStorageCallbacks(args: BuildWorkspacePropsArgs) {
  return {
    onSaveDbPath: () => void args.systemActions.saveDbPath(),
    onSetDbPath: args.setDbPath,
    onRestoreBackup: () => void args.systemActions.restoreBackup(),
    onCheckForUpdates: () => void args.systemActions.checkForUpdates(),
    onToggleLanPeerUpdates: (enabled: boolean) => void args.systemActions.toggleLanPeerUpdates(enabled),
  };
}
