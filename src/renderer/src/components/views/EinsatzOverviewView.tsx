import type { EinsatzListItem, RecordEditLockInfo } from '@shared/types';
import { EinheitenTable } from '@renderer/components/tables/EinheitenTable';
import { FahrzeugeTable } from '@renderer/components/tables/FahrzeugeTable';
import type { AbschnittDetails } from '@shared/types';
import type { JSX } from 'react';

interface EinsatzOverviewViewProps {
  details: AbschnittDetails;
  selectedEinsatz: EinsatzListItem | null;
  isArchived: boolean;
  einheitLocksById?: Record<string, RecordEditLockInfo | undefined>;
  fahrzeugLocksById?: Record<string, RecordEditLockInfo | undefined>;
  onMoveEinheit: (id: string) => void;
  onEditEinheit: (id: string) => void;
  onSplitEinheit: (id: string) => void;
  onRemoveEinheit: (id: string) => void;
  onRemoveFahrzeug: (id: string) => void;
  selectedAbschnittName?: string;
  onMoveFahrzeug: (id: string) => void;
  onEditFahrzeug: (id: string) => void;
}

/**
 * Handles Einsatz Overview View.
 */
export function EinsatzOverviewView(props: EinsatzOverviewViewProps): JSX.Element {
  // Ein Statuswechsel muss sichtbar wirken, sonst bleibt er folgenlos.
  const abgemeldete = props.details.einheiten.filter((einheit) => einheit.status === 'ABGEMELDET').length;
  const ausserBetrieb = props.details.fahrzeuge.filter((fahrzeug) => fahrzeug.status === 'AUSSER_BETRIEB').length;

  return (
    <>
      <h2>Einsatz Übersicht</h2>
      <div className="summary-grid">
        <div className="summary-card">
          <p>Einheiten im Abschnitt</p>
          <strong>{props.details.einheiten.length}</strong>
          {abgemeldete > 0 && <span className="summary-zusatz">davon {abgemeldete} abgemeldet</span>}
        </div>
        <div className="summary-card">
          <p>Fahrzeuge im Abschnitt</p>
          <strong>{props.details.fahrzeuge.length}</strong>
          {ausserBetrieb > 0 && <span className="summary-zusatz">davon {ausserBetrieb} außer Betrieb</span>}
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
        onRemove={props.onRemoveEinheit}
        abschnittName={props.selectedAbschnittName}
      />
      <FahrzeugeTable
        fahrzeuge={props.details.fahrzeuge}
        isArchived={props.isArchived}
        editLocksById={props.fahrzeugLocksById}
        onMove={props.onMoveFahrzeug}
        onEdit={props.onEditFahrzeug}
        onRemove={props.onRemoveFahrzeug}
      />
    </>
  );
}
