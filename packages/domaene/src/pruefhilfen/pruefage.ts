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
 * **Seit M5 zusätzlich**, weil die vier Bereiche dieses Meilensteins sonst
 * über einer leeren Lage geprüft würden:
 *
 *  * **Logistikwerte** an neun Einheiten — weiblich, divers, vegetarisch,
 *    vegan und Übernachtungsbedarf. Ohne sie stünden die Spalten J bis P des
 *    Log-Blatts und die Logistikspalten der Statusmatrix durchweg auf null,
 *    und ein Goldfile über lauter Nullen prüft die Rechnung nicht;
 *  * **PSA-Sätze** an fünf Einheiten, damit die Kostenübersicht nicht überall
 *    dieselbe Zahl zeigt (Spalte AO ist die einzige Eingabe der Gruppe);
 *  * **vier Anforderungen**, je eine in jedem der vier Zustände aus §5.6.2 —
 *    offen, zugesagt, eingetroffen, storniert. Mit **verschiedenen**
 *    Kennungen: Zwei gleiche erzeugten `moeglicheDublette` (§5.6.1), und
 *    diese Lage soll hinweisfrei bleiben;
 *  * **Dienstposten** in allen fünf Teilbereichen der Vorlage, teils besetzt,
 *    teils nicht, in Tag- und Nachtschicht — K17 rechnet aus ihnen die Stärke
 *    der Führungsstelle, und die geht in den Druck ein;
 *  * **Schichtplaneinträge** an zwei Tagen, weil die Spalten des Plans aus den
 *    Daten kommen und nicht aus einem Kalender (§5.7).
 *
 * Bewusst **nicht** enthalten: Konflikthinweise. Sie gehören in die Prüffälle
 * des Folds und nicht in ein Ausgabe-Goldfile — eine Lage mit Hinweisen macht
 * jede Zahländerung zu einer Untersuchung.
 */

