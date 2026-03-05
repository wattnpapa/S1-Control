import type { OrganisationKey } from '@shared/types';
import { ORGANISATION_OPTIONS } from '@renderer/constants/organisation';
import { InlineCreateEinheitEditor, InlineEinheitEditor, InlineFahrzeugEditor } from '@renderer/components/editor/InlineEditors';
import { FahrzeugeOverviewTable } from '@renderer/components/tables/FahrzeugeOverviewTable';
import { KraefteOverviewTable } from '@renderer/components/tables/KraefteOverviewTable';
import { EinsatzOverviewView } from '@renderer/components/views/EinsatzOverviewView';
import { FuehrungsstrukturView } from '@renderer/components/views/FuehrungsstrukturView';
import { SettingsView } from '@renderer/components/views/SettingsView';
import type { WorkspaceView } from '@renderer/types/ui';
import type { WorkspaceContentProps } from './WorkspaceContent.types';

/**
 * Renders shared inline editors used in unit-centric views.
 */
function EinheitEditors(props: WorkspaceContentProps): JSX.Element {
  return (
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
    </>
  );
}

/**
 * Renders inline vehicle editor.
 */
function FahrzeugEditor(props: WorkspaceContentProps): JSX.Element {
  return (
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
  );
}

/**
 * Renders dashboard view.
 */
function EinsatzView(props: WorkspaceContentProps): JSX.Element {
  return (
    <>
      <EinheitEditors {...props} />
      <FahrzeugEditor {...props} />
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
  );
}

/**
 * Renders command structure view.
 */
function FuehrungView(props: WorkspaceContentProps): JSX.Element {
  return (
    <>
      <div className="inline-actions">
        <button onClick={props.onCreateAbschnitt} disabled={props.busy || !props.selectedEinsatzId || props.isArchived}>
          Abschnitt anlegen
        </button>
      </div>
      <FuehrungsstrukturView abschnitte={props.abschnitte} kraefte={props.allKraefte} />
    </>
  );
}

/**
 * Renders all force overview view.
 */
function KraefteView(props: WorkspaceContentProps): JSX.Element {
  const einheiten =
    props.kraefteOrgFilter === 'ALLE'
      ? props.allKraefte
      : props.allKraefte.filter((einheit) => einheit.organisation === props.kraefteOrgFilter);
  return (
    <>
      <EinheitEditors {...props} />
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
        einheiten={einheiten}
        isArchived={props.isArchived}
        onMove={props.onMoveEinheit}
        onEdit={props.onEditEinheit}
        onSplit={props.onSplitEinheit}
        editLocksById={props.einheitLocksById}
      />
    </>
  );
}

/**
 * Renders vehicle overview view.
 */
function FahrzeugeView(props: WorkspaceContentProps): JSX.Element {
  return (
    <>
      <FahrzeugEditor {...props} />
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
  );
}

/**
 * Renders settings view.
 */
function EinstellungenView(props: WorkspaceContentProps): JSX.Element {
  return (
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
      onCheckForUpdates={props.onCheckForUpdates}
      onToggleLanPeerUpdates={props.onToggleLanPeerUpdates}
    />
  );
}

/**
 * Renders active workspace view body.
 */
export function WorkspaceViewBody(props: WorkspaceContentProps): JSX.Element {
  const views: Record<WorkspaceView, JSX.Element> = {
    einsatz: <EinsatzView {...props} />,
    fuehrung: <FuehrungView {...props} />,
    kraefte: <KraefteView {...props} />,
    fahrzeuge: <FahrzeugeView {...props} />,
    einstellungen: <EinstellungenView {...props} />,
  };
  return views[props.activeView];
}
