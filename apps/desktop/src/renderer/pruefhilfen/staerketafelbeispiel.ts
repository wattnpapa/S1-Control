/**
 * Stärketafeln für die Monitoransichten „Abschnitte" und „Organisationen".
 *
 * Handgeschrieben und nicht aus Ring 2 gerechnet: Die Rechnung prüfen die
 * Tests in `@s1/domaene` (`staerketafel.test.ts`); hier geht es darum, was der
 * Monitor aus der fertigen Tafel macht. Die Zahlen sind erfunden.
 */

import type { Staerke, Staerketafelzeile } from "@s1/domaene";

import type { Staerketafelansicht } from "../../kontrakt/index.js";

function z(schluessel: string, name: string, s: readonly [number, number, number], erwartet = 0, tiefe = 0): Staerketafelzeile {
  const staerke: Staerke = { fuehrer: s[0], unterfuehrer: s[1], mannschaft: s[2] };
  return { schluessel, name, tiefe, staerke, gesamt: s[0] + s[1] + s[2], erwartet };
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
  },
};
