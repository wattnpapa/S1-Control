/**
 * Die Statuszeile (M2.2).
 *
 * Sie beantwortet die drei Fragen, die ein Bediener an einem
 * Mehrbenutzer-Arbeitsplatz dauernd hat: Ist mein Stand aktuell? Wer arbeitet
 * sonst noch daran? Ist meine letzte Eingabe drüben?
 *
 * **`jetzt` wird übergeben.** Eine Komponente, die selbst `Date.now()` ruft,
 * ist nicht prüfbar: „vor 8 s" hinge dann an der Laufzeit des Tests. Der
 * Aufrufer gibt die Uhr, und im Betrieb tickt sie im Fenster.
 */

import type { Lagebild } from "../kontrakt/index.js";

/**
 * „vor 8 s", „vor 3 min", „vor 2 h".
 *
 * Grob und nicht genau: Der Bediener will wissen, ob der Stand von eben ist
 * oder von vorhin, nicht auf die Sekunde. Eine Zukunftsangabe wird als „gerade
 * eben" gezeigt — eine verstellte Uhr auf einem anderen Rechner (§3.2) darf
 * hier nicht „in 4 min" ergeben.
 */
export function alter(zeitpunkt: string, jetzt: number): string {
  const dann = Date.parse(zeitpunkt);
  if (Number.isNaN(dann)) return "unbekannt";
  const sekunden = Math.floor((jetzt - dann) / 1000);
  if (sekunden < 1) return "gerade eben";
  if (sekunden < 60) return `vor ${String(sekunden)} s`;
  const minuten = Math.floor(sekunden / 60);
  if (minuten < 60) return `vor ${String(minuten)} min`;
  return `vor ${String(Math.floor(minuten / 60))} h`;
}

/** Menschenlesbare Byte-Angabe für die unübertragenen eigenen Bytes (§5.3). */
export function bytes(zahl: number): string {
  if (zahl < 1024) return `${String(zahl)} B`;
  if (zahl < 1024 * 1024) return `${(zahl / 1024).toFixed(1)} kB`;
  return `${(zahl / (1024 * 1024)).toFixed(1)} MB`;
}

export interface StatuszeileEigenschaften {
  readonly lagebild: Lagebild | undefined;
  readonly jetzt: number;
}

export function Statuszeile({ lagebild, jetzt }: StatuszeileEigenschaften): React.JSX.Element {
  if (lagebild === undefined) {
    return (
      <footer className="statuszeile" aria-label="Statuszeile">
        <span>Kein Einsatz geöffnet</span>
      </footer>
    );
  }

  const wache = lagebild.peers.filter((p) => !p.veraltet).length;
  const veraltet = lagebild.peers.length - wache;

  return (
    <footer className="statuszeile" aria-label="Statuszeile">
      <span title={lagebild.standHlc}>
        Stand: {lagebild.standWanduhr === "" ? "keine Ereignisse" : alter(lagebild.standWanduhr, jetzt)}
      </span>

      <span>
        {lagebild.shareErreichbar ? (
          <>Share erreichbar ({alter(lagebild.letzterShareKontakt, jetzt)})</>
        ) : (
          // §1.3: „Der NAS-Ausfall ist der Normalpfad, kein Fehlerpfad." Die
          // Zeile sagt deshalb, was gilt, und nicht, dass etwas kaputt ist.
          <strong className="warnung">
            Share nicht erreichbar{lagebild.shareMeldung === undefined ? "" : ` — ${lagebild.shareMeldung}`}
          </strong>
        )}
      </span>

      <span>
        {wache === 0 && veraltet === 0
          ? "allein am Einsatz"
          : `${String(wache)} weitere${veraltet > 0 ? `, ${String(veraltet)} veraltet` : ""}`}
      </span>

      {lagebild.unuebertrageneBytes > 0 && (
        <span className="warnung">{bytes(lagebild.unuebertrageneBytes)} noch nicht übertragen</span>
      )}

      {lagebild.quarantaene.length > 0 && (
        // §8.2: Eine endgültige Quarantäne nimmt diesen Arbeitsplatz aus dem
        // Konvergenzvergleich (§8.6.1 Regel 3). Sie zu verschweigen hieße, ihm
        // einen Stand zu zeigen, für den niemand mehr geradesteht.
        <strong className="fehler">
          {String(lagebild.quarantaene.length)} Stelle(n) in Quarantäne
        </strong>
      )}

      <span className="staerke">
        {String(lagebild.einheiten)} Einheiten · {String(lagebild.gesamtstaerke.fuehrer)}/
        {String(lagebild.gesamtstaerke.unterfuehrer)}/{String(lagebild.gesamtstaerke.mannschaft)}/
        {String(
          lagebild.gesamtstaerke.fuehrer +
            lagebild.gesamtstaerke.unterfuehrer +
            lagebild.gesamtstaerke.mannschaft,
        )}
      </span>

      {lagebild.hinweise > 0 && (
        <span className="warnung">{String(lagebild.hinweise)} Konflikthinweis(e)</span>
      )}
      {lagebild.unbekannteEreignisse > 0 && (
        // §3.7: Ein unbekanntes Ereignis heißt fast immer, dass ein anderer
        // Arbeitsplatz eine neuere Fassung fährt.
        <span className="warnung">
          {String(lagebild.unbekannteEreignisse)} unbekannte Ereignisse
        </span>
      )}
    </footer>
  );
}
