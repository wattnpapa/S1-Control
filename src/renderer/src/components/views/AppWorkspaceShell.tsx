import { UpdaterNotices } from '@renderer/components/common/UpdaterUi';
import { Topbar } from '@renderer/components/layout/Topbar';
import { WorkspaceDialogs } from '@renderer/components/views/WorkspaceDialogs';
import { WorkspaceMainArea } from '@renderer/components/views/WorkspaceMainArea';
import type {
  AbschnittDetails,
  ActiveClientInfo,
  EinsatzListItem,
  EinheitHelfer,
  OrganisationKey,
  PeerUpdateStatus,
  UpdaterState,
} from '@shared/types';
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
import type { ComponentProps, JSX } from 'react';

export interface AppWorkspaceShellProps {
  busy: boolean;
  now: Date;
  error: string | null;
  isArchived: boolean;
  activeView: WorkspaceView;
  selectedEinsatz: EinsatzListItem | null;
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  abschnitte: Awaited<ReturnType<typeof window.api.listAbschnitte>>;
  details: AbschnittDetails;
  allKraefte: KraftOverviewItem[];
  allFahrzeuge: FahrzeugOverviewItem[];
  gesamtStaerke: TacticalStrength;
  updaterState: UpdaterState;
  kraefteOrgFilter: OrganisationKey | 'ALLE';
  setKraefteOrgFilter: (value: OrganisationKey | 'ALLE') => void;
  setActiveView: (value: WorkspaceView) => void;
  setSelectedAbschnittId: (id: string) => void;
  showAbschnittSidebar: boolean;
  selectedAbschnittLockedByOther: boolean;
  lockByAbschnittId: Record<string, { isSelf: boolean; computerName: string; userName: string }>;
  lockByEinheitId: Record<string, { isSelf: boolean; computerName: string; userName: string }>;
  lockByFahrzeugId: Record<string, { isSelf: boolean; computerName: string; userName: string }>;
  showEditEinheitDialog: boolean;
  editEinheitForm: EditEinheitForm;
  setEditEinheitForm: (next: EditEinheitForm) => void;
  editEinheitHelfer: EinheitHelfer[];
  showCreateEinheitDialog: boolean;
  createEinheitForm: CreateEinheitForm;
  setCreateEinheitForm: (next: CreateEinheitForm) => void;
  showEditFahrzeugDialog: boolean;
  editFahrzeugForm: EditFahrzeugForm;
  setEditFahrzeugForm: (next: EditFahrzeugForm) => void;
  showCreateAbschnittDialog: boolean;
  createAbschnittForm: CreateAbschnittForm;
  setCreateAbschnittForm: (next: CreateAbschnittForm) => void;
  showEditAbschnittDialog: boolean;
  editAbschnittForm: EditAbschnittForm;
  setEditAbschnittForm: (next: EditAbschnittForm) => void;
  showSplitEinheitDialog: boolean;
  splitEinheitForm: SplitEinheitForm;
  setSplitEinheitForm: (next: SplitEinheitForm) => void;
  showCreateFahrzeugDialog: boolean;
  createFahrzeugForm: CreateFahrzeugForm;
  setCreateFahrzeugForm: (next: CreateFahrzeugForm) => void;
  moveDialog: MoveDialogState | null;
  moveTarget: string;
  setMoveDialog: (value: MoveDialogState | null) => void;
  setMoveTarget: (value: string) => void;
  dbPath: string;
  lanPeerUpdatesEnabled: boolean;
  peerUpdateStatus: PeerUpdateStatus | null;
  activeClients: ActiveClientInfo[];
  broadcastMonitorLogs: string[];
  debugSyncLogs: string[];
  udpDebugMonitorLogs: string[];
  onOpenStrengthDisplay: () => void;
  onCloseStrengthDisplay: () => void;
  onCheckForUpdates: () => void;
  onDownloadUpdate: () => void;
  onOpenReleasePage: () => void;
  onEditSelectedAbschnitt: () => void;
  onSubmitEditEinheit: () => void;
  onCloseEditEinheit: () => void;
  onCreateEinheitHelfer: (input: {
    name: string;
    rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
    geschlecht: 'MAENNLICH' | 'WEIBLICH';
    anzahl: number;
    funktion: string;
    telefon: string;
    erreichbarkeit: string;
    vegetarisch: boolean;
    bemerkung: string;
  }) => Promise<void>;
  onUpdateEinheitHelfer: (input: {
    helferId: string;
    name: string;
    rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
    geschlecht: 'MAENNLICH' | 'WEIBLICH';
    anzahl: number;
    funktion: string;
    telefon: string;
    erreichbarkeit: string;
    vegetarisch: boolean;
    bemerkung: string;
  }) => Promise<void>;
  onDeleteEinheitHelfer: (helferId: string) => Promise<void>;
  onCreateEinheitFahrzeug: (input: {
    name: string;
    kennzeichen: string;
    status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
    funkrufname: string;
    stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
    sondergeraet: string;
    nutzlast: string;
  }) => Promise<void>;
  onUpdateEinheitFahrzeug: (input: {
    fahrzeugId: string;
    name: string;
    kennzeichen: string;
    status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
    funkrufname: string;
    stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
    sondergeraet: string;
    nutzlast: string;
  }) => Promise<void>;
  onSubmitCreateEinheit: () => void;
  onCloseCreateEinheit: () => void;
  onSubmitEditFahrzeug: () => void;
  onCloseEditFahrzeug: () => void;
  onCreateEinheit: () => void;
  onCreateAbschnitt: () => void;
  onCreateFahrzeug: () => void;
  onMoveEinheit: (id: string) => void;
  onEditEinheit: (id: string) => void;
  onSplitEinheit: (id: string) => void;
  onMoveFahrzeug: (id: string) => void;
  onEditFahrzeug: (id: string) => void;
  onSaveDbPath: () => void;
  onSetDbPath: (path: string) => void;
  onRestoreBackup: () => void;
  onToggleLanPeerUpdates: (enabled: boolean) => void;
  onMoveConfirm: () => void;
  onSubmitCreateAbschnitt: () => void;
  onCloseCreateAbschnitt: () => void;
  onSubmitEditAbschnitt: () => void;
  onCloseEditAbschnitt: () => void;
  onSubmitSplitEinheit: () => void;
  onCloseSplitEinheit: () => void;
  onSubmitCreateFahrzeug: () => void;
  onCloseCreateFahrzeug: () => void;
}

