/**
 * Der Meldekopf-Modus (M6.4).
 *
 * Ein Meldekopf ist eine **ausgelagerte Anmeldestelle**: Er steht am
 * Bereitstellungsraum, nimmt eintreffende Einheiten auf, prüft ihre Bögen und
 * quittiert. Ein Lagebild führt er nicht — das tut die Führungsstelle
 * (`excel-handbuch-anforderungen.md`, Rollen; Hinweise C159–C172).
 *
 * **Es ist ein Zuschnitt und kein Rechtesystem.** Dieselbe Akte, derselbe
 * Share, dieselben Ereignisse; wer an diesem Rechner sitzt, könnte die
 * Betriebsart umstellen und alles andere auch. Ein Rechtesystem
 * vorzutäuschen, das keines ist — es gibt keinen Serverprozess, der etwas
 * verweigern könnte (02-ZIELBILD.md) —, wäre die schlechtere Lösung: Es hielte
 * niemanden auf und ließe alle glauben, es täte es.
 *
 * **Was er zeigt, ist die Arbeit dieser Stelle:** der Scanner, der
 * Eingangskorb mit der Ampel, die Bündeldatei für den Weg ohne Netz. Was er
 * weglässt, ist alles, was die Führungsstelle entscheidet — Abschnittsbaum,
 * Einheitentabelle, Ausgaben, Kosten.
 */

import { useEffect, useState } from "react";

import { Eingangskorb } from "./Eingangskorb.js";
import { Scanner } from "./Scanner.js";
import { Tagebuch } from "./Tagebuch.js";
import { useLaden } from "./laden.js";
import { useKuerzel } from "./tastatur.js";

export function Meldekopf(): React.JSX.Element {
  const laden = useLaden();
  const [scannerOffen, setzeScannerOffen] = useState(false);
  const [abschnittId, setzeAbschnittId] = useState<string | undefined>(undefined);

  // Dasselbe Kürzel wie im Lagebild (M3.6a): Wer zwischen den Arbeitsplätzen
  // wechselt, soll nicht umlernen.
  useKuerzel({
    eeb: () => {
      setzeScannerOffen(true);
    },
  });

  const abschnitte = laden.baum?.baum ?? [];
  const offen = laden.eingangskorb?.offen;

  return (
    <section aria-label="Meldekopf" className="meldekopf">
      <div className="meldekopfkopf">
        <h2>
          Meldekopf
          {offen === undefined ? "" : ` — ${String(offen)} offen`}
        </h2>
        <label>
          Aufnehmen nach
          <select
            value={abschnittId ?? ""}
            onChange={(e) => {
              setzeAbschnittId(e.target.value === "" ? undefined : e.target.value);
            }}
          >
            <option value="">Abschnitt wählen …</option>
            {abschnitte.map((knoten) => (
              <option key={knoten.id} value={knoten.id}>
                {knoten.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setzeScannerOffen(true);
          }}
        >
          Bogen scannen
        </button>
        <button
          type="button"
          disabled={laden.lagebild === undefined || laden.lagebild.undoTiefe === 0}
          onClick={() => void laden.zurueck()}
        >
          Rückgängig
        </button>
      </div>

      {/* Der Baum wird geholt, weil die Auswahl oben ihn braucht — aber er
          wird nicht gezeigt. Die Zuordnung zu einem Abschnitt ist die eine
          Entscheidung, die ein Meldekopf über die Lage trifft. */}
      <Baumholer />

      {scannerOffen && (
        <Scanner
          abschnittId={abschnittId}
          aufSchliessen={() => {
            setzeScannerOffen(false);
          }}
        />
      )}

      <Eingangskorb />

      {/* Der Meldekopf führt ein eigenes Einsatztagebuch — die Excel sagt das
          ausdrücklich (Hinweise C159). Hier ist es dasselbe Tagebuch: Es ist
          eine Projektion des Ereignisstroms (§5.9.1), und beide Stellen
          schreiben in denselben. */}
      <Tagebuch einheitId={undefined} abschnittId={abschnittId} />
    </section>
  );
}

/**
 * Holt den Abschnittsbaum, ohne ihn zu zeigen.
 *
 * Der Meldekopf braucht die Namen für seine Auswahl und sonst nichts vom Baum.
 * Ihn zu zeigen wäre ein halbes Lagebild; ihn nicht zu holen hieße, die
 * Auswahl bliebe leer.
 */
function Baumholer(): null {
  // Im Effekt und nicht im Rendern: Ein Ruf während des Renderns schriebe in
  // den Store, während React zeichnet — und zöge das Zeichnen erneut an.
  const holeBaum = useLaden((laden) => laden.holeBaum);
  useEffect(() => {
    void holeBaum();
  }, [holeBaum]);
  return null;
}
