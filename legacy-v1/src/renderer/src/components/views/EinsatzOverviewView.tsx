import type { EinsatzListItem, RecordEditLockInfo } from '@shared/types';
import { EinheitenTable } from '@renderer/components/tables/EinheitenTable';
import { FahrzeugeTable } from '@renderer/components/tables/FahrzeugeTable';
import type { AbschnittDetails } from '@shared/types';

interface EinsatzOverviewViewProps {
  details: AbschnittDetails;
  selectedEinsatz: EinsatzListItem | null;
  isArchived: boolean;
  broadcastLogs: string[];
  einheitLocksById?: Record<string, RecordEditLockInfo | undefined>;
  fahrzeugLocksById?: Record<string, RecordEditLockInfo | undefined>;
  onMoveEinheit: (id: string) => void;
  onEditEinheit: (id: string) => void;
  onSplitEinheit: (id: string) => void;
  onMoveFahrzeug: (id: string) => void;
  onEditFahrzeug: (id: string) => void;
}

/**
 * Handles Einsatz Overview View.
 */
export function EinsatzOverviewView(props: EinsatzOverviewViewProps): JSX.Element {
  return (
    <>
      <h2>Einsatz Übersicht</h2>
      <div className="summary-grid">
        <div className="summary-card">
          <p>Einheiten im Abschnitt</p>
          <strong>{props.details.einheiten.length}</strong>
        </div>
        <div className="summary-card">
          <p>Fahrzeuge im Abschnitt</p>
          <strong>{props.details.fahrzeuge.length}</strong>
        </div>
        <div className="summary-card">
          <p>Status</p>
          <strong>{props.selectedEinsatz?.status ?? '-'}</strong>
        </div>
      </div>
      <EinheitenTable
        einheiten={props.details.einheiten}
        isArchived={props.isArchived}
        editLocksById={props.einheitLocksById}
        onMove={props.onMoveEinheit}
        onEdit={props.onEditEinheit}
        onSplit={props.onSplitEinheit}
      />
      <FahrzeugeTable
        fahrzeuge={props.details.fahrzeuge}
        isArchived={props.isArchived}
        editLocksById={props.fahrzeugLocksById}
        onMove={props.onMoveFahrzeug}
        onEdit={props.onEditFahrzeug}
      />
      <h3>UDP Broadcast Monitor</h3>
      <div className="debug-log-panel">
        <pre>{props.broadcastLogs.length ? props.broadcastLogs.join('\n') : 'Noch keine Broadcast-Nachrichten empfangen.'}</pre>
      </div>
    </>
  );
}
