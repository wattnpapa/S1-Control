/**
 * Der Hinweis auf ein neues Paket (M7.2).
 *
 * **Angeboten, nicht eingespielt.** Die Anwendung sagt, dass auf dem Share
 * ein neueres, gültig signiertes Paket liegt, und wo es liegt. Ausgelöst wird
 * die Installation von einem Menschen — außerhalb dieser Anwendung. Ein
 * Programm, das sich mitten in einer Lage selbst ersetzt, ist ein Ausfall mit
 * Ansage.
 *
 * **Ein abgelehntes Manifest wird gezeigt und nicht verschwiegen.** Wenn auf
 * dem Share etwas liegt, das nicht durchkommt, ist das die interessantere
 * Nachricht: Entweder hat jemand vergessen zu signieren, oder es hat jemand
 * versucht, der es nicht darf. Beides gehört vor Augen und in die Logdatei.
 *
 * Kein Manifest ist dagegen der Normalfall und erzeugt nichts.
 */

import { useEffect } from "react";

import { useLaden } from "./laden.js";
import { Programmversorgung } from "./Programmversorgung.js";

/** Größe in MB, eine Nachkommastelle — mehr sagt bei einem Paket nichts. */
function groesse(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB`;
}

export function Programmstand(): React.JSX.Element | null {
  const pruefe = useLaden((laden) => laden.pruefeProgrammstand);
  const stand = useLaden((laden) => laden.programmstand);
  const sharePfad = useLaden((laden) => laden.einstellungen.sharePfad);

  useEffect(() => {
    // Erst wenn ein Share eingestellt ist: Ohne ihn gibt es keinen Ordner, in
    // den zu sehen wäre.
    if (sharePfad !== "") void pruefe();
  }, [pruefe, sharePfad]);

  // `undefined` heißt „noch nicht gefragt", die beiden anderen sind der
  // Normalfall. Keiner der drei erzeugt einen Hinweis, und seit die Ansichten
  // hinter Reitern liegen auch keinen Knopf mehr über der Lage: Wer ohne
  // Angebot ein Paket holen will, findet den Knopf im Blatt „Diagnose" —
  // dort, wo auch sonst nachgesehen wird, was das Programm gerade tut.
  if (stand === undefined || stand.art === "keinManifest" || stand.art === "aktuell") {
    return null;
  }

  if (stand.art === "abgelehnt") {
    return (
      <section aria-label="Programmstand" className="programmstand abgelehnt">
        <strong>Ein Paket auf dem Share wurde abgelehnt.</strong> {stand.meldung}
        <Programmversorgung />
      </section>
    );
  }

  return (
    <section aria-label="Programmstand" className="programmstand">
      <strong>Fassung {stand.version} liegt bereit.</strong>{" "}
      {stand.hinweis === undefined ? "" : `${stand.hinweis}. `}
      {stand.datei} ({groesse(stand.groesse)}) unter {stand.pfad}.
      {/* Die Kurzform des Schlüssels ist reine Wiedererkennung und keine
          Zusicherung — sie steht hier, damit ein Bediener am Telefon sagen
          kann, welchen Schlüssel sein Rechner sieht. */}
      <span className="hinweistext"> Signiert mit {stand.kurzform}.</span>
      <Programmversorgung />
    </section>
  );
}
