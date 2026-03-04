import type {
  ActiveClientInfo,
  EinsatzListItem,
  PeerUpdateStatus,
  RecordEditLockInfo,
  OrganisationKey,
  EinheitHelfer,
} from '@shared/types';
import { ORGANISATION_OPTIONS } from '@renderer/constants/organisation';
import { InlineCreateEinheitEditor, InlineEinheitEditor, InlineFahrzeugEditor } from '@renderer/components/editor/InlineEditors';
import { FahrzeugeOverviewTable } from '@renderer/components/tables/FahrzeugeOverviewTable';
import { KraefteOverviewTable } from '@renderer/components/tables/KraefteOverviewTable';
import { EinsatzOverviewView } from '@renderer/components/views/EinsatzOverviewView';
import { FuehrungsstrukturView } from '@renderer/components/views/FuehrungsstrukturView';
import { SettingsView } from '@renderer/components/views/SettingsView';
import type {
  AbschnittNode,
  AbschnittDetails,
} from '@shared/types';
import type {
  CreateEinheitForm,
  EditEinheitForm,
  EditFahrzeugForm,
  FahrzeugOverviewItem,
  KraftOverviewItem,
  WorkspaceView,
} from '@renderer/types/ui';

interface WorkspaceContentProps {
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
  onToggleLanPeerUpdates: (enabled: boolean) => void;
  einheitLocksById: Record<string, RecordEditLockInfo | undefined>;
  fahrzeugLocksById: Record<string, RecordEditLockInfo | undefined>;
}

/**
 * Renders the active workspace view inside the main content area.
 */
