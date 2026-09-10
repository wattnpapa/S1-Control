/**
 * Die synthetische Prüflage — das Orakel für die Ausgaben (M4.0).
 *
 * **Sie ist nicht die Referenzlage.** Entscheidung 8 des Umsetzungsplans legt
 * fest, dass Johannes und die Führungsstelle eine Übungslage von Hand in der
 * Excel erfassen und ausdrucken; erst gegen diese Ausdrucke lässt sich die
 * Parität Zeile für Zeile prüfen, und erst dann ist Prüfpunkt 3 erreicht. Die
 * Lage hier ersetzt sie nicht und tut auch nicht so.
 *
 * **Wofür sie da ist:** Ein Goldfile braucht eine Lage, und eine Lage, die
 * jeder Test sich selbst zusammenwürfelt, ist bei drei Ausgaben dreimal eine
 * andere. Diese hier ist **eine** Lage, gebaut nach denselben Vorgaben, die
 * Entscheidung 8 für die Referenzlage nennt — rund 40 Einheiten, drei
 * Einsatzstellen, ein Bereitstellungsraum, alle Status- und Schichtwerte. Wenn
 * die echte Referenzlage vorliegt, ist der Vergleich damit ein Vergleich
 * zweier Lagen desselben Zuschnitts und nicht „ungefähr dasselbe".
 *
 * **Was sie ausdrücklich enthält**, weil es sonst in keiner Ausgabe geprüft
 * wäre:
 *
 *  * alle neun Statuswerte (§5.4) und alle vier Schichtwerte, damit die
 *    Matrizen des Blatts „Status" keine leere Zeile haben, die niemand sieht;
 *  * einen Abschnitt vom Typ `ANGEFORDERT`, weil er in der Gesamtstärke
 *    **nicht** zählt und im Druckblatt **nicht** erscheint — die eine Regel,
 *    an der sich Druck und Status unterscheiden (§4.1, §4.2 der
 *    Bestandsaufnahme);
 *  * eine **aufgeteilte** Einheit, weil ihre Wirkung relativ ist (§5.4.2) und
 *    eine Summe, die das nicht beachtet, um den Abzug danebenliegt;
 *  * eine **entfernte** Einheit, weil sie im Zustand bleibt und in keiner
 *    Summe auftauchen darf (§5.4.5);
 *  * einen leeren Abschnitt, weil das Druckblatt Zeilen ohne Stärke
 *    ausblendet (§4.1: `Worksheet_Activate`);
 *  * Einheiten mehrerer Organisationen, weil der Organisationsfilter des
 *    Druckblatts sonst nichts zu filtern hätte.
 *
 * Bewusst **nicht** enthalten: Konflikthinweise. Sie gehören in die Prüffälle
 * des Folds und nicht in ein Ausgabe-Goldfile — eine Lage mit Hinweisen macht
 * jede Zahländerung zu einer Untersuchung.
 */

import type { EingehendesEreignis } from "../fold.js";
import { EINHEIT_STATUS, SCHICHTEN } from "../ereignis.js";
import {
  abschnittAngelegt,
  einheitGemeldet,
  einsatzAngelegt,
  hlc,
  staerke,
  statusGesetzt,
} from "./ereignisbau.js";

/** Die Kennung der Prüflage; sie steht in jedem Goldfile. */
export const PRUEFLAGE_ID = "2026-09-08-uebung-weser-ems";

const CLIENT = "p";

let laufnummer = 0;
function naechste(): number {
  laufnummer += 1;
  return laufnummer;
}

/** Ein Ereignis mit fortlaufender HLC — die Reihenfolge ist die der Erfassung. */
function bau(bauer: (h: ReturnType<typeof hlc>, nummer: number) => EingehendesEreignis): EingehendesEreignis {
  const nummer = naechste();
  return bauer(hlc(nummer * 1000, 0, CLIENT), nummer);
}

