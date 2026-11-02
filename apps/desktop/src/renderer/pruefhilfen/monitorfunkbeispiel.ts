/**
 * Ein Funkplan für die Monitoransicht (Funkplan F4) — die Lage der Option 5a
 * („Hochwasser Oldenburg", 101443SEP26) mit sechs Rufgruppen, dazu eine
 * Fassung mit beliebig vielen Gruppen für die Schriftgröße.
 *
 * Handgeschrieben und nicht aus Ring 2 gerechnet: Die Rechnung prüfen die
 * Tests in `@s1/domaene`; hier geht es darum, was der Monitor aus dem fertigen
 * Plan macht. Die Rufgruppennamen sind erfunden.
 */

import type { Funkteilnehmer, Rufgruppenkarte } from "@s1/domaene";

import { BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./versorgungsbeispiel.js";
import type { Funkplanansicht, Lagebild } from "../../kontrakt/index.js";

/** Eine Uhrzeit am 10.09.2026 in der Ortszeit. */
function um(stunde: number, minute: number): string {
  return new Date(2026, 8, 10, stunde, minute).toISOString();
}

export function teilnehmer(einheitId: string, einheit: string, funkrufname: string, weiteres: Partial<Funkteilnehmer> = {}): Funkteilnehmer {
  return {
    einheitId,
    einheit,
    abschnittId: "EA",
    bereich: "Einsatzabschnitt",
    status: "IM_EINSATZ",
    funkrufname,
    erreichbarkeit: "",
    erwartet: false,
    rufgruppeAufgeloest: false,
    bereichWeichtAb: false,
    hinweis: "",
    funkhinweis: "",
    weitereRufgruppen: [],
    letzterKontakt: { art: "FUNKPROBE", zeitpunkt: um(14, 31), ueberSchwelle: false },
    ...weiteres,
  };
}

export function gruppe(rufgruppeId: string, name: string, teilnehmerListe: readonly Funkteilnehmer[], weiteres: Partial<Rufgruppenkarte> = {}): Rufgruppenkarte {
  return { rufgruppeId, betriebsart: "TMO", name, aufgeloest: false, teilnehmer: teilnehmerListe, mithoerer: [], ...weiteres };
}

const HUDE = teilnehmer("FFH", "2. Zug FF Hude", "Florian Hude 20/1", { status: "ANMARSCH" });

/** Die sechs geltenden Gruppen der Option 5a und eine aufgelöste, die nicht an die Wand gehört. */
export const MONITOR_RUFGRUPPEN: readonly Rufgruppenkarte[] = [
  gruppe("R1", "THW_OL_FUE", [
    teilnehmer("EA1", "EA 1 Deich Nord", "Heros Delmenhorst 22/10"),
    teilnehmer("EA2", "EA 2 Pumpen Süd", "Heros Oldenburg 21/19"),
    teilnehmer("EA3", "EA 3 Evakuierung", "Heros Varel 25/10"),
    teilnehmer("LOG", "Logistik", "Heros Oldenburg 21/10", { status: "RUHE" }),
    teilnehmer("BR", "Bereitstellungsraum", "Heros Brake 26/10", { status: "EINSATZBEREIT" }),
  ], { zweck: "Führung · FüSt ↔ Abschnitte", hoert: "FmZ Platz 1" }),
  gruppe("R2", "ZA_OL_HW_1", [
    teilnehmer("KFB", "KFB Kreis Oldenburg", "Florian Oldenburg-Land 10/1"),
    HUDE,
    teilnehmer("JUH", "SEG JUH Weser-Ems", "Akkon Oldenburg 71/1"),
  ], { zweck: "Zusammenarbeit · Kreis OL, FF, JUH", hoert: "FmZ Platz 2" }),
  gruppe("R3", "THW_OL_EA1", [
    teilnehmer("RA", "FGr Räumen A OV Delmenhorst", "Heros Delmenhorst 23/51"),
    teilnehmer("WP1", "FGr WP 1 OV Oldenburg", "Heros Oldenburg 21/51"),
    teilnehmer("E", "FGr E OV Wildeshausen", "Heros Wildeshausen 24/58"),
    teilnehmer("WG2", "FGr Wassergefahren 2 OV Brake", "Heros Brake 27/61", { status: "RUHE" }),
  ], { zweck: "Arbeitsgruppe EA 1 Deich Nord", hoert: "EA 1 · FmZ mit" }),
  gruppe("R4", "THW_OL_EA2", [
    teilnehmer("WPC", "FGr WP OV Cloppenburg", "Heros Cloppenburg 28/51"),
    teilnehmer("O1", "FGr Ortung 1 OV Varel", "Heros Varel 25/42", { status: "NICHT_EINSATZBEREIT" }),
    teilnehmer("WP2", "FGr WP 2 OV Oldenburg", "Heros Oldenburg 21/52", {
      letzterKontakt: { art: "FUNKPROBE", zeitpunkt: um(12, 50), ueberSchwelle: true },
    }),
  ], { zweck: "Arbeitsgruppe EA 2 Pumpen Süd", hoert: "EA 2" }),
  gruppe("R5", "DMO 310", [
    teilnehmer("N2", "FGr N 2 OV Cloppenburg", "Heros Cloppenburg 28/71"),
    teilnehmer("B", "Bergungsgruppe OV Varel", "Heros Varel 25/22"),
    teilnehmer("ZTr", "ZTr OV Varel", "Heros Varel 25/10"),
  ], { betriebsart: "DMO", zweck: "EA 3 Evakuierung · Netz gestört seit 1320", gateway: "Heros Varel 25/10" }),
  gruppe("R6", "2 m Kanal 55 G/U", [], { betriebsart: "ANALOG", zweck: "Ortsfunk FF Hude · bis Umstellung", hoert: "Melder BR", mithoerer: [HUDE] }),
  gruppe("R7", "THW_OL_BR", [], { aufgeloest: true, aufgeloestAm: um(12, 10) }),
];

const OHNE = [
  teilnehmer("NV2", "FGr Notversorgung 2 OV Cloppenburg", "Heros Cloppenburg 28/72", { status: "ANMARSCH", erwartet: true }),
  teilnehmer("DLRG", "SEG DLRG Oldenburg", "", { status: "ANGEFORDERT", erwartet: true }),
];

/** Der Plan mit diesen Rufgruppen; Zahlen wie die Projektion sie zählte. */
export function monitorFunkansicht(rufgruppen: readonly Rufgruppenkarte[] = MONITOR_RUFGRUPPEN, ohneRufgruppe: readonly Funkteilnehmer[] = OHNE): Funkplanansicht {
  const geltend = rufgruppen.filter((r) => !r.aufgeloest);
  const alle = geltend.flatMap((r) => r.teilnehmer);
  return {
    lageZeiger: 12,
    plan: {
      rufgruppen,
      ohneRufgruppe,
      jeBereich: [],
      zahlen: {
        rufgruppen: geltend.length,
        zugeordnet: alle.length,
        ohneRufgruppe: ohneRufgruppe.length,
        dmoOderGateway: geltend.filter((r) => r.betriebsart === "DMO").length,
        ohneKontakt: alle.filter((t) => t.letzterKontakt?.ueberSchwelle === true).length,
        letzteFunkprobe: um(14, 31),
      },
      schwelleMinuten: 60,
    },
    bereiche: [],
    jetzt: new Date(BEISPIEL_JETZT).toISOString(),
    funkproben: [],
  };
}

/** `anzahl` Rufgruppen mit je drei Teilnehmern — für die Schrift bei vielen Gruppen. */
export function vieleRufgruppen(anzahl: number): readonly Rufgruppenkarte[] {
  return Array.from({ length: anzahl }, (_, i) => {
    const nr = String(i + 1);
    return gruppe(`V${nr}`, `THW_OL_EA${nr}`, [
      teilnehmer(`V${nr}a`, `FGr WP ${nr} OV Oldenburg`, `Heros Oldenburg 21/${nr}1`),
      teilnehmer(`V${nr}b`, `Bergungsgruppe ${nr} OV Varel`, `Heros Varel 25/${nr}2`),
      teilnehmer(`V${nr}c`, `FGr Räumen ${nr} OV Brake`, `Heros Brake 26/${nr}3`),
    ], { zweck: `Arbeitsgruppe EA ${nr}`, hoert: `EA ${nr}` });
  });
}

/** Das Lagebild der Beispiellage mit `funk` passend zum Plan. */
export function monitorFunklage(ansicht: Funkplanansicht = monitorFunkansicht()): Lagebild {
  const z = ansicht.plan.zahlen;
  return {
    ...BEISPIEL_LAGEBILD,
    funk: { rufgruppen: z.rufgruppen, zugeordnet: z.zugeordnet, ohneRufgruppe: z.ohneRufgruppe, ohneKontakt: z.ohneKontakt, ...(z.letzteFunkprobe === undefined ? {} : { letzteFunkprobe: z.letzteFunkprobe }) },
  };
}
