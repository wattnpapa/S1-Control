/**
 * Stärketafeln für die Monitoransichten „Abschnitte", „Organisationen",
 * „Status", „Einsatzmittel" und „Kommen und Gehen".
 *
 * Handgeschrieben und nicht aus Ring 2 gerechnet: Die Rechnung prüfen die
 * Tests in `@s1/domaene` (`staerketafel.test.ts`); hier geht es darum, was der
 * Monitor aus der fertigen Tafel macht. Die Zahlen sind erfunden.
 */

import type { Staerke, Staerketafelzeile, Statuszeile } from "@s1/domaene";

import type { Staerketafelansicht } from "../../kontrakt/index.js";

function z(schluessel: string, name: string, s: readonly [number, number, number], erwartet = 0, tiefe = 0): Staerketafelzeile {
  const staerke: Staerke = { fuehrer: s[0], unterfuehrer: s[1], mannschaft: s[2] };
  return { schluessel, name, tiefe, staerke, gesamt: s[0] + s[1] + s[2], erwartet };
}

/** Statuszeile aus [Einheiten, Köpfe] je Spalte: im Einsatz, bereit, Ruhe, nicht einsatzbereit. */
function st(im: readonly [number, number], bereit: readonly [number, number] = [0, 0], ruhe: readonly [number, number] = [0, 0], neb: readonly [number, number] = [0, 0]): Statuszeile {
  const zelle = (w: readonly [number, number]): { einheiten: number; koepfe: number } => ({ einheiten: w[0], koepfe: w[1] });
  return { IM_EINSATZ: zelle(im), EINSATZBEREIT: zelle(bereit), RUHE: zelle(ruhe), NICHT_EINSATZBEREIT: zelle(neb), SONSTIGE: zelle([0, 0]) };
}

export const BEISPIEL_STAERKETAFEL: Staerketafelansicht = {
  lageZeiger: 12,
  tafel: {
    abschnitte: [
      z("LG", "LG", [3, 4, 6]),
      z("WTM", "LK Wittmund", [8, 22, 144]),
      z("FRI", "LK Friesland", [20, 56, 360], 18),
      z("FRI-S", "Strand Schillig", [6, 14, 90], 0, 1),
      z("WHV", "Stadt Wilhelmshaven", [15, 48, 325]),
    ],
    anmarsch: z("ANMARSCH", "Angefordert / Anmarsch", [2, 6, 40]),
    organisationen: [
      z("THW", "THW", [20, 60, 300], 18),
      z("FEUERWEHR", "Feuerwehr", [18, 50, 420]),
      z("DRK", "DRK", [8, 20, 115], 48),
    ],
    gesamt: z("GESAMT", "Gesamt", [46, 130, 835], 66),
    kreuz: {
      LG: { THW: 13 },
      WTM: { FEUERWEHR: 174 },
      FRI: { THW: 200, FEUERWEHR: 150, DRK: 86 },
      "FRI-S": { THW: 110 },
      WHV: { THW: 57, FEUERWEHR: 164, DRK: 167 },
    },
    // Je Zeile dieselben Köpfe wie oben: Die Statustafel teilt die Ist-Stärke nur auf.
    status: {
      jeOrganisation: {
        THW: st([12, 240], [3, 60], [4, 70], [1, 10]),
        FEUERWEHR: st([20, 400], [0, 0], [5, 88]),
        DRK: st([6, 100], [3, 43]),
      },
      jeAbschnitt: {
        LG: st([2, 13]),
        WTM: st([9, 174]),
        FRI: st([10, 200], [3, 60], [4, 66]),
        "FRI-S": st([6, 110]),
        WHV: st([11, 243], [3, 43], [5, 92], [1, 10]),
      },
      gesamt: st([38, 740], [6, 103], [9, 158], [1, 10]),
    },
    kommenGehen: [
      { schluessel: "bis/E1", art: "verfuegbarBis", name: "FGr WP 1 OV Oldenburg", zeitpunkt: "2026-09-10T13:00:00+02:00" },
      { schluessel: "anforderung/A2", art: "zugesagt", name: "BGr OV Varel", zeitpunkt: "2026-09-10T18:00:00+02:00", zusatz: "löst FGr WP 1 OV Oldenburg ab" },
      { schluessel: "bis/E2", art: "verfuegbarBis", name: "2. Zug FF Hude", zeitpunkt: "2026-09-11T06:00:00+02:00" },
      { schluessel: "anforderung/A1", art: "angefordert", name: "SEG Betreuung", zeitpunkt: "2026-09-10T12:10:00+02:00", zusatz: "Betreuungsplatz Rastede" },
      { schluessel: "anmarsch/E3", art: "anmarsch", name: "FGr WP OV Vechta" },
    ],
  },
};
