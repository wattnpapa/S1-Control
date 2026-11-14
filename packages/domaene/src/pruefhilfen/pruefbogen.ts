/**
 * Ein THW-Erfassungsbogen fuer Tests — ausschliesslich fuer Tests.
 *
 * Gekuerzt aus `pruefdaten/eeb/thw/001-albstadt-ztr-tz.json`: Der Ring 2
 * liest keine Dateien, auch nicht in Tests.
 */

import { OrganisationsTyp, type Erfassungsbogen } from "@bos/eeb-format";

/** Zugtrupp TZ Albstadt: Einheitstyp 3, Ebenen 1–3, FüKW, MzKW (Freitext), ein ZFü. */
export function pruefbogen(): Erfassungsbogen {
  const funkruf = (zweite: number) => ({
    kennwort: { code: 1 },
    eigenerStandort: true,
    teile: [21, zweite],
  });
  return {
    schemaVersion: 8,
    stand: 3_440_645,
    einheit: {
      organisation: OrganisationsTyp.THW,
      einheitsTyp: { code: 3 },
      hierarchie: [
        { bezeichnung: { code: 1 }, name: "Albstadt", kurz: "OALB" },
        { bezeichnung: { code: 2 }, name: "Tübingen" },
        { bezeichnung: { code: 3 }, name: "Baden-Württemberg" },
      ],
    },
    personalErfassung: 0,
    personal: [
      {
        vorname: "Max",
        nachname: "Muster",
        staerkeRolle: 2,
        funktionen: [{ code: 1 }],
        fahrerlaubnis: 9,
        geschlecht: 1,
        ernaehrung: 1,
        kontakte: [],
        zusatzqualifikationen: [],
      },
    ],
    fahrzeuge: [
      { typ: { code: 2 }, stanKonform: true, kennzeichen: "THW-80101", funkrufname: funkruf(10) },
      { typ: { freitext: "MzKW" }, stanKonform: false, kennzeichen: "THW-80102", funkrufname: funkruf(54) },
    ],
  } as unknown as Erfassungsbogen;
}
