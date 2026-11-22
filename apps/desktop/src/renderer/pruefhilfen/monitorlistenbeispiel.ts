/**
 * Beispielzeilen für die Monitorlisten „Warteschlange" und „Lageticker" —
 * ausschließlich für Tests und die Vorschau. Handgeschrieben; die Rechnung
 * prüfen die Tests in `@s1/domaene`.
 */

import type { Tagebuchzeile } from "@s1/domaene";

import { zeile } from "./nachrichtenbeispiel.js";

export const WARTENDE = [
  zeile({ id: "W1", richtung: "AUSGANG", richtungKurz: "A", anschrift: "OV Varel", laufzustand: "VOR_FMZ", wartetSeit: 12, betreff: "geheim" }),
  zeile({ id: "W2", vorrang: "BLITZ", vorrangstufe: 0, absender: "EA 1 Deich Nord", laufzustand: "VOR_SICHTER", wartetSeitSichter: 4, inhalt: "nicht an die Wand" }),
  zeile({ id: "W3", vorrang: "SOFORT", vorrangstufe: 1, richtung: "AUSGANG", richtungKurz: "A", anschrift: "KatS-Stab", laufzustand: "VOR_FMZ", wartetSeit: 31, fmzUeberSchwelle: true }),
  zeile({ id: "W4", nummer: 41, absender: "Logistik", laufzustand: "VERTEILT" }),
  zeile({ id: "W5", richtung: "AUSGANG", richtungKurz: "A", anschrift: "FGr WP 2", laufzustand: "VOR_LDF", wartetSeitLdf: 6 }),
];

function eintrag(n: number, teil: Partial<Tagebuchzeile>): Tagebuchzeile {
  return {
    ereignisId: `a-${String(n).padStart(10, "0")}` as Tagebuchzeile["ereignisId"],
    typ: "StatusGesetzt",
    hlcText: String(n),
    wanduhr: "2026-09-10T14:30:00+02:00",
    akteur: "Bediener 1",
    rechner: "fuest-1",
    clientId: "a",
    satz: "",
    ...teil,
  };
}

export const TICKER: readonly Tagebuchzeile[] = [
  eintrag(5, { satz: "FGr WP 2 OV Oldenburg: Status gesetzt: Anmarsch → Im Einsatz", wanduhr: "2026-09-10T14:41:00+02:00" }),
  eintrag(4, { typ: "EinheitStammdatenGeaendert", satz: "FGr WP 2: Bemerkung geändert" }),
  eintrag(3, { typ: "AuftragErfasst", satz: "BGr OV Varel: Auftrag „Sandsäcke füllen, Halle 3“", wanduhr: "2026-09-10T14:20:00+02:00" }),
  eintrag(2, { typ: "Rueckgaengig", satz: "Zurückgenommen: Verschiebung SEG Betreuung", undoOf: "a-0000000001" as Tagebuchzeile["ereignisId"], wanduhr: "2026-09-10T14:05:00+02:00" }),
];
