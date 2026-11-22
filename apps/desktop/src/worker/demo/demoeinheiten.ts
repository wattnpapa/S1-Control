/**
 * Die Einheiten des Demo-Einsatzes — reine Daten.
 *
 * **Diese Liste ist zum Austauschen gedacht.** Wer andere Einheiten im
 * Demo-Einsatz sehen will, ändert nur diese Datei: je Einheit eine Zeile mit
 * Abschnitt, Bezeichnung, Herkunft, Stärke und dem, was sie im Verlauf tut.
 * Die Schritte daraus baut `demokraefte.ts`; die Kennungen der Abschnitte
 * stehen in `demostruktur.ts`.
 *
 * Die Zeiten sind Minuten seit Einsatzbeginn (der Einsatz läuft zwölf
 * Stunden, also 0 bis 720).
 */

import type { Organisation, Staerke, TaktischeEbene } from "@s1/domaene";

export interface Demofahrzeug {
  readonly typ: string;
  readonly bezeichnung?: string;
  readonly kennzeichen?: string;
}

export interface Demoperson {
  readonly vorname: string;
  readonly nachname: string;
  readonly rolle: "FUEHRER" | "UNTERFUEHRER" | "MANNSCHAFT";
  readonly funktionen: string;
  readonly geschlecht?: "MAENNLICH" | "WEIBLICH" | "DIVERS";
  readonly ernaehrung?: "FLEISCH" | "VEGETARISCH" | "VEGAN";
}

/** Ein Statuswechsel im Verlauf: zur Minute `minute` gilt `status`. */
export interface Demostatus {
  readonly minute: number;
  readonly status: string;
}

export interface Demoeinheit {
  readonly id: string;
  /** Der Abschnitt, in dem die Einheit zuletzt steht. */
  readonly abschnittId: string;
  readonly bezeichnung: string;
  readonly organisation: Organisation;
  readonly ebene: TaktischeEbene;
  readonly staerke: Staerke;
  /** Ortsverband, Wache, Bereitschaft — steht in der Spalte „Herkunft". */
  readonly herkunft: string;
  /** Minute, zu der die Einheit angelegt (angefordert) wird. */
  readonly angelegt: number;
  /** Minute des Eintreffens am Meldekopf; fehlt bei Kräften, die noch unterwegs oder nur angefordert sind. */
  readonly eingetroffen?: number;
  /** Die Statuswechsel nach dem Eintreffen, in zeitlicher Folge. */
  readonly verlauf?: readonly Demostatus[];
  readonly schicht?: "TAG" | "NACHT";
  readonly fuehrungskraft?: { readonly name: string; readonly mobil: string };
  readonly auftrag?: string;
  readonly bemerkung?: string;
  readonly fahrzeuge?: readonly Demofahrzeug[];
  readonly personen?: readonly Demoperson[];
  /** Für die Logistik: wie viele der Kräfte weiblich sind, vegetarisch essen, übernachten. */
  readonly logistik?: { readonly weiblich?: number; readonly vegetarisch?: number; readonly vegan?: number; readonly uebernachtungM?: number; readonly uebernachtungW?: number };
}

const st = (fuehrer: number, unterfuehrer: number, mannschaft: number): Staerke => ({ fuehrer, unterfuehrer, mannschaft });

const IM_EINSATZ = (minute: number): Demostatus => ({ minute, status: "IM_EINSATZ" });
const RUHE = (minute: number): Demostatus => ({ minute, status: "RUHE" });