type WorkspaceMainAreaProps = ComponentProps<typeof WorkspaceMainArea>;
type WorkspaceDialogsProps = ComponentProps<typeof WorkspaceDialogs>;

/**
 * Builds grouped content props for workspace views.
 */
function buildWorkspaceContentProps(props: AppWorkspaceShellProps): WorkspaceMainAreaProps['contentProps'] {
  return {
    busy: props.busy,
    isArchived: props.isArchived,
    activeView: props.activeView,
    selectedEinsatz: props.selectedEinsatz,
    selectedEinsatzId: props.selectedEinsatzId,
    selectedAbschnittId: props.selectedAbschnittId,
    abschnitte: props.abschnitte,
    details: props.details,
    allKraefte: props.allKraefte,
    allFahrzeuge: props.allFahrzeuge,
    broadcastMonitorLogs: props.broadcastMonitorLogs,
    debugSyncLogs: props.debugSyncLogs,
    udpDebugMonitorLogs: props.udpDebugMonitorLogs,
    activeClients: props.activeClients,
    dbPath: props.dbPath,
    lanPeerUpdatesEnabled: props.lanPeerUpdatesEnabled,
    peerUpdateStatus: props.peerUpdateStatus,
    kraefteOrgFilter: props.kraefteOrgFilter,
    setKraefteOrgFilter: props.setKraefteOrgFilter,
    showEditEinheitDialog: props.showEditEinheitDialog,
    editEinheitForm: props.editEinheitForm,
    setEditEinheitForm: props.setEditEinheitForm,
    editEinheitHelfer: props.editEinheitHelfer,
    showCreateEinheitDialog: props.showCreateEinheitDialog,
    createEinheitForm: props.createEinheitForm,
    setCreateEinheitForm: props.setCreateEinheitForm,
    showEditFahrzeugDialog: props.showEditFahrzeugDialog,
    editFahrzeugForm: props.editFahrzeugForm,
    setEditFahrzeugForm: props.setEditFahrzeugForm,
    einheitLocksById: props.lockByEinheitId,
    fahrzeugLocksById: props.lockByFahrzeugId,
    onSubmitEditEinheit: props.onSubmitEditEinheit,
    onCloseEditEinheit: props.onCloseEditEinheit,
    onCreateEinheitHelfer: props.onCreateEinheitHelfer,
    onUpdateEinheitHelfer: props.onUpdateEinheitHelfer,
    onDeleteEinheitHelfer: props.onDeleteEinheitHelfer,
    onCreateEinheitFahrzeug: props.onCreateEinheitFahrzeug,
    onUpdateEinheitFahrzeug: props.onUpdateEinheitFahrzeug,
    onSubmitCreateEinheit: props.onSubmitCreateEinheit,
    onCloseCreateEinheit: props.onCloseCreateEinheit,
    onSubmitEditFahrzeug: props.onSubmitEditFahrzeug,
    onCloseEditFahrzeug: props.onCloseEditFahrzeug,
    onCreateEinheit: props.onCreateEinheit,
    onCreateAbschnitt: props.onCreateAbschnitt,
    onCreateFahrzeug: props.onCreateFahrzeug,
    onMoveEinheit: props.onMoveEinheit,
    onEditEinheit: props.onEditEinheit,
    onSplitEinheit: props.onSplitEinheit,
    onMoveFahrzeug: props.onMoveFahrzeug,
    onEditFahrzeug: props.onEditFahrzeug,
    onSaveDbPath: props.onSaveDbPath,
    onSetDbPath: props.onSetDbPath,
    onRestoreBackup: props.onRestoreBackup,
    onCheckForUpdates: props.onCheckForUpdates,
    onToggleLanPeerUpdates: props.onToggleLanPeerUpdates,
  };
}

