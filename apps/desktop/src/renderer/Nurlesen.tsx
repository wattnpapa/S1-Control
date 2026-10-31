/**
 * Beendeter oder archivierter Einsatz: Blätter zeigen, schreiben aber nicht.
 *
 * Die Einheitentabelle sperrt ihre Zellen mit `TEXT_NUR_LESEN`. Dieselbe
 * Regel gilt für Anforderungen, Führungsstelle, Eingangskorb und Kosten: Ihre
 * Felder und Zeilenknöpfe sind gesperrt, und das Blatt sagt oben, warum —
 * statt erst nach dem Klick abzuweisen oder Eingaben still zu verwerfen.
 */

import { useLaden } from "./laden.js";
import { TEXT_NUR_LESEN } from "./Maske.js";

/** Ob der Einsatz keine Eingaben mehr annimmt (beendet oder archiviert). */
export function useNurLesen(): boolean {
  return useLaden((zustand) => (zustand.lagebild?.einsatzStatus ?? "AKTIV") !== "AKTIV");
}

/** Das Banner oben im Blatt; leer, solange der Einsatz läuft. */
export function NurLesenHinweis(): React.JSX.Element | null {
  if (!useNurLesen()) return null;
  return (
    <p className="warnung nurlesen" role="status" data-testid="nurlesen">
      {TEXT_NUR_LESEN}. Eingaben sind gesperrt.
    </p>
  );
}