import type { EingehendesEreignis } from "../fold.js";
import { EINHEIT_STATUS, SCHICHTEN } from "../ereignis.js";
import {
  abschnittAngelegt,
  anlageEreignis,
  einheitGemeldet,
  einsatzAngelegt,
  feldEreignis,
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
 * Logistikwerte je Einheit — die Spalten AC bis AI der Vorlage.
 *
 * Nur an neun Einheiten, und das ist Absicht: In einem echten Einsatz meldet
 * nicht jede Einheit ihre Zusammensetzung, und eine Lage, in der alle es tun,
 * prüfte den Fall nicht, für den K4 seinen Rückfall auf die Personenzählung
 * hat. Die Zahlen bleiben unter der Gesamtstärke der jeweiligen Einheit —
 * sonst würde `maennlich` negativ, und das wäre eine andere Prüfung.
 */
const LOGISTIK: readonly {
  readonly einheitId: string;
  readonly weiblich?: number;
  readonly divers?: number;
  readonly vegetarisch?: number;
  readonly vegan?: number;
  readonly uebernachtungM?: number;
  readonly uebernachtungW?: number;
  readonly uebernachtungD?: number;
}[] = [
  { einheitId: "E01", weiblich: 2, vegetarisch: 1, uebernachtungM: 4, uebernachtungW: 2 },
  { einheitId: "E05", weiblich: 2, divers: 1, vegetarisch: 2, vegan: 1, uebernachtungM: 4, uebernachtungW: 2, uebernachtungD: 1 },
  { einheitId: "E06", weiblich: 5, vegetarisch: 3, vegan: 1 },
  { einheitId: "E10", weiblich: 4, divers: 1, vegetarisch: 2, uebernachtungM: 10, uebernachtungW: 4, uebernachtungD: 1 },
  { einheitId: "E12", weiblich: 1, vegetarisch: 1, uebernachtungM: 8, uebernachtungW: 1 },
  { einheitId: "E20", weiblich: 3, vegan: 1 },
  { einheitId: "E25", weiblich: 2, divers: 1 },
  { einheitId: "E30", weiblich: 1, vegetarisch: 2, uebernachtungM: 6, uebernachtungW: 1 },
  { einheitId: "E35", weiblich: 1 },
];

/**
 * PSA-Sätze je Tag — Spalte AO, die einzige Eingabe der Kostengruppe.
 *
 * Die Führungsstelle steht mit 1 da, wie die Vorlage es für ihre eigenen
 * Zeilen vorbelegt; die Bergungs- und Räumkräfte mit 1, die Betreuung mit 0.
 * Eine Lage, in der jede Einheit denselben Wert trägt, ließe nicht erkennen,
 * ob die Kostenspalte ihn überhaupt liest.
 */
const PSA_SAETZE: readonly (readonly [string, number])[] = [
  ["E01", 1],
  ["E12", 1],
  ["E20", 2],
  ["E25", 1],
  ["E06", 0],
];

/**
 * Die vier Anforderungen, je eine in einem der vier Zustände aus §5.6.2.
 *
 * `zustandNach` ist nicht das Feld — der Zustand wird abgeleitet und nicht
 * gesetzt. Es sagt, welche Folgeereignisse die Lage schreibt.
 */
const ANFORDERUNGEN: readonly {
  readonly id: string;
  readonly kennung: string;
  readonly abzuloesendeEinheitId?: string;
  readonly vorgeseheneEinheitText: string;
  readonly vorgesehenerAuftrag: string;
  readonly zustandNach: "OFFEN" | "ZUGESAGT" | "EINGETROFFEN" | "STORNIERT";
}[] = [
  { id: "A1", kennung: "ANF-2026-001", abzuloesendeEinheitId: "E12", vorgeseheneEinheitText: "BGr THW OV Varel", vorgesehenerAuftrag: "Ablösung Deichverteidigung Nord", zustandNach: "OFFEN" },
  { id: "A2", kennung: "ANF-2026-002", abzuloesendeEinheitId: "E20", vorgeseheneEinheitText: "FGr N THW OV Jever", vorgesehenerAuftrag: "Notstrom Pumpwerk Süd", zustandNach: "ZUGESAGT" },
  { id: "A3", kennung: "ANF-2026-003", vorgeseheneEinheitText: "SanZ DRK KV Ammerland", vorgesehenerAuftrag: "Sanitätswache Schule Mitte", zustandNach: "EINGETROFFEN" },
  { id: "A4", kennung: "ANF-2026-004", vorgeseheneEinheitText: "Drohnentrupp", vorgesehenerAuftrag: "Lagebild aus der Luft", zustandNach: "STORNIERT" },
];

/**
 * Die Dienstposten der Führungsstelle — alle fünf Teilbereiche der Vorlage
 * (`excel-domaenenmodell.md` §5).
 *
 * Je Funktion eine Tag- und eine Nachtzeile, wie das Blatt es führt; besetzt
 * ist nur ein Teil, weil eine vollbesetzte Führungsstelle die Ausnahme ist und
 * K17 gerade die **besetzten** zählt.
 */
const DIENSTPOSTEN: readonly {
  readonly id: string;
  readonly teileinheit: string;
  readonly funktion: string;
  readonly schicht: string;
  readonly reihenfolge: number;
  readonly besetzung?: string;
}[] = [
  { id: "D01", teileinheit: "Stab", funktion: "Ltr FüSt", schicht: "TAG", reihenfolge: 1, besetzung: "Mennenga, Fokke" },
  { id: "D02", teileinheit: "Stab", funktion: "Ltr FüSt", schicht: "NACHT", reihenfolge: 2, besetzung: "Gnieser, Jannik" },
  { id: "D03", teileinheit: "Stab", funktion: "SGL 1", schicht: "TAG", reihenfolge: 3, besetzung: "van Rijsinge, Nils" },
  { id: "D04", teileinheit: "Stab", funktion: "SGL 1", schicht: "NACHT", reihenfolge: 4 },
  { id: "D05", teileinheit: "Stab", funktion: "SGL 2", schicht: "TAG", reihenfolge: 5, besetzung: "Meyer, Anton" },
  { id: "D06", teileinheit: "Stab", funktion: "FüGeh SG 2", schicht: "TAG", reihenfolge: 6, besetzung: "Janssen, Frauke" },
  { id: "D07", teileinheit: "ZTr FK", funktion: "ZTrFü FK", schicht: "TAG", reihenfolge: 1, besetzung: "Onken, Hilke" },
  { id: "D08", teileinheit: "ZTr FK", funktion: "SprFu/Kf", schicht: "TAG", reihenfolge: 2, besetzung: "Behrends, Timo" },
  { id: "D09", teileinheit: "ZTr FK", funktion: "SprFu/Kf", schicht: "NACHT", reihenfolge: 3 },
  { id: "D10", teileinheit: "FGr F", funktion: "GrFü F", schicht: "TAG", reihenfolge: 1, besetzung: "Ahlers, Sönke" },
  { id: "D11", teileinheit: "FGr F", funktion: "LdF", schicht: "TAG", reihenfolge: 2, besetzung: "Kruse, Malte" },
  { id: "D12", teileinheit: "FGr K", funktion: "GrFü K", schicht: "NACHT", reihenfolge: 1, besetzung: "Wilts, Heike" },
  { id: "D13", teileinheit: "FGr K", funktion: "He K", schicht: "NACHT", reihenfolge: 2, besetzung: "Bruns, Lasse" },
  { id: "D14", teileinheit: "Externe", funktion: "FaBe Wasserwirtschaft", schicht: "TAG", reihenfolge: 1, besetzung: "Dr. Poppen, Insa (NLWKN)" },
];

/** Zwei Tage Schichtplan — die Spalten des Plans kommen aus den Daten (§5.7). */
const SCHICHTPLAN: readonly (readonly [string, string, string])[] = [
  ["D01", "2026-09-08", "Mennenga, Fokke / Ltr FüSt / THW OV Oldenburg / Mob. 0441-000001"],
  ["D01", "2026-09-09", "Mennenga, Fokke / Ltr FüSt / THW OV Oldenburg / Bem: nur bis 14 Uhr"],
  ["D02", "2026-09-08", "Gnieser, Jannik / Ltr FüSt Nacht / THW OV Oldenburg"],
  ["D03", "2026-09-09", "van Rijsinge, Nils / SGL 1 / THW OV Oldenburg"],
  ["D07", "2026-09-08", "Onken, Hilke / ZTrFü FK / THW OV Oldenburg"],
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

  // ------------------------------------------------------------------
  // M5: Logistik, Kosten, Anforderungen, Führungsstelle
  // ------------------------------------------------------------------

  // §2.2a: Der Vorher-Wert einer Logistikzahl, die noch nie gesetzt wurde, ist
  // `null` — nicht 0. Die 0 ist der abgeleitete Anzeigewert (K4 zählt dann
  // Personen), das Feld selbst ist leer.
  for (const eintrag of LOGISTIK) {
    for (const [feld, wert] of Object.entries(eintrag)) {
      if (feld === "einheitId" || typeof wert !== "number") continue;
      ereignisse.push(
        bau((h, n) =>
          feldEreignis(h, n, "LogistikGesetzt", { einheitId: eintrag.einheitId, feld }, null, wert),
        ),
      );
    }
  }

  for (const [einheitId, saetze] of PSA_SAETZE) {
    ereignisse.push(
      bau((h, n) => feldEreignis(h, n, "PsaBedarfGesetzt", { einheitId }, null, saetze)),
    );
  }

  for (const anforderung of ANFORDERUNGEN) {
    ereignisse.push(
      bau((h, n) =>
        anlageEreignis(h, n, "AnforderungAngelegt", {
          anforderungId: anforderung.id,
          kennung: anforderung.kennung,
          ...(anforderung.abzuloesendeEinheitId === undefined
            ? {}
            : { abzuloesendeEinheitId: anforderung.abzuloesendeEinheitId }),
          vorgeseheneEinheitText: anforderung.vorgeseheneEinheitText,
          vorgesehenerAuftrag: anforderung.vorgesehenerAuftrag,
          // Innerhalb der Ist-Schwelle von zwölf Stunden (§2.5) — sonst trüge
          // die Lage einen `meldezeitUnplausibel`, und sie soll hinweisfrei
          // bleiben.
          angefordertAm: "2026-09-08T07:30:00+02:00",
        }),
      ),
    );

    if (anforderung.zustandNach === "ZUGESAGT" || anforderung.zustandNach === "EINGETROFFEN") {
      ereignisse.push(
        bau((h, n) =>
          feldEreignis(h, n, "AbloesungZugesagt", { anforderungId: anforderung.id }, null, {
            // `zugesagtFuer` ist der Schlüssel, den der Fold als Planzeit
            // plausibilisiert (§2.5); die anderen beiden sind Anzeige.
            zugesagtFuer: "2026-09-08T16:00:00+02:00",
            zugesagtVon: "THW RB Oldenburg",
          }),
        ),
      );
    }
    if (anforderung.zustandNach === "EINGETROFFEN") {
      ereignisse.push(
        bau((h, n) =>
          feldEreignis(h, n, "AnforderungErledigt", { anforderungId: anforderung.id }, null, {
            erledigtAm: "2026-09-08T09:15:00+02:00",
          }),
        ),
      );
    }
    if (anforderung.zustandNach === "STORNIERT") {
      // §2.4: Das Storno ist einer der Pflichtfälle für `grund`.
      ereignisse.push(
        bau((h, n) =>
          feldEreignis(
            h,
            n,
            "AnforderungStorniert",
            { anforderungId: anforderung.id },
            false,
            true,
            "Eigene Drohnenkomponente verfügbar, Anforderung zurückgezogen",
          ),
        ),
      );
    }
  }

  for (const posten of DIENSTPOSTEN) {
    ereignisse.push(
      bau((h, n) =>
        anlageEreignis(h, n, "DienstpostenAngelegt", {
          dienstpostenId: posten.id,
          teileinheit: posten.teileinheit,
          funktion: posten.funktion,
          schicht: posten.schicht,
          reihenfolge: posten.reihenfolge,
        }),
      ),
    );
    if (posten.besetzung !== undefined) {
      ereignisse.push(
        bau((h, n) =>
          feldEreignis(h, n, "DienstpostenBesetzt", { dienstpostenId: posten.id }, null, posten.besetzung),
        ),
      );
    }
  }

  for (const [dienstpostenId, datum, text] of SCHICHTPLAN) {
    ereignisse.push(
      bau((h, n) =>
        feldEreignis(h, n, "SchichtplanEintragGesetzt", { dienstpostenId, datum }, null, text),
      ),
    );
  }

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
  /** So viele Anforderungen, je eine in jedem Zustand aus §5.6.2. */
  anforderungen: ANFORDERUNGEN.length,
  /** So viele Dienstposten, davon besetzt: siehe `besetzteDienstposten`. */
  dienstposten: DIENSTPOSTEN.length,
  besetzteDienstposten: DIENSTPOSTEN.filter((p) => p.besetzung !== undefined).length,
  /** Die Teilbereiche, die tatsächlich vorkommen. */
  teilbereiche: [...new Set(DIENSTPOSTEN.map((p) => p.teileinheit))],
  /** Die Tage, an denen der Schichtplan etwas trägt. */
  schichtplanTage: [...new Set(SCHICHTPLAN.map(([, datum]) => datum))].sort(),
  /** So viele Einheiten tragen Logistikwerte. */
  einheitenMitLogistik: LOGISTIK.length,
} as const;