/**
 * Builds props for the workspace content area.
 */
function buildMainAreaProps(props: AppWorkspaceShellProps): WorkspaceMainAreaProps {
  return {
    activeView: props.activeView,
    contentProps: buildWorkspaceContentProps(props),
    showAbschnittSidebar: props.showAbschnittSidebar,
    selectedAbschnittLockedByOther: props.selectedAbschnittLockedByOther,
    lockByAbschnittId: props.lockByAbschnittId,
    onSetActiveView: props.setActiveView,
    onSetSelectedAbschnittId: props.setSelectedAbschnittId,
    onEditSelectedAbschnitt: props.onEditSelectedAbschnitt,
  };
}

/**
 * Builds props for global workspace dialogs.
 */
function buildDialogsProps(props: AppWorkspaceShellProps): WorkspaceDialogsProps {
  return {
    busy: props.busy,
    isArchived: props.isArchived,
    abschnitte: props.abschnitte,
    allKraefte: props.allKraefte,
    updaterState: props.updaterState,
    moveDialog: props.moveDialog,
    moveTarget: props.moveTarget,
    setMoveDialog: props.setMoveDialog,
    setMoveTarget: props.setMoveTarget,
    showCreateAbschnittDialog: props.showCreateAbschnittDialog,
    createAbschnittForm: props.createAbschnittForm,
    setCreateAbschnittForm: props.setCreateAbschnittForm,
    onSubmitCreateAbschnitt: props.onSubmitCreateAbschnitt,
    onCloseCreateAbschnitt: props.onCloseCreateAbschnitt,
    showEditAbschnittDialog: props.showEditAbschnittDialog,
    editAbschnittForm: props.editAbschnittForm,
    setEditAbschnittForm: props.setEditAbschnittForm,
    onSubmitEditAbschnitt: props.onSubmitEditAbschnitt,
    onCloseEditAbschnitt: props.onCloseEditAbschnitt,
    showSplitEinheitDialog: props.showSplitEinheitDialog,
    splitEinheitForm: props.splitEinheitForm,
    setSplitEinheitForm: props.setSplitEinheitForm,
    onSubmitSplitEinheit: props.onSubmitSplitEinheit,
    onCloseSplitEinheit: props.onCloseSplitEinheit,
    showCreateFahrzeugDialog: props.showCreateFahrzeugDialog,
    createFahrzeugForm: props.createFahrzeugForm,
    setCreateFahrzeugForm: props.setCreateFahrzeugForm,
    onSubmitCreateFahrzeug: props.onSubmitCreateFahrzeug,
    onCloseCreateFahrzeug: props.onCloseCreateFahrzeug,
    onMoveConfirm: props.onMoveConfirm,
  };
}

/**
 * Renders workspace status banners.
 */
function WorkspaceStatusBanners({ isArchived, error }: Pick<AppWorkspaceShellProps, 'isArchived' | 'error'>): JSX.Element {
  return (
    <>
      {isArchived && <div className="banner">Einsatz ist archiviert (nur lesen).</div>}
      {error && <div className="error-banner">{error}</div>}
    </>
  );
}

/**
 * Renders the full workspace shell once a Einsatz is opened.
 */
export function AppWorkspaceShell(props: AppWorkspaceShellProps): JSX.Element {
  const mainAreaProps = buildMainAreaProps(props);
  const dialogsProps = buildDialogsProps(props);
  return (
    <div className="app-shell">
      <Topbar
        einsatzName={props.selectedEinsatz?.name ?? '-'}
        gesamtStaerke={props.gesamtStaerke}
        now={props.now}
        onOpenStrengthDisplay={props.onOpenStrengthDisplay}
        onCloseStrengthDisplay={props.onCloseStrengthDisplay}
        busy={props.busy}
      />

      <UpdaterNotices
        updaterState={props.updaterState}
        busy={props.busy}
        onDownloadUpdate={props.onDownloadUpdate}
        onOpenReleasePage={props.onOpenReleasePage}
      />

      <WorkspaceStatusBanners isArchived={props.isArchived} error={props.error} />
      <WorkspaceMainArea {...mainAreaProps} />
      <WorkspaceDialogs {...dialogsProps} />
    </div>
  );
}
