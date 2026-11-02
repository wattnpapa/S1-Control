/**
 * Ein Funkplan zum Prüfen der Oberfläche (KONZEPT-FUNKPLAN.md §5) — die Lage
 * der Mockups („Hochwasser Oldenburg", Option 5b), verkürzt.
 *
 * Handgeschrieben und nicht aus Ring 2 gerechnet: Die Rechnung prüfen die
 * Tests in `@s1/domaene`; hier geht es darum, was die Oberfläche aus dem
 * fertigen Plan macht. Die Rufgruppennamen sind erfunden.
 */

import type { Funkprobenzeile, Funkteilnehmer, Rufgruppenkarte } from "@s1/domaene";

import type { Funkplanansicht } from "../../kontrakt/index.js";

/** Eine Uhrzeit am 10.09.2026 in der Ortszeit — die Marken zeigen Ortszeit. */
export function um(stunde: number, minute: number): string {
  return new Date(2026, 8, 10, stunde, minute).toISOString();
}

function teilnehmer(einheitId: string, einheit: string, abschnittId: string, bereich: string, weiteres: Partial<Funkteilnehmer> = {}): Funkteilnehmer {
  return {
    einheitId,
    einheit,
    abschnittId,
    bereich,
    status: "IM_EINSATZ",
    funkrufname: "",
    erreichbarkeit: "",
    erwartet: false,
    rufgruppeAufgeloest: false,
    bereichWeichtAb: false,
    hinweis: "",
    funkhinweis: "",
    weitereRufgruppen: [],
    ...weiteres,
  };
}

const E1 = teilnehmer("E1", "Abschnittsleitung EA 1 Deich Nord", "EA1", "EA 1 Deich Nord", {
  rufgruppeId: "R1",
  rufgruppe: "THW_OL_FUE",
  funkrufname: "Heros Delmenhorst 22/10",
  erreichbarkeit: "ZFü Albers / 0170-5512",
  letzterKontakt: { art: "FUNKPROBE", zeitpunkt: um(14, 31), ueberSchwelle: false },
  letzteFunkproben: { KONTAKT: { zeitpunkt: um(14, 31), rufgruppeId: "R1" } },
});
const E2 = teilnehmer("E2", "FGr WP OV Cloppenburg", "EA2", "EA 2 Pumpen Süd", {
  rufgruppeId: "R2",
  rufgruppe: "THW_OL_EA2",
  funkrufname: "Heros Cloppenburg 28/51",
  // Seit 1250 still, um 1305 ohne Kontakt geprobt: Bernstein und „kein Kontakt" daneben.
  letzterKontakt: { art: "FUNKPROBE", zeitpunkt: um(12, 50), ueberSchwelle: true },
  keinKontaktGemeldet: { zeitpunkt: um(13, 5), rufgruppeId: "R2", grund: "Funkloch Deich" },
  letzteFunkproben: {
    KONTAKT: { zeitpunkt: um(12, 50), rufgruppeId: "R2" },
    KEIN_KONTAKT: { zeitpunkt: um(13, 5), rufgruppeId: "R2", grund: "Funkloch Deich" },
  },
});
const E3 = teilnehmer("E3", "FGr Ortung 1 OV Varel", "EA1", "EA 1 Deich Nord", {
  rufgruppeId: "R2",
  rufgruppe: "THW_OL_EA2",
  status: "NICHT_EINSATZBEREIT",
  bereichWeichtAb: true,
  hinweis: "Bereich ≠ Gruppe",
});
const E4 = teilnehmer("E4", "FGr N 2 OV Cloppenburg", "EA3", "EA 3 Evakuierung", {
  rufgruppeId: "R3",
  rufgruppe: "DMO 310",
  funkrufname: "Heros Cloppenburg 28/71",
});
const E5 = teilnehmer("E5", "FGr Notversorgung 2 OV Cloppenburg", "ANG", "Angefordert", {
  status: "ANGEFORDERT",
  erwartet: true,
});
const E6 = teilnehmer("E6", "SEG DLRG Oldenburg", "ANG", "Angefordert", {
  rufgruppeId: "R5",
  rufgruppe: "THW_OL_BR",
  rufgruppeAufgeloest: true,
  status: "ANGEFORDERT",
  erwartet: true,
});