interface Einheitsangabe {
  readonly id: string;
  readonly abschnittId: string;
  readonly bezeichnung: string;
  readonly organisation: string;
  readonly ebene: string;
  readonly staerke: readonly [number, number, number];
  readonly status: string;
  readonly schicht?: string;
  readonly herkunft: string;
}

/**
 * Die Abschnitte der Prüflage.
 *
 * Die Typen sind die aus §5.3, und ihre Wahl ist die Aussage: `MELDEKOPF` und
 * `LOGISTIK` zählen mit, `ANGEFORDERT` nicht, und der leere Einsatzort steht
 * da, damit das Druckblatt etwas zum Ausblenden hat.
 */
const ABSCHNITTE: readonly {
  readonly id: string;
  readonly name: string;
  readonly typ: string;
  readonly reihenfolge: number;
  readonly parentId?: string;
}[] = [
  { id: "FUEST", name: "FüSt Oldenburg", typ: "FUEHRUNGSSTELLE", reihenfolge: 1 },
  { id: "MK", name: "Meldekopf", typ: "MELDEKOPF", reihenfolge: 2 },
  { id: "LOG", name: "Logistik", typ: "LOGISTIK", reihenfolge: 3 },
  { id: "BR1", name: "Bereitstellungsraum Hafen", typ: "BEREITSTELLUNGSRAUM", reihenfolge: 4 },
  { id: "EO1", name: "EA Deich Nord", typ: "EINSATZORT", reihenfolge: 5 },
  { id: "EO1-A", name: "UA Deichfuß", typ: "EINSATZORT", reihenfolge: 1, parentId: "EO1" },
  { id: "EO2", name: "EA Pumpwerk Süd", typ: "EINSATZORT", reihenfolge: 6 },
  { id: "EO3", name: "EA Schule Mitte", typ: "EINSATZORT", reihenfolge: 7 },
  // Der leere Einsatzort: keine Einheit, keine Stärke. §4.1 der
  // Bestandsaufnahme blendet solche Zeilen im Druckblatt aus.
  { id: "EO4", name: "EA Reserve", typ: "EINSATZORT", reihenfolge: 8 },
  { id: "ANF", name: "Angefordert / Anmarsch", typ: "ANGEFORDERT", reihenfolge: 9 },
];

/**
 * Die Einheiten der Prüflage — 40 Stück.
 *
 * Die ersten neun tragen je einen der neun Statuswerte, die ersten vier je
 * einen der vier Schichtwerte. Danach folgen realistische Kräfte in
 * Verteilung und Stärke; die Zahlen sind an den STAN-Soll-Stärken orientiert
 * und nicht gewürfelt, damit ein Ausdruck plausibel aussieht, wenn ihn jemand
 * neben den der Excel legt.
 */
