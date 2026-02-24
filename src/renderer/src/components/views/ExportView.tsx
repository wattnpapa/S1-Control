import type { AbschnittNode } from '@shared/types';

interface ExportViewProps {
  busy: boolean;
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  abschnitte: AbschnittNode[];
  onExport: () => void;
}

export function ExportView(props: ExportViewProps): JSX.Element {
  return (
    <div className="export-panel">
      <h2>Export</h2>
      <p>Einsatzakte als ZIP mit Datenbankkopie, HTML-Report und CSV-Dateien erzeugen.</p>
      <p>
        Abschnitt: <strong>{props.abschnitte.find((a) => a.id === props.selectedAbschnittId)?.name ?? '-'}</strong>
      </p>
      <button onClick={props.onExport} disabled={props.busy || !props.selectedEinsatzId}>
        Einsatzakte jetzt exportieren
      </button>
    </div>
  );
}