const R1: Rufgruppenkarte = { rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_FUE", zweck: "Führung", hoert: "FmZ Platz 1", aufgeloest: false, teilnehmer: [E1], mithoerer: [] };
const R2: Rufgruppenkarte = {
  rufgruppeId: "R2",
  betriebsart: "TMO",
  name: "THW_OL_EA2",
  zweck: "Arbeitsgruppe EA 2",
  hoert: "Abschnittsleitung EA 2",
  bemerkung: "Bei Netzausfall auf DMO 311 ausweichen",
  abschnittId: "EA2",
  bereich: "EA 2 Pumpen Süd",
  aufgeloest: false,
  teilnehmer: [E2, E3],
  mithoerer: [],
};
const R3: Rufgruppenkarte = { rufgruppeId: "R3", betriebsart: "DMO", name: "DMO 310", zweck: "EA 3 Evakuierung", gateway: "Heros Varel 25/10", aufgeloest: false, teilnehmer: [E4], mithoerer: [] };
const R4: Rufgruppenkarte = { rufgruppeId: "R4", betriebsart: "ANALOG", name: "2 m K 55 G/U", zweck: "Ortsfunk FF Hude", aufgeloest: false, teilnehmer: [], mithoerer: [] };
const R5: Rufgruppenkarte = { rufgruppeId: "R5", betriebsart: "TMO", name: "THW_OL_BR", aufgeloest: true, aufgeloestAm: new Date(2026, 8, 10, 12, 10).toISOString(), teilnehmer: [], mithoerer: [] };

const FUNKPROBEN: readonly Funkprobenzeile[] = [
  { ereignisId: "a-3", einheitId: "E1", einheit: E1.einheit, rufgruppeId: "R1", rufgruppe: "THW_OL_FUE", ergebnis: "KONTAKT", zeitpunkt: um(14, 31), akteur: "Meier", zurueckgenommen: false },
  { ereignisId: "a-2", einheitId: "E2", einheit: E2.einheit, rufgruppeId: "R2", rufgruppe: "THW_OL_EA2", ergebnis: "KEIN_KONTAKT", zeitpunkt: um(13, 5), akteur: "Meier", grund: "Funkloch Deich", zurueckgenommen: false },
  { ereignisId: "a-1", einheitId: "E2", einheit: E2.einheit, rufgruppeId: "R2", rufgruppe: "THW_OL_EA2", ergebnis: "KONTAKT", zeitpunkt: um(11, 40), akteur: "Rudolph", zurueckgenommen: true },
];

export const FUNK_ANSICHT: Funkplanansicht = {
  lageZeiger: 7,
  plan: {
    rufgruppen: [R1, R2, R3, R4, R5],
    ohneRufgruppe: [E5, E6],
    jeBereich: [
      { abschnittId: "EA1", name: "EA 1 Deich Nord", teilnehmer: [E1, E3] },
      { abschnittId: "EA2", name: "EA 2 Pumpen Süd", teilnehmer: [E2] },
      { abschnittId: "EA3", name: "EA 3 Evakuierung", teilnehmer: [E4] },
      { abschnittId: "ANG", name: "Angefordert", teilnehmer: [E5, E6] },
    ],
    zahlen: { rufgruppen: 4, zugeordnet: 4, ohneRufgruppe: 2, dmoOderGateway: 1, ohneKontakt: 1, letzteFunkprobe: um(14, 31) },
    schwelleMinuten: 60,
  },
  bereiche: [
    { abschnittId: "EA1", name: "EA 1 Deich Nord", tiefe: 0 },
    { abschnittId: "EA2", name: "EA 2 Pumpen Süd", tiefe: 0 },
    { abschnittId: "EA3", name: "EA 3 Evakuierung", tiefe: 0 },
  ],
  jetzt: um(14, 43),
  funkproben: FUNKPROBEN,
};