const EINHEITEN: readonly Einheitsangabe[] = [
  // Führungsstelle und Meldekopf
  { id: "E01", abschnittId: "FUEST", bezeichnung: "Stab FüSt", organisation: "THW", ebene: "ZUGTRUPP", staerke: [2, 3, 1], status: "IM_EINSATZ", schicht: "TAG", herkunft: "THW OV Oldenburg" },
  { id: "E02", abschnittId: "FUEST", bezeichnung: "Stab FüSt Nacht", organisation: "THW", ebene: "ZUGTRUPP", staerke: [1, 2, 1], status: "IM_EINSATZ", schicht: "NACHT", herkunft: "THW OV Oldenburg" },
  { id: "E03", abschnittId: "MK", bezeichnung: "Meldekopf", organisation: "THW", ebene: "TRUPP", staerke: [1, 1, 1], status: "IM_EINSATZ", schicht: "FRUEH", herkunft: "THW OV Delmenhorst" },
  { id: "E04", abschnittId: "MK", bezeichnung: "Meldekopf Spät", organisation: "THW", ebene: "TRUPP", staerke: [0, 1, 2], status: "EINSATZBEREIT", schicht: "SPAET", herkunft: "THW OV Delmenhorst" },
  // Logistik
  { id: "E05", abschnittId: "LOG", bezeichnung: "FGr Logistik-Verpflegung", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 6], status: "IM_EINSATZ", schicht: "TAG", herkunft: "THW OV Wildeshausen" },
  { id: "E06", abschnittId: "LOG", bezeichnung: "Betreuungsgruppe", organisation: "DRK", ebene: "GRUPPE", staerke: [1, 2, 9], status: "IM_EINSATZ", schicht: "TAG", herkunft: "DRK KV Oldenburg" },
  { id: "E07", abschnittId: "LOG", bezeichnung: "Verpflegungstrupp", organisation: "JUH", ebene: "TRUPP", staerke: [0, 1, 4], status: "RUHE", schicht: "NACHT", herkunft: "JUH RV Weser-Ems" },
  // Bereitstellungsraum
  { id: "E08", abschnittId: "BR1", bezeichnung: "TZ THW Bereitstellung", organisation: "THW", ebene: "ZUG", staerke: [1, 3, 14], status: "EINSATZBEREIT", schicht: "TAG", herkunft: "THW OV Varel" },
  { id: "E09", abschnittId: "BR1", bezeichnung: "LZ FW Bereitstellung", organisation: "FEUERWEHR", ebene: "ZUG", staerke: [1, 4, 17], status: "EINSATZBEREIT", schicht: "TAG", herkunft: "FF Rastede" },
  { id: "E10", abschnittId: "BR1", bezeichnung: "SanZ Bereitstellung", organisation: "ASB", ebene: "ZUG", staerke: [1, 2, 12], status: "RUFBEREITSCHAFT", schicht: "NACHT", herkunft: "ASB RV Oldenburg" },
  // EA Deich Nord
  { id: "E11", abschnittId: "EO1", bezeichnung: "ZTr THW Deich", organisation: "THW", ebene: "ZUGTRUPP", staerke: [1, 1, 2], status: "IM_EINSATZ", schicht: "TAG", herkunft: "THW OV Oldenburg" },
  { id: "E12", abschnittId: "EO1", bezeichnung: "BGr 1 Oldenburg", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 8], status: "IM_EINSATZ", schicht: "TAG", herkunft: "THW OV Oldenburg" },
  { id: "E13", abschnittId: "EO1", bezeichnung: "BGr 2 Oldenburg", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 8], status: "IM_EINSATZ", schicht: "NACHT", herkunft: "THW OV Oldenburg" },
  { id: "E14", abschnittId: "EO1", bezeichnung: "FGr Wasserschaden", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 5], status: "IM_EINSATZ", schicht: "TAG", herkunft: "THW OV Brake" },
  { id: "E15", abschnittId: "EO1-A", bezeichnung: "FGr Räumen A", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 6], status: "IM_EINSATZ", schicht: "TAG", herkunft: "THW OV Jever" },
  { id: "E16", abschnittId: "EO1-A", bezeichnung: "LG Rastede", organisation: "FEUERWEHR", ebene: "GRUPPE", staerke: [1, 1, 7], status: "IM_EINSATZ", schicht: "TAG", herkunft: "FF Rastede" },
  { id: "E17", abschnittId: "EO1-A", bezeichnung: "Sandsackkolonne", organisation: "REGIE", ebene: "GRUPPE", staerke: [0, 2, 20], status: "IM_EINSATZ", schicht: "TAG", herkunft: "Landkreis Ammerland" },
  // EA Pumpwerk Süd
  { id: "E18", abschnittId: "EO2", bezeichnung: "ZTr THW Pumpwerk", organisation: "THW", ebene: "ZUGTRUPP", staerke: [1, 1, 2], status: "IM_EINSATZ", schicht: "TAG", herkunft: "THW OV Wilhelmshaven" },
  { id: "E19", abschnittId: "EO2", bezeichnung: "FGr Wasserschaden/Pumpen", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 5], status: "IM_EINSATZ", schicht: "TAG", herkunft: "THW OV Wilhelmshaven" },
  { id: "E20", abschnittId: "EO2", bezeichnung: "FGr Elektroversorgung", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 4], status: "IM_EINSATZ", schicht: "NACHT", herkunft: "THW OV Aurich" },
  { id: "E21", abschnittId: "EO2", bezeichnung: "AB HFS Bereitschaft", organisation: "FEUERWEHR", ebene: "STAFFEL", staerke: [0, 1, 5], status: "EINSATZBEREIT", schicht: "TAG", herkunft: "FF Oldenburg" },
  { id: "E22", abschnittId: "EO2", bezeichnung: "Trupp Aufklärung", organisation: "THW", ebene: "TRUPP", staerke: [0, 1, 2], status: "RUECKMARSCH", schicht: "TAG", herkunft: "THW OV Emden" },
  // EA Schule Mitte
  { id: "E23", abschnittId: "EO3", bezeichnung: "Betreuungszug", organisation: "DRK", ebene: "ZUG", staerke: [1, 3, 16], status: "IM_EINSATZ", schicht: "TAG", herkunft: "DRK KV Oldenburg" },
  { id: "E24", abschnittId: "EO3", bezeichnung: "Gr Betreuung Nacht", organisation: "DRK", ebene: "GRUPPE", staerke: [0, 1, 8], status: "IM_EINSATZ", schicht: "NACHT", herkunft: "DRK KV Oldenburg" },
  { id: "E25", abschnittId: "EO3", bezeichnung: "St PSNV", organisation: "MHD", ebene: "STAFFEL", staerke: [0, 1, 3], status: "IM_EINSATZ", schicht: "TAG", herkunft: "MHD Weser-Ems" },
  { id: "E26", abschnittId: "EO3", bezeichnung: "St Registrierung", organisation: "JUH", ebene: "STAFFEL", staerke: [0, 1, 3], status: "EINSATZBEREIT", schicht: "TAG", herkunft: "JUH RV Weser-Ems" },
  { id: "E27", abschnittId: "EO3", bezeichnung: "Sanitätsgruppe", organisation: "ASB", ebene: "GRUPPE", staerke: [1, 1, 6], status: "IM_EINSATZ", schicht: "SPAET", herkunft: "ASB RV Oldenburg" },
  { id: "E28", abschnittId: "EO3", bezeichnung: "Streifenwagen Absperrung", organisation: "POLIZEI", ebene: "TRUPP", staerke: [0, 2, 0], status: "IM_EINSATZ", schicht: "TAG", herkunft: "PI Oldenburg" },
  // Verteilte Kräfte mit den übrigen Statuswerten
  { id: "E29", abschnittId: "EO1", bezeichnung: "FGr Notversorgung", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 5], status: "EINSATZVORBEHALT", schicht: "TAG", herkunft: "THW OV Leer" },
  { id: "E30", abschnittId: "EO2", bezeichnung: "GTr Wassergefahren", organisation: "DLRG", ebene: "TRUPP", staerke: [0, 1, 4], status: "ANMARSCH", schicht: "TAG", herkunft: "DLRG Bezirk Ammerland" },
  { id: "E31", abschnittId: "EO3", bezeichnung: "Gr Wasserrettung", organisation: "DLRG", ebene: "GRUPPE", staerke: [1, 1, 6], status: "NICHT_EINSATZBEREIT", schicht: "TAG", herkunft: "DLRG Bezirk Oldenburg" },
  { id: "E32", abschnittId: "BR1", bezeichnung: "Pioniermaschinenzug", organisation: "BUNDESWEHR", ebene: "ZUG", staerke: [1, 4, 20], status: "RUHE", schicht: "TAG", herkunft: "PiBtl 130" },
  { id: "E33", abschnittId: "LOG", bezeichnung: "Tr Log Schlauch", organisation: "FEUERWEHR", ebene: "TRUPP", staerke: [0, 1, 2], status: "IM_EINSATZ", schicht: "FRUEH", herkunft: "FF Bad Zwischenahn" },
  { id: "E34", abschnittId: "LOG", bezeichnung: "Tr Log WT", organisation: "FEUERWEHR", ebene: "TRUPP", staerke: [0, 1, 2], status: "IM_EINSATZ", schicht: "SPAET", herkunft: "FF Bad Zwischenahn" },
  { id: "E35", abschnittId: "EO1", bezeichnung: "Rettungsdienst Vorhaltung", organisation: "RETTUNGSDIENST", ebene: "TRUPP", staerke: [0, 1, 1], status: "IM_EINSATZ", schicht: "TAG", herkunft: "RKiSH" },
  // Angeforderte Kräfte — sie zählen nicht in der Gesamtstärke (§5.3) und
  // erscheinen nicht im Druckblatt. Ohne Schicht, wie es §4.2 der
  // Bestandsaufnahme für diesen Bereich ausdrücklich zulässt.
  { id: "E36", abschnittId: "ANF", bezeichnung: "FGr Räumen B (angefordert)", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 8], status: "ANGEFORDERT", herkunft: "THW OV Cloppenburg" },
  { id: "E37", abschnittId: "ANF", bezeichnung: "LZ FW (angefordert)", organisation: "FEUERWEHR", ebene: "ZUG", staerke: [1, 4, 17], status: "ANGEFORDERT", herkunft: "FF Cloppenburg" },
  { id: "E38", abschnittId: "ANF", bezeichnung: "Bergwacht (angefordert)", organisation: "BERGWACHT", ebene: "STAFFEL", staerke: [0, 1, 5], status: "RUFBEREITSCHAFT", herkunft: "Bergwacht Harz" },
  // Die entfernte Einheit — sie bleibt im Zustand und in keiner Summe (§5.4.5).
  { id: "E39", abschnittId: "EO2", bezeichnung: "Doppelt gemeldete Gruppe", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 8], status: "IM_EINSATZ", schicht: "TAG", herkunft: "THW OV Emden" },
  // Die Quelle der Aufteilung: Aus ihr wird unten ein Trupp abgeteilt.
  { id: "E40", abschnittId: "EO1", bezeichnung: "BGr Teilbar", organisation: "THW", ebene: "GRUPPE", staerke: [0, 1, 8], status: "IM_EINSATZ", schicht: "TAG", herkunft: "THW OV Nordenham" },
];

