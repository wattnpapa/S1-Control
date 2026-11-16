/**
 * Beispieldaten für die Renderertests des Blattes „Nachrichten"
 * (KONZEPT-NACHRICHTEN.md §6) — ausschliesslich für Tests.
 *
 * Drei Zeilen, wie Ring 2 sie liefert: ein gesichteter Eingang mit Blitz für
 * S4 (grün) und S2 (rot), ein gelesener Eingang an S1 (blau), und ein
 * Eingang vor dem Sichter ohne Verteiler.
 */

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Lagebild, Nachrichtenansicht } from "../../kontrakt/index.js";
import { BEISPIEL_LAGEBILD } from "./versorgungsbeispiel.js";

const JETZT = "2026-11-16T09:45:00.000Z";

function zeile(teile: Partial<Nachrichtenzeile> & Pick<Nachrichtenzeile, "id">): Nachrichtenzeile {
  return {
    richtung: "EINGANG",
    richtungKurz: "E",
    vorrangstufe: 2,
    gespraechsnotiz: false,
    nummerDoppelt: false,
    anschrift: "FüSt",
    betreff: "",
    inhalt: "",
    absender: "OV Wildeshausen",
    abfassungszeit: JETZT,
    verteiler: [],
    laufzustand: "VOR_SICHTER",
    zurueckgezogen: false,
    angelegtDurch: "a-0000000001" as Nachrichtenzeile["angelegtDurch"],
    angelegtMit: { millisekunden: 1, zaehler: 0, clientId: "a" },
    clientId: "a",
    fmzUeberSchwelle: false,
    ...teile,
  };
}

export const BLITZ_AN_S4 = zeile({
  id: "N-blitz",
  vorrang: "BLITZ",
  vorrangstufe: 0,
  nummer: 26,
  betreff: "Pumpen eingetroffen",
  inhalt: "Zwei Pumpen am Deich Nord.",
  laufzustand: "VERTEILT",
  sichtung: { zeitpunkt: JETZT, handzeichen: "Si", verteiler: [{ stelle: "S4", kopie: "GRUEN" }, { stelle: "S2", kopie: "ROT" }] },
  verteiler: [
    { stelle: "S4", kopie: "GRUEN", gelesen: false, erledigt: false },
    { stelle: "S2", kopie: "ROT", gelesen: false, erledigt: false },
  ],
});

export const GELESEN_AN_S1 = zeile({
  id: "N-gelesen",
  nummer: 27,
  betreff: "Verpflegung 18 Uhr",
  laufzustand: "VERTEILT",
  sichtung: { zeitpunkt: JETZT, handzeichen: "Si", verteiler: [{ stelle: "S1", kopie: "BLAU" }] },
  verteiler: [{ stelle: "S1", kopie: "BLAU", gelesen: true, kenntnis: { zeitpunkt: JETZT, handzeichen: "Mü" }, erledigt: false }],
});

export const VOR_SICHTER = zeile({ id: "N-offen", betreff: "Lage ruhig" });

export function nachrichtenansicht(zeilen: readonly Nachrichtenzeile[]): Nachrichtenansicht {
  return { lageZeiger: 7, zeilen, gesamtzahl: zeilen.length, von: 0, jetzt: JETZT, anschriften: ["Deich Nord", "Bergungsgruppe Oldenburg"] };
}

/** Das Lagebild eines Arbeitsplatzes mit den Stellen S1 und S4, Handzeichen „Mü". */
export const NACHRICHTEN_LAGEBILD: Lagebild = {
  ...BEISPIEL_LAGEBILD,
  nachrichten: { neuFuerStellen: 1, vorFmz: 0, vorSichter: 1, mitVorrangOffen: 1, ueberSchwelle: 0 },
  sitzung: { stellen: ["S1", "S4"], handzeichen: "Mü" },
};