/** Die Personen der Bergungsgruppe Oldenburg — die eine Einheit mit vollständiger Personalerfassung. */
const PERSONEN_B1: readonly Demoperson[] = [
  { vorname: "Jan", nachname: "Behrens", rolle: "UNTERFUEHRER", funktionen: "Gruppenführer" },
  { vorname: "Lena", nachname: "Oltmanns", rolle: "UNTERFUEHRER", funktionen: "Truppführerin", geschlecht: "WEIBLICH", ernaehrung: "VEGETARISCH" },
  { vorname: "Tobias", nachname: "Janssen", rolle: "MANNSCHAFT", funktionen: "Kraftfahrer CE, Atemschutzgeräteträger" },
  { vorname: "Merle", nachname: "Hinrichs", rolle: "MANNSCHAFT", funktionen: "Sprechfunkerin", geschlecht: "WEIBLICH" },
  { vorname: "Ole", nachname: "Dirks", rolle: "MANNSCHAFT", funktionen: "Motorsägenführer", ernaehrung: "VEGAN" },
  { vorname: "Fenja", nachname: "Lübben", rolle: "MANNSCHAFT", funktionen: "Sanitätshelferin", geschlecht: "WEIBLICH" },
  { vorname: "Hauke", nachname: "Siefken", rolle: "MANNSCHAFT", funktionen: "Kraftfahrer C" },
  { vorname: "Piet", nachname: "Renken", rolle: "MANNSCHAFT", funktionen: "Atemschutzgeräteträger" },
  { vorname: "Kim", nachname: "Albers", rolle: "MANNSCHAFT", funktionen: "Helfer", geschlecht: "DIVERS" },
];

