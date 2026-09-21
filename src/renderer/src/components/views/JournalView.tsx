import { useCallback, useEffect, useState } from 'react';
import type { JSX } from 'react';
import type { JournalEintragInfo } from '@shared/ipc';

interface JournalViewProps {
  selectedEinsatzId: string;
  /** Erzwingt ein Nachladen, wenn sich die Lage geändert hat. */
  aktualisierungsMerker: string;
}

/**
 * Zeigt die Bewegungen des Einsatzes, neueste zuerst. Grundlage für eine
 * Übergabe, die nicht nur mündlich stattfindet.
 */
export function JournalView(props: JournalViewProps): JSX.Element {
  const [eintraege, setEintraege] = useState<JournalEintragInfo[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async () => {
    if (!props.selectedEinsatzId) {
      setEintraege([]);
      return;
    }
    try {
      setEintraege(await window.api.listJournal(props.selectedEinsatzId));
      setFehler(null);
    } catch (error) {
      setFehler(error instanceof Error ? error.message : String(error));
    }
  }, [props.selectedEinsatzId]);

  useEffect(() => {
    void laden();
  }, [laden, props.aktualisierungsMerker]);

  return (
    <div className="journal-panel">
      <div className="journal-kopf">
        <h2>Bewegungen</h2>
        <button onClick={() => void laden()}>Aktualisieren</button>
      </div>
      {fehler && <p className="journal-fehler">{fehler}</p>}
      {eintraege.length === 0 && !fehler ? (
        <p>Noch keine Bewegungen erfasst.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Zeit</th>
              <th>Vorgang</th>
              <th>Erfasst von</th>
              <th>Bemerkung</th>
            </tr>
          </thead>
          <tbody>
            {eintraege.map((eintrag) => (
              <tr key={eintrag.id}>
                <td>{new Date(eintrag.zeitpunkt).toLocaleString('de-DE')}</td>
                <td>{eintrag.vorgang}</td>
                <td>{eintrag.benutzer}</td>
                <td>{eintrag.kommentar ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
