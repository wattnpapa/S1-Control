/**
 * Die Einheiten des Demo-Einsatzes — reine Daten.
 *
 * **Diese Liste ist zum Austauschen gedacht.** Die meisten Einheiten kommen
 * aus einem Übungsbogen (`boegen/`, aus `wattnpapa/erfassungsbogen`): Sie
 * melden sich am Meldekopf mit ihrem Erfassungsbogen an, und die Übernahme
 * legt sie mit Personen, Fahrzeugen, Funkrufnamen und Sofortbedarf an. Hier
 * steht dann nur, **wohin** sie gehen und **was** sie im Verlauf tun. Wer
 * eine andere Einheit will, legt ihren Bogen nach `boegen/` und trägt hier
 * eine Zeile ein.
 *
 * Einige wenige Einheiten sind von Hand angelegt (`hand`): Kräfte ohne Bogen
 * und Kräfte, die erst angefordert sind.
 *
 * Die Zeiten sind Minuten seit Einsatzbeginn (0 bis 720).
 */

import { einheitIdDesBogens, type Organisation, type Staerke, type TaktischeEbene } from "@s1/domaene";

import { DEMO_BOEGEN, type Bogenname } from "./boegen/index.js";

/** Ein Statuswechsel im Verlauf: zur Minute `minute` gilt `status`. */
export interface Demostatus {
  readonly minute: number;
  readonly status: string;
}

/** Was eine von Hand angelegte Einheit braucht — bei den übrigen steht es im Bogen. */
export interface Handanlage {
  readonly bezeichnung: string;
  readonly organisation: Organisation;
  readonly ebene: TaktischeEbene;
  readonly staerke: Staerke;
  readonly herkunft: string;
  /** Minute, zu der die Einheit angelegt (angefordert) wird. */
  readonly angelegt: number;
  readonly fuehrungskraft?: { readonly name: string; readonly mobil: string };
  readonly fahrzeuge?: readonly { readonly typ: string; readonly bezeichnung?: string; readonly kennzeichen?: string }[];
}

interface Einheitsangaben {
  /** Der Abschnitt, in den die Einheit beim Eintreffen geht. */
  readonly abschnittId: string;
  readonly bogen?: Bogenname;
  readonly hand?: Handanlage;
  /** Minute des Eintreffens am Meldekopf; fehlt bei Kräften, die noch unterwegs oder nur angefordert sind. */
  readonly eingetroffen?: number;
  /** Die Statuswechsel nach dem Eintreffen, in zeitlicher Folge. */
  readonly verlauf?: readonly Demostatus[];
  readonly schicht?: "TAG" | "NACHT";
  readonly auftrag?: string;
  readonly bemerkung?: string;
  /** Wie viele der Kräfte übernachten — die Zahl, die S4 für die Unterkunft braucht. */
  readonly uebernachtung?: { readonly m: number; readonly w: number };
}

export interface Demoeinheit extends Einheitsangaben {
  /** Die Kennung der Einheit: bei Bogeneinheiten die, die die Übernahme vergibt. */
  readonly id: string;
}

const IM_EINSATZ = (minute: number): Demostatus => ({ minute, status: "IM_EINSATZ" });
const st = (fuehrer: number, unterfuehrer: number, mannschaft: number): Staerke => ({ fuehrer, unterfuehrer, mannschaft });

const FUEST = "demo-ab-fuest";
const EA1 = "demo-ab-ea1";
const FUELLPLATZ = "demo-ab-ea1-fuell";
const EA2 = "demo-ab-ea2";
const EA3 = "demo-ab-ea3";
const LOG = "demo-ab-log";
const BR = "demo-ab-br";
const ERKUNDUNG = "demo-ab-erk";
const ANGEFORDERT = "demo-ab-ang";

