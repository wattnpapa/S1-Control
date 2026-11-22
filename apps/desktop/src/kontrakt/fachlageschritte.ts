/**
 * Die Schrittbauer der Fachlage (Stab-Review 2026-11-22): je Bereich die
 * Anlage mit ihrer eigenen Ereignisart und eine Feldänderung. Dieselben
 * Bauer benutzt die Oberfläche und das Demo-Drehbuch (CLAUDE.md).
 */

import type { Fachlagebereich } from "@s1/domaene";

import type { Entwurf } from "./index.js";

/** Je Bereich: Anlageart, Änderungsart, Kennungsfeld. */
export const FACHLAGEARTEN: Readonly<Record<Fachlagebereich, { readonly anlage: string; readonly aenderung: string; readonly idFeld: string }>> = {
  lage: { anlage: "AbschnittslageGemeldet", aenderung: "AbschnittslageGeaendert", idFeld: "lageId" },
  pegel: { anlage: "PegelstandGemessen", aenderung: "PegelstandGeaendert", idFeld: "messungId" },
  deich: { anlage: "DeichschadenGemeldet", aenderung: "DeichschadenGeaendert", idFeld: "schadenId" },
  patienten: { anlage: "PatientErfasst", aenderung: "PatientGeaendert", idFeld: "patientId" },
  amtshilfe: { anlage: "AmtshilfeBeantragt", aenderung: "AmtshilfeGeaendert", idFeld: "antragId" },
  material: { anlage: "MaterialAngefordert", aenderung: "MaterialGeaendert", idFeld: "materialId" },
  presse: { anlage: "PressemitteilungVerfasst", aenderung: "PressemitteilungGeaendert", idFeld: "mitteilungId" },
  stoerungen: { anlage: "StoerungGemeldet", aenderung: "StoerungGeaendert", idFeld: "stoerungId" },
};

/** Die Anlage: Kennung unter dem Feld des Bereichs, leere optionale Felder entfallen. */
export function fachlageAnlage(bereich: Fachlagebereich, id: string, werte: Readonly<Record<string, unknown>>): Entwurf {
  const art = FACHLAGEARTEN[bereich];
  const nutzlast: Record<string, unknown> = { [art.idFeld]: id };
  for (const [feld, wert] of Object.entries(werte)) {
    if (wert === undefined || wert === "") continue;
    nutzlast[feld] = wert;
  }
  return { typ: art.anlage, nutzlast };
}

/** Eine Feldänderung mit dem gesehenen Vorher-Wert (§2.2a); leer wird `null`. */
export function fachlageAenderung(bereich: Fachlagebereich, id: string, feld: string, wechsel: { readonly vorher: unknown; readonly neu: unknown }): Entwurf {
  const art = FACHLAGEARTEN[bereich];
  const neu = wechsel.neu === "" || wechsel.neu === undefined ? null : wechsel.neu;
  return { typ: art.aenderung, nutzlast: { [art.idFeld]: id, feld }, vorher: wechsel.vorher ?? null, neu };
}
