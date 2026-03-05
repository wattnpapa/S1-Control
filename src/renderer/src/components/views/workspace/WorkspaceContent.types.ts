import type {
  ActiveClientInfo,
  EinsatzListItem,
  EinheitHelfer,
  OrganisationKey,
  PeerUpdateStatus,
  RecordEditLockInfo,
} from '@shared/types';
import type {
  AbschnittDetails,
  AbschnittNode,
  CreateEinheitForm,
  EditEinheitForm,
  EditFahrzeugForm,
  FahrzeugOverviewItem,
  KraftOverviewItem,
  WorkspaceView,
} from '@renderer/types/ui';

export interface WorkspaceContentProps {
  activeView: WorkspaceView;
  busy: boolean;
  isArchived: boolean;
  selectedEinsatz: EinsatzListItem | null;
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  abschnitte: AbschnittNode[];
  details: AbschnittDetails;
  allKraefte: KraftOverviewItem[];
  allFahrzeuge: FahrzeugOverviewItem[];
  broadcastMonitorLogs: string[];
  debugSyncLogs: string[];
  udpDebugMonitorLogs: string[];
  activeClients: ActiveClientInfo[];
  dbPath: string;
  lanPeerUpdatesEnabled: boolean;
  peerUpdateStatus: PeerUpdateStatus | null;
  kraefteOrgFilter: OrganisationKey | 'ALLE';
  setKraefteOrgFilter: (value: OrganisationKey | 'ALLE') => void;
  showEditEinheitDialog: boolean;
  editEinheitForm: EditEinheitForm;
  setEditEinheitForm: (value: EditEinheitForm) => void;
  editEinheitHelfer: EinheitHelfer[];
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
  onUpdateEinheitFahrzeug: WorkspaceContentProps['onCreateEinheitFahrzeug'];
  showCreateEinheitDialog: boolean;
  createEinheitForm: CreateEinheitForm;
  setCreateEinheitForm: (value: CreateEinheitForm) => void;
  onSubmitCreateEinheit: () => void;
  onCloseCreateEinheit: () => void;
  showEditFahrzeugDialog: boolean;
  editFahrzeugForm: EditFahrzeugForm;
  setEditFahrzeugForm: (value: EditFahrzeugForm) => void;
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
  onSetDbPath: (value: string) => void;
  onRestoreBackup: () => void;
  onCheckForUpdates: () => void;
  onToggleLanPeerUpdates: (enabled: boolean) => void;
  einheitLocksById: Record<string, RecordEditLockInfo | undefined>;
  fahrzeugLocksById: Record<string, RecordEditLockInfo | undefined>;
}
