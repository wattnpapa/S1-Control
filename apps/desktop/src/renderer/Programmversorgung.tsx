/**
 * Der Knopf, mit dem ein Arbeitsplatz das Paket für alle holt (M9.1).
 *
 * **Ein Arbeitsplatz holt, alle bekommen es angeboten.** Wer hier drückt,
 * lädt Manifest und Paket aus der Veröffentlichung, lässt sie prüfen und legt
 * sie in `programm\` auf dem Share. Die übrigen Rechner der Führungsstelle
 * sehen das Angebot danach über den Weg aus M7.2 — sie laden nichts und rufen
 * nichts nach draußen.
 *
 * **Warum es dieser Knopf und kein Auto-Updater ist.** Ein Programm, das sich
 * während einer Lage selbst ersetzt, ist ein Ausfall mit Ansage; eines, das
 * im Hintergrund nach Hause telefoniert, widerspricht der Zusage aus M7
 * („keine Telemetrie"). Der Ruf nach draußen geschieht hier ausschließlich,
 * weil ein Mensch gedrückt hat, und nur an die Adresse aus dem Quelltext.
 *
 * **Die Warnung ist zweistufig, und die zweite Stufe hängt an der Lage.**
 * Ohne offenen Einsatz genügt eine Bestätigung; ist ein Einsatz offen, steht
 * dort eine deutliche Warnung, denn dann sitzt jemand mitten in der Arbeit —
 * und die Leitung, die neunzig Megabyte zieht, ist dieselbe, über die der
 * Share erreicht wird.
 *
 * **Geholt heißt nicht eingespielt.** Auch nach dem Holen installiert diese
 * Anwendung nichts. Sie sagt, wo die Datei liegt.
 */

import { useState } from "react";

import { useLaden } from "./laden.js";

/** Größe in MB, eine Nachkommastelle — wie im Hinweis daneben. */
function groesse(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB`;
}

export function Programmversorgung(): React.JSX.Element | null {
  const holePaket = useLaden((laden) => laden.holePaket);
  const bezug = useLaden((laden) => laden.bezug);
  const holt = useLaden((laden) => laden.holtPaket);
  const sharePfad = useLaden((laden) => laden.einstellungen.sharePfad);
  const akteOffen = useLaden((laden) => laden.akteId !== undefined);
  const [nachfrage, setzeNachfrage] = useState(false);

  // Ohne Share gibt es keinen Ordner, in den zu legen wäre. Ein Knopf, der
  // dann nur eine Fehlermeldung erzeugte, ist kein Angebot, sondern eine
  // Falle.
  if (sharePfad === "") return null;

  return (
    <section aria-label="Programmversorgung" className="programmversorgung">
      {!nachfrage && (
        <button
          type="button"
          disabled={holt}
          onClick={() => {
            setzeNachfrage(true);
          }}
        >
          {holt ? "Paket wird geholt …" : "Neues Paket für die Führungsstelle holen"}
        </button>
      )}

      {nachfrage && (
        <div role="alertdialog" aria-label="Paket holen?" className="nachfrage">
          <p>
            Das Paket wird aus der Veröffentlichung geladen, geprüft und auf den Share gelegt. Die
            anderen Arbeitsplätze bekommen es danach angeboten. <strong>Installiert wird nichts</strong> —
            weder hier noch dort.
          </p>
          {akteOffen ? (
            <p className="warnung" role="alert">
              <strong>Es ist ein Einsatz geöffnet.</strong> Tun Sie das nicht während einer laufenden
              Lage, sondern davor. Der Download geht über dieselbe Leitung wie der Share, dauert
              mehrere Minuten und kann die Übertragung Ihrer Einträge verzögern.
            </p>
          ) : (
            <p className="hinweistext">
              Kein Einsatz geöffnet — das ist der richtige Zeitpunkt dafür.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setzeNachfrage(false);
              void holePaket();
            }}
          >
            {akteOffen ? "Trotzdem holen" : "Paket holen"}
          </button>
          <button
            type="button"
            onClick={() => {
              setzeNachfrage(false);
            }}
          >
            Abbrechen
          </button>
        </div>
      )}

      {bezug !== undefined && bezug.art === "geholt" && (
        <p className="ergebnis" role="status">
          Fassung {bezug.version} liegt jetzt auf dem Share: {bezug.datei} ({groesse(bezug.groesse)})
          unter {bezug.pfad}. Signiert mit {bezug.kurzform}. Den anderen Arbeitsplätzen wird sie beim
          nächsten Blick auf den Share angeboten; installiert wird sie von einem Menschen — auch hier.
        </p>
      )}
      {bezug !== undefined && bezug.art === "aktuell" && (
        <p className="ergebnis" role="status">
          Nichts zu holen: {bezug.vorhanden} ist bereits der neueste Stand.
        </p>
      )}
      {bezug !== undefined && bezug.art === "abgelehnt" && (
        <p className="ergebnis abgelehnt" role="alert">
          <strong>Es wurde nichts geholt.</strong> {bezug.meldung}
        </p>
      )}
    </section>
  );
}