export function WorkspaceContent(props: WorkspaceContentProps): JSX.Element {
  return (
    <section className="main-view">
      {props.activeView === 'einsatz' && (
        <>
          <InlineEinheitEditor
            visible={props.showEditEinheitDialog}
            busy={props.busy}
            isArchived={props.isArchived}
            form={props.editEinheitForm}
            onChange={props.setEditEinheitForm}
            onSubmit={props.onSubmitEditEinheit}
            onCancel={props.onCloseEditEinheit}
            helfer={props.editEinheitHelfer}
            onCreateHelfer={props.onCreateEinheitHelfer}
            onUpdateHelfer={props.onUpdateEinheitHelfer}
            onDeleteHelfer={props.onDeleteEinheitHelfer}
            fahrzeuge={props.allFahrzeuge}
            onCreateFahrzeug={props.onCreateEinheitFahrzeug}
            onUpdateFahrzeug={props.onUpdateEinheitFahrzeug}
          />
          <InlineCreateEinheitEditor
            visible={props.showCreateEinheitDialog}
            busy={props.busy}
            isArchived={props.isArchived}
            form={props.createEinheitForm}
            abschnitte={props.abschnitte}
            onChange={props.setCreateEinheitForm}
            onSubmit={props.onSubmitCreateEinheit}
            onCancel={props.onCloseCreateEinheit}
          />
          <InlineFahrzeugEditor
            visible={props.showEditFahrzeugDialog}
            busy={props.busy}
            isArchived={props.isArchived}
            form={props.editFahrzeugForm}
            allKraefte={props.allKraefte}
            onChange={props.setEditFahrzeugForm}
            onSubmit={props.onSubmitEditFahrzeug}
            onCancel={props.onCloseEditFahrzeug}
          />
          <button onClick={props.onCreateEinheit} disabled={props.busy || !props.selectedAbschnittId || props.isArchived}>
            Einheit anlegen
          </button>
          <EinsatzOverviewView
            details={props.details}
            selectedEinsatz={props.selectedEinsatz}
            isArchived={props.isArchived}
            broadcastLogs={props.broadcastMonitorLogs}
            onMoveEinheit={props.onMoveEinheit}
            onEditEinheit={props.onEditEinheit}
            onSplitEinheit={props.onSplitEinheit}
            einheitLocksById={props.einheitLocksById}
            onMoveFahrzeug={props.onMoveFahrzeug}
            onEditFahrzeug={props.onEditFahrzeug}
            fahrzeugLocksById={props.fahrzeugLocksById}
          />
        </>
      )}

      {props.activeView === 'fuehrung' && (
        <>
          <div className="inline-actions">
            <button onClick={props.onCreateAbschnitt} disabled={props.busy || !props.selectedEinsatzId || props.isArchived}>
              Abschnitt anlegen
            </button>
          </div>
          <FuehrungsstrukturView abschnitte={props.abschnitte} kraefte={props.allKraefte} />
        </>
      )}

      {props.activeView === 'kraefte' && (
        <>
          <InlineEinheitEditor
            visible={props.showEditEinheitDialog}
            busy={props.busy}
            isArchived={props.isArchived}
            form={props.editEinheitForm}
            onChange={props.setEditEinheitForm}
            onSubmit={props.onSubmitEditEinheit}
            onCancel={props.onCloseEditEinheit}
            helfer={props.editEinheitHelfer}
            onCreateHelfer={props.onCreateEinheitHelfer}
            onUpdateHelfer={props.onUpdateEinheitHelfer}
            onDeleteHelfer={props.onDeleteEinheitHelfer}
            fahrzeuge={props.allFahrzeuge}
            onCreateFahrzeug={props.onCreateEinheitFahrzeug}
            onUpdateFahrzeug={props.onUpdateEinheitFahrzeug}
          />
          <InlineCreateEinheitEditor
            visible={props.showCreateEinheitDialog}
            busy={props.busy}
            isArchived={props.isArchived}
            form={props.createEinheitForm}
            abschnitte={props.abschnitte}
            onChange={props.setCreateEinheitForm}
            onSubmit={props.onSubmitCreateEinheit}
            onCancel={props.onCloseCreateEinheit}
          />
          <div className="inline-actions">
            <select
              value={props.kraefteOrgFilter}
              onChange={(e) => props.setKraefteOrgFilter(e.target.value as OrganisationKey | 'ALLE')}
              disabled={props.busy}
            >
              <option value="ALLE">Alle Organisationen</option>
              {ORGANISATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button onClick={props.onCreateAbschnitt} disabled={props.busy || !props.selectedEinsatzId || props.isArchived}>
              Abschnitt anlegen
            </button>
            <button onClick={props.onCreateEinheit} disabled={props.busy || !props.selectedAbschnittId || props.isArchived}>
              Einheit anlegen
            </button>
          </div>
          <KraefteOverviewTable
            einheiten={
              props.kraefteOrgFilter === 'ALLE'
                ? props.allKraefte
                : props.allKraefte.filter((e) => e.organisation === props.kraefteOrgFilter)
            }
            isArchived={props.isArchived}
            onMove={props.onMoveEinheit}
            onEdit={props.onEditEinheit}
            onSplit={props.onSplitEinheit}
            editLocksById={props.einheitLocksById}
          />
        </>
      )}

      {props.activeView === 'fahrzeuge' && (
        <>
          <InlineFahrzeugEditor
            visible={props.showEditFahrzeugDialog}
            busy={props.busy}
            isArchived={props.isArchived}
            form={props.editFahrzeugForm}
            allKraefte={props.allKraefte}
            onChange={props.setEditFahrzeugForm}
            onSubmit={props.onSubmitEditFahrzeug}
            onCancel={props.onCloseEditFahrzeug}
          />
          <button onClick={props.onCreateFahrzeug} disabled={props.busy || !props.selectedAbschnittId || props.isArchived}>
            Fahrzeug anlegen
          </button>
          <FahrzeugeOverviewTable
            fahrzeuge={props.allFahrzeuge}
            isArchived={props.isArchived}
            onMove={props.onMoveFahrzeug}
            onEdit={props.onEditFahrzeug}
            editLocksById={props.fahrzeugLocksById}
          />
        </>
      )}

      {props.activeView === 'einstellungen' && (
        <SettingsView
          busy={props.busy}
          dbPath={props.dbPath}
          selectedEinsatzId={props.selectedEinsatzId}
          lanPeerUpdatesEnabled={props.lanPeerUpdatesEnabled}
          activeClients={props.activeClients}
          peerUpdateStatus={props.peerUpdateStatus}
          debugSyncLogs={props.debugSyncLogs}
          udpDebugLogs={props.udpDebugMonitorLogs}
          onChangeDbPath={props.onSetDbPath}
          onSaveDbPath={props.onSaveDbPath}
          onRestoreBackup={props.onRestoreBackup}
          onToggleLanPeerUpdates={props.onToggleLanPeerUpdates}
        />
      )}
    </section>
  );
}