export const DEMO_EINHEITEN: readonly Demoeinheit[] = [
  // --- Führung -------------------------------------------------------------
  {
    id: "demo-eh-ztr-ol", abschnittId: "demo-ab-fuest", bezeichnung: "Zugtrupp TZ Oldenburg", organisation: "THW", ebene: "ZUGTRUPP",
    staerke: st(1, 1, 2), herkunft: "OV Oldenburg", angelegt: 6, eingetroffen: 12, verlauf: [IM_EINSATZ(14)], schicht: "TAG",
    fuehrungskraft: { name: "Ahlers, Jörg", mobil: "0170 5550101" }, auftrag: "Führungsstelle betreiben",
    fahrzeuge: [{ typ: "FüKW", bezeichnung: "Führungskraftwagen", kennzeichen: "THW-80101" }],
    logistik: { weiblich: 1 },
  },
  {
    id: "demo-eh-fk-ol", abschnittId: "demo-ab-fuest", bezeichnung: "Fachgruppe Führung/Kommunikation", organisation: "THW", ebene: "GRUPPE",
    staerke: st(1, 2, 9), herkunft: "OV Oldenburg", angelegt: 6, eingetroffen: 18, verlauf: [IM_EINSATZ(22)], schicht: "TAG",
    fuehrungskraft: { name: "Wilken, Sabine", mobil: "0170 5550102" }, auftrag: "Fernmeldezentrale und Meldekopf betreiben",
    fahrzeuge: [
      { typ: "FüKomKW", bezeichnung: "Führungs- und Kommunikationskraftwagen", kennzeichen: "THW-80102" },
      { typ: "FmKW", bezeichnung: "Fernmeldekraftwagen", kennzeichen: "THW-80103" },
      { typ: "Anh FüLa", bezeichnung: "Anhänger Führung und Lage", kennzeichen: "THW-80104" },
    ],
    logistik: { weiblich: 4, vegetarisch: 2, uebernachtungM: 8, uebernachtungW: 4 },
  },

  // --- EA 1 Deich Nord -----------------------------------------------------
  {
    id: "demo-eh-b1-ol", abschnittId: "demo-ab-ea1", bezeichnung: "1. Bergungsgruppe", organisation: "THW", ebene: "GRUPPE",
    staerke: st(0, 2, 7), herkunft: "OV Oldenburg", angelegt: 8, eingetroffen: 25, verlauf: [IM_EINSATZ(40), RUHE(600)], schicht: "TAG",
    fuehrungskraft: { name: "Behrens, Jan", mobil: "0170 5550111" }, auftrag: "Deichverteidigung Achterdiek, Sandsackverbau Abschnitt km 3,2 bis 3,6",
    fahrzeuge: [{ typ: "GKW", bezeichnung: "Gerätekraftwagen", kennzeichen: "THW-80111" }],
    personen: PERSONEN_B1,
    logistik: { weiblich: 3, vegetarisch: 1, vegan: 1, uebernachtungM: 6, uebernachtungW: 3 },
  },
  {
    id: "demo-eh-b-wa", abschnittId: "demo-ab-ea1", bezeichnung: "Bergungsgruppe", organisation: "THW", ebene: "GRUPPE",
    staerke: st(0, 1, 8), herkunft: "OV Wardenburg", angelegt: 10, eingetroffen: 48, verlauf: [IM_EINSATZ(62)], schicht: "TAG",
    fuehrungskraft: { name: "Kruse, Malte", mobil: "0170 5550112" }, auftrag: "Deichverteidigung Achterdiek, Sickerstelle km 3,4 sichern",
    fahrzeuge: [{ typ: "GKW", kennzeichen: "THW-82411" }, { typ: "MTW", bezeichnung: "Mannschaftstransportwagen", kennzeichen: "THW-82412" }],
    logistik: { weiblich: 2, vegetarisch: 1, uebernachtungM: 7, uebernachtungW: 2 },
  },
  {
    id: "demo-eh-ff-wa", abschnittId: "demo-ab-ea1", bezeichnung: "Löschzug Wardenburg", organisation: "FEUERWEHR", ebene: "ZUG",
    staerke: st(1, 3, 18), herkunft: "FF Wardenburg", angelegt: 12, eingetroffen: 35, verlauf: [IM_EINSATZ(45)], schicht: "TAG",
    fuehrungskraft: { name: "Hobbie, Gerd", mobil: "0171 5550201" }, auftrag: "Sandsäcke füllen und transportieren",
    fahrzeuge: [{ typ: "ELW 1", kennzeichen: "OL-FW 1101" }, { typ: "LF 20", kennzeichen: "OL-FW 1144" }, { typ: "TLF 3000", kennzeichen: "OL-FW 1123" }],
    logistik: { weiblich: 4, vegetarisch: 3 },
  },
  {
    id: "demo-eh-dlrg", abschnittId: "demo-ab-ea1", bezeichnung: "Wasserrettungstrupp", organisation: "DLRG", ebene: "TRUPP",
    staerke: st(0, 1, 5), herkunft: "DLRG Oldenburg", angelegt: 90, eingetroffen: 130, verlauf: [IM_EINSATZ(140)], schicht: "TAG",
    fuehrungskraft: { name: "Eilers, Nele", mobil: "0172 5550301" }, auftrag: "Sicherung der Kräfte am Wasser, Bootsbereitschaft",
    fahrzeuge: [{ typ: "GW-W", bezeichnung: "Gerätewagen Wasserrettung", kennzeichen: "OL-DL 801" }, { typ: "RTB", bezeichnung: "Rettungsboot mit Trailer" }],
    logistik: { weiblich: 2 },
  },

  // --- EA 2 Deich Süd ------------------------------------------------------
  {
    id: "demo-eh-b-de", abschnittId: "demo-ab-ea2", bezeichnung: "Bergungsgruppe", organisation: "THW", ebene: "GRUPPE",
    staerke: st(0, 1, 8), herkunft: "OV Delmenhorst", angelegt: 20, eingetroffen: 75, verlauf: [IM_EINSATZ(95)], schicht: "TAG",
    fuehrungskraft: { name: "Yilmaz, Deniz", mobil: "0170 5550121" }, auftrag: "Deichverteidigung Sandkrug, Deichfuß mit Vlies und Sandsäcken sichern",
    fahrzeuge: [{ typ: "GKW", kennzeichen: "THW-80911" }],
    logistik: { weiblich: 1, vegetarisch: 2, uebernachtungM: 8, uebernachtungW: 1 },
  },
  {
    id: "demo-eh-n-ol", abschnittId: "demo-ab-ea2", bezeichnung: "Fachgruppe Notversorgung und Notinstandsetzung", organisation: "THW", ebene: "GRUPPE",
    staerke: st(0, 2, 7), herkunft: "OV Oldenburg", angelegt: 20, eingetroffen: 55, verlauf: [IM_EINSATZ(80), { minute: 660, status: "NICHT_EINSATZBEREIT" }], schicht: "TAG",
    fuehrungskraft: { name: "Meinen, Arne", mobil: "0170 5550122" }, auftrag: "Ausleuchten der Einsatzstelle Sandkrug, Stromversorgung",
    bemerkung: "Netzersatzanlage 50 kVA ausgefallen, Ersatz angefordert",
    fahrzeuge: [
      { typ: "MzKW", bezeichnung: "Mehrzweckkraftwagen", kennzeichen: "THW-80131" },
      { typ: "NEA 50 kVA", bezeichnung: "Netzersatzanlage 50 kVA", kennzeichen: "THW-80132" },
    ],
    logistik: { weiblich: 2, uebernachtungM: 7, uebernachtungW: 2 },
  },
  {
    id: "demo-eh-ff-ol", abschnittId: "demo-ab-ea2", bezeichnung: "Löschgruppe Ohmstede", organisation: "FEUERWEHR", ebene: "GRUPPE",
    staerke: st(0, 1, 8), herkunft: "FF Oldenburg-Ohmstede", angelegt: 60, eingetroffen: 100, verlauf: [IM_EINSATZ(110), { minute: 640, status: "RUECKMARSCH" }], schicht: "TAG",
    fuehrungskraft: { name: "Harms, Wiebke", mobil: "0171 5550202" }, auftrag: "Sandsacktransport Sandkrug",
    fahrzeuge: [{ typ: "LF 10", kennzeichen: "OL-FW 2143" }],
    logistik: { weiblich: 3 },
  },

  // --- EA 3 Pumpen ---------------------------------------------------------
  {
    id: "demo-eh-wp-ol", abschnittId: "demo-ab-ea3", bezeichnung: "Fachgruppe Wasserschaden/Pumpen", organisation: "THW", ebene: "GRUPPE",
    staerke: st(0, 2, 10), herkunft: "OV Oldenburg", angelegt: 15, eingetroffen: 60, verlauf: [IM_EINSATZ(85)], schicht: "TAG",
    fuehrungskraft: { name: "Gerdes, Insa", mobil: "0170 5550131" }, auftrag: "Lenzen Klärwerk Wehnen, 15.000 l/min",
    fahrzeuge: [
      { typ: "LKW 7 t Lbw", bezeichnung: "Lastkraftwagen mit Ladebordwand", kennzeichen: "THW-80141" },
      { typ: "Anh SwPu 15.000", bezeichnung: "Schmutzwasserkreiselpumpe 15.000 l/min", kennzeichen: "THW-80142" },
    ],
    logistik: { weiblich: 3, vegetarisch: 2, vegan: 1, uebernachtungM: 9, uebernachtungW: 3 },
  },
  {
    id: "demo-eh-wp-nh", abschnittId: "demo-ab-ea3", bezeichnung: "Fachgruppe Wasserschaden/Pumpen", organisation: "THW", ebene: "GRUPPE",
    staerke: st(0, 2, 9), herkunft: "OV Nordenham", angelegt: 200, eingetroffen: 290, verlauf: [IM_EINSATZ(310)], schicht: "NACHT",
    fuehrungskraft: { name: "Cordes, Hinnerk", mobil: "0170 5550132" }, auftrag: "Lenzen Regenrückhaltebecken Wehnen, 5.000 l/min",
    fahrzeuge: [{ typ: "LKW 7 t Lbw", kennzeichen: "THW-81941" }, { typ: "Anh SwPu 5.000", kennzeichen: "THW-81942" }],
    logistik: { weiblich: 2, vegetarisch: 1, uebernachtungM: 9, uebernachtungW: 2 },
  },

  // --- Logistik ------------------------------------------------------------
  {
    id: "demo-eh-logv", abschnittId: "demo-ab-log", bezeichnung: "Fachgruppe Logistik-Verpflegung", organisation: "THW", ebene: "GRUPPE",
    staerke: st(0, 2, 7), herkunft: "OV Wilhelmshaven", angelegt: 30, eingetroffen: 110, verlauf: [IM_EINSATZ(125)], schicht: "TAG",
    fuehrungskraft: { name: "Tjarks, Imke", mobil: "0170 5550141" }, auftrag: "Verpflegung für 250 Kräfte, Ausgabe Weser-Ems-Hallen und Sandkrug",
    fahrzeuge: [{ typ: "LKW 7 t Lbw", kennzeichen: "THW-83651" }, { typ: "Anh FKH", bezeichnung: "Feldkochherd", kennzeichen: "THW-83652" }],
    logistik: { weiblich: 4, vegetarisch: 1, uebernachtungM: 5, uebernachtungW: 4 },
  },
  {
    id: "demo-eh-drk", abschnittId: "demo-ab-log", bezeichnung: "Betreuungsgruppe", organisation: "DRK", ebene: "GRUPPE",
    staerke: st(0, 1, 8), herkunft: "DRK Bereitschaft Oldenburg-Stadt", angelegt: 70, eingetroffen: 150, verlauf: [IM_EINSATZ(165)], schicht: "TAG",
    fuehrungskraft: { name: "Janßen, Rieke", mobil: "0173 5550401" }, auftrag: "Betreuung der Unterkunft BBS Wechloy",
    fahrzeuge: [{ typ: "BtKombi", bezeichnung: "Betreuungskombi", kennzeichen: "OL-RK 4711" }, { typ: "GW-Bt", bezeichnung: "Gerätewagen Betreuung", kennzeichen: "OL-RK 4712" }],
    logistik: { weiblich: 5, vegetarisch: 2 },
  },

  // --- Bereitstellungsraum -------------------------------------------------
  {
    id: "demo-eh-b-we", abschnittId: "demo-ab-br", bezeichnung: "Bergungsgruppe", organisation: "THW", ebene: "GRUPPE",
    staerke: st(0, 1, 8), herkunft: "OV Westerstede", angelegt: 420, eingetroffen: 560, verlauf: [{ minute: 565, status: "EINSATZBEREIT" }], schicht: "NACHT",
    fuehrungskraft: { name: "Ammermann, Focko", mobil: "0170 5550151" }, bemerkung: "Ablösung für 1. Bergungsgruppe OV Oldenburg",
    fahrzeuge: [{ typ: "GKW", kennzeichen: "THW-84011" }],
    logistik: { weiblich: 1, uebernachtungM: 8, uebernachtungW: 1 },
  },
  {
    id: "demo-eh-pol", abschnittId: "demo-ab-br", bezeichnung: "Verbindungsbeamter Polizei", organisation: "POLIZEI", ebene: "PERSON",
    staerke: st(1, 0, 0), herkunft: "PI Oldenburg-Stadt/Ammerland", angelegt: 100, eingetroffen: 120, verlauf: [{ minute: 122, status: "EINSATZBEREIT" }],
    fuehrungskraft: { name: "PHK Brandt", mobil: "0441 5550500" },
  },

  // --- Angefordert, noch nicht da ------------------------------------------
  {
    id: "demo-eh-e-br", abschnittId: "demo-ab-ang", bezeichnung: "Fachgruppe Elektroversorgung", organisation: "THW", ebene: "GRUPPE",
    staerke: st(0, 2, 7), herkunft: "OV Bremen-Süd", angelegt: 670, verlauf: [{ minute: 690, status: "ANMARSCH" }], schicht: "NACHT",
    bemerkung: "Ersatz für ausgefallene NEA 50 kVA, voraussichtlich eine Stunde Anfahrt",
  },
  {
    id: "demo-eh-juh", abschnittId: "demo-ab-ang", bezeichnung: "Verpflegungstrupp", organisation: "JUH", ebene: "TRUPP",
    staerke: st(0, 1, 5), herkunft: "JUH Ortsverband Oldenburg", angelegt: 680, schicht: "NACHT",
    bemerkung: "Für die Nachtverpflegung angefordert, Zusage steht aus",
  },
];