/**
 * Die Ereignisfolge der Prüflage.
 *
 * Sie wird bei jedem Aufruf neu gebaut und trägt jedes Mal dieselben HLC —
 * die Lage ist damit **bit-stabil**, und ein Goldfile über ihr ändert sich
 * nur, wenn sich der Code ändert. Eine Lage mit Zufall oder Wanduhrzeit
 * ergäbe ein Goldfile, das jeden Morgen neu abgenommen werden müsste.
 */
export function prueflageEreignisse(): readonly EingehendesEreignis[] {
  laufnummer = 0;
  const ereignisse: EingehendesEreignis[] = [
    bau((h, n) =>
      einsatzAngelegt(h, n, {
        einsatzId: PRUEFLAGE_ID,
        name: "Übung Weser-Ems",
        art: "UEBUNG",
        fuestName: "FüSt Oldenburg",
        ort: "Oldenburg",
        // Zwei Stunden vor dem Bezugspunkt der Bauhilfe. §2.5 setzt fuer
        // Ist-Zeiten eine Schwelle von zwoelf Stunden gegen die Wanduhr;
        // ein Beginn zwei Tage davor erzeugte `meldezeitUnplausibel` und
        // damit einen Hinweis in einer Lage, die keinen haben soll.
        beginn: "2026-09-08T06:00:00+02:00",
        schichtmodell: "ZWEI_SCHICHT",
      }),
    ),
  ];

  for (const abschnitt of ABSCHNITTE) {
    ereignisse.push(
      bau((h, n) =>
        abschnittAngelegt(h, n, {
          abschnittId: abschnitt.id,
          name: abschnitt.name,
          abschnittstyp: abschnitt.typ,
          reihenfolge: abschnitt.reihenfolge,
          ...(abschnitt.parentId === undefined ? {} : { parentId: abschnitt.parentId }),
        }),
      ),
    );
  }

  let reihenfolge = 0;
  for (const einheit of EINHEITEN) {
    reihenfolge += 1;
    const [f, u, m] = einheit.staerke;
    const stelle = reihenfolge;
    ereignisse.push(
      bau((h, n) =>
        einheitGemeldet(h, n, {
          einheitId: einheit.id,
          abschnittId: einheit.abschnittId,
          bezeichnung: einheit.bezeichnung,
          organisation: einheit.organisation,
          ebene: einheit.ebene,
          staerke: staerke(f, u, m),
          personalErfassung: "NUR_STAERKE",
          status: einheit.status,
          ...(einheit.schicht === undefined ? {} : { schicht: einheit.schicht }),
          hierarchie: [{ art: "ORTSVERBAND", name: einheit.herkunft }],
          reihenfolge: stelle,
        }),
      ),
    );
  }

  // Die Aufteilung: Aus E40 (0/1/8) wird ein Trupp mit 0/0/3 abgeteilt. Die
  // Wirkung ist relativ (§5.4.2) — die Summe über beide bleibt 9.
  ereignisse.push(
    bau((h, n) => ({
      ...einheitGemeldet(h, n, {
        einheitId: "E40-A",
        abschnittId: "EO1",
        bezeichnung: "unbenutzt",
        organisation: "THW",
        ebene: "TRUPP",
        staerke: staerke(0, 0, 3),
        personalErfassung: "NUR_STAERKE",
        status: "IM_EINSATZ",
      }),
      typ: "EinheitAufgeteilt",
      nutzlast: {
        quellEinheitId: "E40",
        neueEinheitId: "E40-A",
        neueEinheit: {
          abschnittId: "EO1",
          bezeichnung: "BGr Teilbar — Trupp",
          organisation: "THW",
          hierarchie: [{ art: "ORTSVERBAND", name: "THW OV Nordenham" }],
          ebene: "TRUPP",
          staerke: staerke(0, 0, 3),
          personalErfassung: "NUR_STAERKE",
          status: "IM_EINSATZ",
          schicht: "TAG",
          reihenfolge: 41,
          istFuehrungDesAbschnitts: false,
        },
        abgeteilteStaerke: staerke(0, 0, 3),
        gesehen: staerke(0, 1, 8),
        uebernommeneFahrzeuge: [],
        uebernommenePersonen: [],
      },
    })),
  );

  // Die Entfernung: §2.4 macht den Grund zur Pflicht.
  ereignisse.push(
    bau((h, n) => ({
      ...statusGesetzt(h, n, "E39", "IM_EINSATZ", "IM_EINSATZ"),
      typ: "EinheitEntfernt",
      nutzlast: { einheitId: "E39" },
      vorher: null,
      neu: true,
      grund: "Doppelt gemeldet, Meldung von OV Emden zurückgezogen",
    })),
  );

  return ereignisse;
}

/**
 * Die Zusicherungen, die die Prüflage über sich selbst gibt.
 *
 * Sie stehen hier und nicht in einem einzelnen Test, weil jede Ausgabe sich
 * darauf verlässt: Wer die Lage ändert und eine dieser Aussagen bricht, soll
 * es an **einer** Stelle merken und nicht in drei Goldfiles.
 */
export const PRUEFLAGE_ZUSICHERUNGEN = {
  /** So viele Einheiten werden gemeldet, die abgeteilte mitgezählt. */
  gemeldeteEinheiten: EINHEITEN.length + 1,
  /** Alle neun Statuswerte kommen vor (§5.4). */
  statuswerte: EINHEIT_STATUS,
  /** Alle vier Schichtwerte kommen vor (Zieldatenmodell §2.3). */
  schichtwerte: SCHICHTEN,
  /** Der Abschnitt, der nicht in die Gesamtstärke zählt. */
  angefordertAbschnitt: "ANF",
  /** Der Abschnitt ohne jede Einheit — das Druckblatt blendet ihn aus. */
  leererAbschnitt: "EO4",
  /** Die entfernte Einheit; sie bleibt im Zustand und in keiner Summe. */
  entfernteEinheit: "E39",
} as const;
