import type { EinsatzListItem } from '@shared/types';
import { EinheitenTable } from '@renderer/components/tables/EinheitenTable';
import { FahrzeugeTable } from '@renderer/components/tables/FahrzeugeTable';
import type { AbschnittDetails } from '@shared/types';

interface EinsatzOverviewViewProps {
  details: AbschnittDetails;
  selectedEinsatz: EinsatzListItem | null;
  isArchived: boolean;
  onMoveEinheit: (id: string) => void;
  onSplitEinheit: (id: string) => void;
  onMoveFahrzeug: (id: string) => void;
}

export function EinsatzOverviewView(props: EinsatzOverviewViewProps): JSX.Element {
  return (
    <>
      <h2>Einsatz Uebersicht</h2>
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
        onMove={props.onMoveEinheit}
        onSplit={props.onSplitEinheit}
      />
      <FahrzeugeTable
        fahrzeuge={props.details.fahrzeuge}
        isArchived={props.isArchived}
        onMove={props.onMoveFahrzeug}
      />
    </>
  );
}
