import { AbschnittSidebar } from '@renderer/components/layout/AbschnittSidebar';
import { WorkspaceRail } from '@renderer/components/layout/WorkspaceRail';
import { WorkspaceContent } from '@renderer/components/views/WorkspaceContent';
import type { OrganisationKey } from '@shared/types';
import type {
  CreateEinheitForm,
  EditEinheitForm,
  EditFahrzeugForm,
  FahrzeugOverviewItem,
  KraftOverviewItem,
  WorkspaceView,
} from '@renderer/types/ui';
import type { ActiveClientInfo, AbschnittDetails, EinsatzListItem, EinheitHelfer, PeerUpdateStatus } from '@shared/types';
import type { Dispatch, JSX, SetStateAction } from 'react';

interface WorkspaceMainAreaProps {
  activeView: WorkspaceView;
  showAbschnittSidebar: boolean;
  abschnitte: Awaited<ReturnType<typeof window.api.listAbschnitte>>;
  selectedAbschnittId: string;
  selectedEinsatz: EinsatzListItem | null;
  lockByAbschnittId: Record<string, { isSelf: boolean; computerName: string; userName: string }>;
  busy: boolean;
  isArchived: boolean;
  selectedAbschnittLockedByOther: boolean;
  details: AbschnittDetails;
  selectedEinsatzId: string;
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
  setEditEinheitForm: Dispatch<SetStateAction<EditEinheitForm>>;
  editEinheitHelfer: EinheitHelfer[];
  showCreateEinheitDialog: boolean;
  createEinheitForm: CreateEinheitForm;
  setCreateEinheitForm: Dispatch<SetStateAction<CreateEinheitForm>>;
  showEditFahrzeugDialog: boolean;
  editFahrzeugForm: EditFahrzeugForm;
  setEditFahrzeugForm: Dispatch<SetStateAction<EditFahrzeugForm>>;
  einheitLocksById: Record<string, { isSelf: boolean; computerName: string; userName: string }>;
  fahrzeugLocksById: Record<string, { isSelf: boolean; computerName: string; userName: string }>;
  onSetActiveView: (value: WorkspaceView) => void;
  onSetSelectedAbschnittId: (id: string) => void;
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
}

/**
 * Renders workspace navigation and active view content.
 */
export function WorkspaceMainArea(props: WorkspaceMainAreaProps): JSX.Element {
  return (
    <main className={props.showAbschnittSidebar ? 'content content-with-sidebar' : 'content content-no-sidebar'}>
      <WorkspaceRail activeView={props.activeView} onSelect={props.onSetActiveView} />
      {props.showAbschnittSidebar && (
        <AbschnittSidebar
          abschnitte={props.abschnitte}
          selectedId={props.selectedAbschnittId}
          einsatzName={props.selectedEinsatz?.name}
          locksByAbschnittId={props.lockByAbschnittId}
          onSelect={props.onSetSelectedAbschnittId}
          onEditSelected={props.onEditSelectedAbschnitt}
          editDisabled={props.busy || !props.selectedAbschnittId || props.isArchived || props.selectedAbschnittLockedByOther}
        />
      )}

      <WorkspaceContent
        activeView={props.activeView}
        busy={props.busy}
        isArchived={props.isArchived}
        selectedEinsatz={props.selectedEinsatz}
        selectedEinsatzId={props.selectedEinsatzId}
        selectedAbschnittId={props.selectedAbschnittId}
        abschnitte={props.abschnitte}
        details={props.details}
        allKraefte={props.allKraefte}
        allFahrzeuge={props.allFahrzeuge}
        broadcastMonitorLogs={props.broadcastMonitorLogs}
        debugSyncLogs={props.debugSyncLogs}
        udpDebugMonitorLogs={props.udpDebugMonitorLogs}
        activeClients={props.activeClients}
        dbPath={props.dbPath}
        lanPeerUpdatesEnabled={props.lanPeerUpdatesEnabled}
        peerUpdateStatus={props.peerUpdateStatus}
        kraefteOrgFilter={props.kraefteOrgFilter}
        setKraefteOrgFilter={props.setKraefteOrgFilter}
        showEditEinheitDialog={props.showEditEinheitDialog}
        editEinheitForm={props.editEinheitForm}
        setEditEinheitForm={props.setEditEinheitForm}
        editEinheitHelfer={props.editEinheitHelfer}
        onSubmitEditEinheit={props.onSubmitEditEinheit}
        onCloseEditEinheit={props.onCloseEditEinheit}
        onCreateEinheitHelfer={props.onCreateEinheitHelfer}
        onUpdateEinheitHelfer={props.onUpdateEinheitHelfer}
        onDeleteEinheitHelfer={props.onDeleteEinheitHelfer}
        onCreateEinheitFahrzeug={props.onCreateEinheitFahrzeug}
        onUpdateEinheitFahrzeug={props.onUpdateEinheitFahrzeug}
        showCreateEinheitDialog={props.showCreateEinheitDialog}
        createEinheitForm={props.createEinheitForm}
        setCreateEinheitForm={props.setCreateEinheitForm}
        onSubmitCreateEinheit={props.onSubmitCreateEinheit}
        onCloseCreateEinheit={props.onCloseCreateEinheit}
        showEditFahrzeugDialog={props.showEditFahrzeugDialog}
        editFahrzeugForm={props.editFahrzeugForm}
        setEditFahrzeugForm={props.setEditFahrzeugForm}
        onSubmitEditFahrzeug={props.onSubmitEditFahrzeug}
        onCloseEditFahrzeug={props.onCloseEditFahrzeug}
        onCreateEinheit={props.onCreateEinheit}
        onCreateAbschnitt={props.onCreateAbschnitt}
        onCreateFahrzeug={props.onCreateFahrzeug}
        onMoveEinheit={props.onMoveEinheit}
        onEditEinheit={props.onEditEinheit}
        onSplitEinheit={props.onSplitEinheit}
        onMoveFahrzeug={props.onMoveFahrzeug}
        onEditFahrzeug={props.onEditFahrzeug}
        onSaveDbPath={props.onSaveDbPath}
        onSetDbPath={props.onSetDbPath}
        onRestoreBackup={props.onRestoreBackup}
        onToggleLanPeerUpdates={props.onToggleLanPeerUpdates}
        einheitLocksById={props.einheitLocksById}
        fahrzeugLocksById={props.fahrzeugLocksById}
      />
    </main>
  );
}