const ANGABEN = {
  // --- Führungsstelle: Fachzug Führung/Kommunikation OV Oldenburg ------------
  ztrFk: { bogen: "thwOldenburgZtrFzFk", abschnittId: FUEST, eingetroffen: 12, verlauf: [IM_EINSATZ(14)], schicht: "TAG", auftrag: "Führungsstelle betreiben" },
  fgrF: { bogen: "thwOldenburgFgrF", abschnittId: FUEST, eingetroffen: 18, verlauf: [IM_EINSATZ(22)], schicht: "TAG", auftrag: "Lagekarte und Einsatztagebuch führen", uebernachtung: { m: 5, w: 2 } },
  fgrK: { bogen: "thwOldenburgFgrK", abschnittId: FUEST, eingetroffen: 20, verlauf: [IM_EINSATZ(24)], schicht: "TAG", auftrag: "Fernmeldezentrale und Meldekopf betreiben", uebernachtung: { m: 6, w: 3 } },

  // --- EA 1 Deich Nord -------------------------------------------------------
  ztrTz: { bogen: "thwOldenburgZtrTz", abschnittId: EA1, eingetroffen: 24, verlauf: [IM_EINSATZ(30)], schicht: "TAG", auftrag: "Abschnittsleitung EA 1 Deich Nord" },
  bOl: { bogen: "thwOldenburgB", abschnittId: EA1, eingetroffen: 25, verlauf: [IM_EINSATZ(40), { minute: 600, status: "RUHE" }], schicht: "TAG", auftrag: "Deichverteidigung Achterdiek, Sandsackverbau Deich-km 3,2 bis 3,6", uebernachtung: { m: 6, w: 3 } },
  fwAmm: { bogen: "feuerwehrAmmerlandFachzugTh", abschnittId: EA1, eingetroffen: 35, verlauf: [IM_EINSATZ(45)], schicht: "TAG", auftrag: "Sandsäcke füllen und an den Deich transportieren" },
  bNh: { bogen: "thwNordenhamB", abschnittId: EA1, eingetroffen: 48, verlauf: [IM_EINSATZ(62)], schicht: "TAG", auftrag: "Deichverteidigung Achterdiek, Sickerstelle Deich-km 3,4 sichern", uebernachtung: { m: 7, w: 2 } },
  rOl: { bogen: "thwOldenburgFgrR", abschnittId: EA1, eingetroffen: 52, verlauf: [IM_EINSATZ(70)], schicht: "TAG", auftrag: "Zufahrt Achterdiek mit Bagger befestigen, Sand umschlagen" },
  dlrg: { bogen: "dlrgLangenhagenStaffelWasserrettung", abschnittId: EA1, eingetroffen: 130, verlauf: [IM_EINSATZ(140)], schicht: "TAG", auftrag: "Sicherung der Kräfte am Wasser, Bootsbereitschaft" },
  sfm: { bogen: "katsPapenburgSandsackfuellmaschine", abschnittId: FUELLPLATZ, eingetroffen: 66, verlauf: [IM_EINSATZ(80)], schicht: "TAG", auftrag: "Sandsackfüllmaschine am Bauhof betreiben, 1.500 Säcke je Stunde" },

  // --- EA 2 Deich Süd --------------------------------------------------------
  bVa: { bogen: "thwVarelB", abschnittId: EA2, eingetroffen: 75, verlauf: [IM_EINSATZ(95)], schicht: "TAG", auftrag: "Deichverteidigung Sandkrug, Deichfuß mit Vlies und Sandsäcken sichern", uebernachtung: { m: 8, w: 1 } },
  nOl: {
    bogen: "thwOldenburgFgrN", abschnittId: EA2, eingetroffen: 55, verlauf: [IM_EINSATZ(80), { minute: 660, status: "NICHT_EINSATZBEREIT" }], schicht: "TAG",
    auftrag: "Ausleuchten der Einsatzstelle Sandkrug, Stromversorgung", bemerkung: "Netzersatzanlage ausgefallen, Ersatz angefordert", uebernachtung: { m: 7, w: 2 },
  },
  hws: { bogen: "katsWilhelmshavenHochwasserschutzsystem", abschnittId: EA2, eingetroffen: 88, verlauf: [IM_EINSATZ(105)], schicht: "TAG", auftrag: "Mobiles Hochwasserschutzsystem an der Sandkruger Straße aufbauen" },
  fwEmd: { bogen: "feuerwehrEmdenLoeschgruppeKats", abschnittId: EA2, eingetroffen: 100, verlauf: [IM_EINSATZ(110), { minute: 640, status: "RUECKMARSCH" }], schicht: "TAG", auftrag: "Sandsacktransport Sandkrug" },
  mhd: { bogen: "mhdSandkrug", abschnittId: EA2, eingetroffen: 118, verlauf: [IM_EINSATZ(120)], schicht: "TAG", auftrag: "Sanitätsdienst an der Einsatzstelle Sandkrug" },

  // --- EA 3 Pumpen -----------------------------------------------------------
  wpVa: { bogen: "thwVarelFgrWp", abschnittId: EA3, eingetroffen: 60, verlauf: [IM_EINSATZ(85)], schicht: "TAG", auftrag: "Lenzen Klärwerk Wehnen, 15.000 l/min", uebernachtung: { m: 9, w: 3 } },
  wLe: { bogen: "thwLeerFgrW", abschnittId: EA3, eingetroffen: 290, verlauf: [IM_EINSATZ(310)], schicht: "NACHT", auftrag: "Regenrückhaltebecken Wehnen sichern, Bootseinsatz und Lenzen", uebernachtung: { m: 9, w: 3 } },
  iOl: { bogen: "thwOldenburgFgrI", abschnittId: EA3, eingetroffen: 330, verlauf: [IM_EINSATZ(345)], schicht: "NACHT", auftrag: "Stromversorgung und Abwasserleitungen im Klärwerk Wehnen sichern" },

  // --- Logistik --------------------------------------------------------------
  logV: { bogen: "thwAurichFgrLogV", abschnittId: LOG, eingetroffen: 110, verlauf: [IM_EINSATZ(125)], schicht: "TAG", auftrag: "Verpflegung für 250 Kräfte, Ausgabe Weser-Ems-Hallen und Sandkrug", uebernachtung: { m: 8, w: 4 } },
  drk: { bogen: "drkRastedeBereitschaft", abschnittId: LOG, eingetroffen: 150, verlauf: [IM_EINSATZ(165)], schicht: "TAG", auftrag: "Betreuung der Unterkunft BBS Wechloy" },
  asb: { bogen: "asbSoltauVerpflegungsgruppe", abschnittId: LOG, eingetroffen: 170, verlauf: [IM_EINSATZ(185)], schicht: "TAG", auftrag: "Verpflegungsausgabe Feuerwehrhaus Sandkrug" },
  juh: { bogen: "juhAhlhorn", abschnittId: LOG, eingetroffen: 260, verlauf: [IM_EINSATZ(275)], schicht: "NACHT", auftrag: "Betreuung und Transport abgelöster Kräfte" },

  // --- Erkundung: rückt nach dem Flug wieder ab ------------------------------
  uav: { bogen: "katsWesterstedeAufklaerungstruppLuft", abschnittId: ERKUNDUNG, eingetroffen: 232, verlauf: [IM_EINSATZ(236), { minute: 396, status: "RUECKMARSCH" }], auftrag: "Deichlinie Achterdiek bis Sandkrug mit Drohne abfliegen" },

  // --- Bereitstellungsraum ---------------------------------------------------
  bWe: { bogen: "thwWesterstedeB", abschnittId: BR, eingetroffen: 560, verlauf: [], schicht: "NACHT", bemerkung: "Ablösung für die Bergungsgruppe OV Oldenburg", uebernachtung: { m: 8, w: 1 } },
  bw: { bogen: "bundeswehrKreisverbindungskommando", abschnittId: BR, eingetroffen: 345, verlauf: [], bemerkung: "Verbindung zur Bundeswehr, Amtshilfe Pioniergerät in Prüfung" },
  pol: {
    abschnittId: BR, eingetroffen: 120, verlauf: [],
    hand: {
      bezeichnung: "Verbindungsbeamter Polizei", organisation: "POLIZEI", ebene: "PERSON", staerke: st(1, 0, 0), herkunft: "PI Oldenburg-Stadt/Ammerland", angelegt: 100,
      fuehrungskraft: { name: "PHK Brandt", mobil: "0441 5550500" }, fahrzeuge: [{ typ: "FuStW", bezeichnung: "Funkstreifenwagen", kennzeichen: "OL-PD 5501" }],
    },
  },

  // --- Angefordert, noch nicht da --------------------------------------------
  eJe: {
    abschnittId: ANGEFORDERT, verlauf: [{ minute: 690, status: "ANMARSCH" }], schicht: "NACHT", bemerkung: "Ersatz für die ausgefallene Netzersatzanlage, etwa eine Stunde Anfahrt",
    hand: { bezeichnung: "Fachgruppe Elektroversorgung", organisation: "THW", ebene: "GRUPPE", staerke: st(0, 2, 7), herkunft: "OV Jever", angelegt: 670 },
  },
  btDrk: {
    abschnittId: ANGEFORDERT, schicht: "NACHT", bemerkung: "Für die Nachtverpflegung angefordert, Zusage steht aus",
    hand: { bezeichnung: "Verpflegungstrupp", organisation: "DRK", ebene: "TRUPP", staerke: st(0, 1, 5), herkunft: "DRK Kreisverband Oldenburg-Stadt", angelegt: 680 },
  },
} as const satisfies Readonly<Record<string, Einheitsangaben>>;

/** Der Name, unter dem das Drehbuch eine Einheit anspricht. */
export type Einheitenname = keyof typeof ANGABEN;

function mitKennung(name: string, angaben: Einheitsangaben): Demoeinheit {
  return { ...angaben, id: angaben.bogen === undefined ? `demo-eh-${name}` : einheitIdDesBogens(DEMO_BOEGEN[angaben.bogen]) };
}

/** Die Einheiten mit ihrer Kennung, je Name. */
export const EH = Object.fromEntries(Object.entries(ANGABEN).map(([name, angaben]) => [name, mitKennung(name, angaben)])) as Readonly<Record<Einheitenname, Demoeinheit>>;

export const DEMO_EINHEITEN: readonly Demoeinheit[] = Object.values(EH);
