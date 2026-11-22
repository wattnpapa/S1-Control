/**
 * Status, Abschnitt, Schicht und Eintreffzeit einer Einheit in einem Zug.
 *
 * Gefordert im Stab-Review vom 22.11.2026 (Führungsgehilfe S1, FA-FG-1 und
 * FA-FG-2): Eine Einheit am Meldetisch einzubuchen kostete rund 15
 * Handgriffe an vier Stellen, und zum Schichtwechsel ließ sich der Status
 * mehrerer Einheiten nicht auf einmal setzen. Dieser Baustein liefert die
 * Einzelschritte; die Maske schreibt sie je Einheit nacheinander, jeder mit
 * seinem eigenen Vorher-Wert (§2.2a). Es entsteht nur, was sich ändert.
 *
 * Auch „Eingetroffen → verknüpfen“ an der Anforderung bucht hierüber ein
 * (`einbuchung` in `anforderungsschritte.ts`).
 */

import type { Entwurf } from "./index.js";

/** Was über die Einheit bekannt ist, wie es im Zustand steht. */
export interface Einbuchungsstand {
  readonly einheitId: string;
  readonly abschnittId?: string | undefined;
  readonly status?: string | undefined;
  readonly schicht?: string | undefined;
  readonly eingetroffenAm?: string | undefined;
}

/** Was gesetzt werden soll; leer heißt: bleibt, wie es ist. */
export interface Einbuchungswahl {
  readonly status?: string;
  readonly abschnittId?: string;
  readonly schicht?: string;
  /** Die Eintreffzeit, falls noch keine eingetragen ist. */
  readonly eingetroffenAm?: string;
}

export function einbuchungsschritte(stand: Einbuchungsstand, wahl: Einbuchungswahl): readonly Entwurf[] {
  const nutzlast = { einheitId: stand.einheitId };
  const schritte: Entwurf[] = [];
  if (wahl.abschnittId !== undefined && wahl.abschnittId !== "" && stand.abschnittId !== undefined && stand.abschnittId !== wahl.abschnittId) {
    schritte.push({ typ: "EinheitVerschoben", nutzlast, vorher: stand.abschnittId, neu: wahl.abschnittId });
  }
  if (wahl.status !== undefined && wahl.status !== "" && wahl.status !== stand.status) {
    schritte.push({ typ: "StatusGesetzt", nutzlast, vorher: stand.status ?? null, neu: wahl.status });
  }
  if (wahl.schicht !== undefined && wahl.schicht !== "" && wahl.schicht !== stand.schicht) {
    schritte.push({ typ: "SchichtGesetzt", nutzlast, vorher: stand.schicht ?? null, neu: wahl.schicht });
  }
  if (wahl.eingetroffenAm !== undefined && stand.eingetroffenAm === undefined) {
    schritte.push({ typ: "ZeitpunktGesetzt", nutzlast: { ...nutzlast, feld: "eingetroffenAm" }, vorher: null, neu: wahl.eingetroffenAm });
  }
  return schritte;
}
