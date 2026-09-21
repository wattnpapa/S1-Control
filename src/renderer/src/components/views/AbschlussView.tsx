import type { JSX } from 'react';
import type { EinsatzListItem } from '@shared/types';

interface AbschlussViewProps {
  busy: boolean;
  selectedEinsatzId: string;
  selectedEinsatz: EinsatzListItem | null;
  onExport: () => void;
  onBeenden: () => void;
  onArchivieren: () => void;
  onWiederOeffnen: () => void;
}

const STATUS_TEXT: Record<string, string> = {
  AKTIV: 'läuft',
  BEENDET: 'beendet',
  ARCHIVIERT: 'archiviert',
};

/**
 * Abschluss eines Einsatzes: Einsatzakte ausleiten, Einsatz beenden oder
 * archivieren und bei Bedarf wieder öffnen.
 */
export function AbschlussView(props: AbschlussViewProps): JSX.Element {
  const status = props.selectedEinsatz?.status ?? 'AKTIV';
  const laeuft = status === 'AKTIV';

  return (
    <div className="abschluss-panel">
      <h2>Einsatz abschließen</h2>
      <p className="abschluss-status">
        Stand: <strong>{STATUS_TEXT[status] ?? status}</strong>
        {props.selectedEinsatz?.end && ` seit ${new Date(props.selectedEinsatz.end).toLocaleString('de-DE')}`}
      </p>

      <section className="abschluss-block">
        <h3>Einsatzakte</h3>
        <p>
          Erzeugt ein ZIP mit einer Kopie der Einsatzdatei, einem Bericht zum Ausdrucken und CSV-Dateien
          für Kräfte, Fahrzeuge und Bewegungen.
        </p>
        <button onClick={props.onExport} disabled={props.busy || !props.selectedEinsatzId}>
          Einsatzakte exportieren
        </button>
      </section>

      <section className="abschluss-block">
        <h3>Einsatz beenden</h3>
        <p>
          Beendet die Erfassung an allen Plätzen. Der Einsatz bleibt lesbar und lässt sich wieder öffnen,
          solange er nicht archiviert ist.
        </p>
        <div className="abschluss-aktionen">
          <button onClick={props.onBeenden} disabled={props.busy || !laeuft}>
            Einsatz beenden
          </button>
          <button onClick={props.onWiederOeffnen} disabled={props.busy || laeuft}>
            Wieder öffnen
          </button>
        </div>
      </section>

      <section className="abschluss-block">
        <h3>Archivieren</h3>
        <p>
          Der Einsatz wird schreibgeschützt abgelegt. Die Einsatzakte sollte vorher exportiert sein.
        </p>
        <button
          className="btn-gefahr-schlicht"
          onClick={props.onArchivieren}
          disabled={props.busy || status === 'ARCHIVIERT'}
        >
          Einsatz archivieren
        </button>
      </section>
    </div>
  );
}
