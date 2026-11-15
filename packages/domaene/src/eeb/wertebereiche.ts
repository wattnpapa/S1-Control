/**
 * Die Wertebereiche des Bogens als Namen des Katalogs.
 *
 * Der Bogen kodiert Organisation, Rolle, Geschlecht, Ernaehrung, Kontaktart,
 * Fahrerlaubnis und Zeichenfarbe als Zahlen (`@bos/eeb-format`); das
 * Zielmodell fuehrt dafuer sprechende Schluessel (ZDM §2.1, §3.4). Diese
 * Tabellen sind die ganze Uebersetzung — der Adapter liest sie, er pflegt
 * sie nicht.
 *
 * Was der Bogen kennt und das Zielmodell nicht, faellt hier auf einen
 * benannten Auffang (`SONSTIGE`, `MANNSCHAFT`, …) statt zu scheitern: Ein
 * neuer Wert einer neueren Bogenfassung darf eine Meldung nicht verlieren.
 */

import {
  Ernaehrung,
  Geschlecht,
  KontaktArt,
  OrganisationsTyp,
  StaerkeRolle,
  Zeichenfarbe,
} from "@bos/eeb-format";

/**
 * Die zwoelf Organisationen des Bogens auf die sechzehn des Zielmodells.
 *
 * `SONSTIGE` ist in beiden der Auffang; `organisationName` traegt dann den
 * Freitext (ZDM §2.1). Die vier Werte, die nur das Zielmodell kennt
 * (`BERGWACHT`, `WASSERWIRTSCHAFT`, `REGIE`, `ZIVIL`), kommen aus einem Bogen
 * nie — sie stehen in der Excel und werden von Hand gesetzt.
 */
export const ORGANISATION: Readonly<Record<number, string>> = {
  [OrganisationsTyp.THW]: "THW",
  [OrganisationsTyp.FEUERWEHR]: "FEUERWEHR",
  [OrganisationsTyp.POLIZEI]: "POLIZEI",
  [OrganisationsTyp.BUNDESPOLIZEI]: "BUNDESPOLIZEI",
  [OrganisationsTyp.DRK]: "DRK",
  [OrganisationsTyp.JUH]: "JUH",
  [OrganisationsTyp.MHD]: "MHD",
  [OrganisationsTyp.ASB]: "ASB",
  [OrganisationsTyp.DLRG]: "DLRG",
  [OrganisationsTyp.BUNDESWEHR]: "BUNDESWEHR",
  [OrganisationsTyp.RETTUNGSDIENST]: "RETTUNGSDIENST",
  [OrganisationsTyp.SONSTIGE]: "SONSTIGE",
};

export const ROLLE: Readonly<Record<number, string>> = {
  [StaerkeRolle.FUEHRER]: "FUEHRER",
  [StaerkeRolle.UNTERFUEHRER]: "UNTERFUEHRER",
  [StaerkeRolle.MANNSCHAFT]: "MANNSCHAFT",
};

export const GESCHLECHT: Readonly<Record<number, string>> = {
  [Geschlecht.M]: "MAENNLICH",
  [Geschlecht.W]: "WEIBLICH",
  [Geschlecht.D]: "DIVERS",
};

export const ERNAEHRUNG: Readonly<Record<number, string>> = {
  [Ernaehrung.FLEISCH]: "FLEISCH",
  [Ernaehrung.VEGETARISCH]: "VEGETARISCH",
  [Ernaehrung.VEGAN]: "VEGAN",
};

/**
 * Die vier Kontaktarten. `FUNK` (Schema 12) ist der Funkrufname einer
 * Person — Freitext wie „Heros Oldenburg 18/13-1", keine Rufnummer. Er wird
 * als eigene Art gefuehrt und nicht als Mobilnummer verkleidet: Wer die
 * Erreichbarkeit waehlt, muss sehen, dass hier ein Funkgeraet dran ist.
 */
export const KONTAKTART: Readonly<Record<number, string>> = {
  [KontaktArt.MOBIL]: "MOBIL",
  [KontaktArt.FESTNETZ]: "FESTNETZ",
  [KontaktArt.EMAIL]: "EMAIL",
  [KontaktArt.FUNK]: "FUNK",
};

/**
 * Die abweichende Grundfarbe des taktischen Zeichens eines Fahrzeugs
 * (Schema 13): Geraet, das die Einheit fuehrt, das ihr aber nicht gehoert.
 * Fehlt das Feld, gilt die Farbe der Organisation.
 */
export const ZEICHENFARBE: Readonly<Record<number, string>> = {
  [Zeichenfarbe.KOMMUNAL]: "KOMMUNAL",
  [Zeichenfarbe.GRAU]: "GRAU",
};

/** Die EU-Klassen des Bogens als Namen (ZDM §3.4). */
export const FAHRERLAUBNIS: Readonly<Record<number, string>> = {
  1: "AM",
  2: "A1",
  3: "A2",
  4: "A",
  5: "B",
  6: "BE",
  7: "C1",
  8: "C1E",
  9: "C",
  10: "CE",
  11: "D1",
  12: "D1E",
  13: "D",
  14: "DE",
};
