/**
 * Die Beschriftungen der Aufzählungswerte — ein Wort je Wert, so wie es in
 * der Excel steht.
 *
 * Der Zustand führt `IM_EINSATZ`, `RUFBEREITSCHAFT`, `BEREITSTELLUNGSRAUM`:
 * Schlüssel, die in Ereignissen, Goldfiles und Hashes stabil bleiben müssen
 * und deshalb nie umbenannt werden. Wer die Tabelle liest, liest aber keine
 * Schlüssel, sondern das Pull-down-Menü der Excel: „Einsatz“, „Rufbereitschaft“,
 * „Nicht einsatzbereit“ (Blatt Stärke, Spalte Z; Blatt Status, Zeilen 21–29).
 * Ein Bediener, der jahrelang „Einsatzvorbehalt“ gewählt hat, soll das Wort
 * wiederfinden, nicht einen Bezeichner mit Unterstrich entziffern.
 *
 * **Warum in Ring 2.** Die Wörter braucht der Renderer (Tabelle, Masken,
 * Baum), die Ausgaben (Status-Matrix) und das Handbuch. Drei Leser, eine
 * Liste — dieselbe Regel wie bei Störfällen und Tastenkarte (M8).
 *
 * **Unbekannte Werte** fallen auf den Schlüssel zurück: §3.7 hält den
 * Wertebereich offen, und ein Wert, den dieser Client nicht kennt, soll
 * sichtbar bleiben statt leer.
 */

import type { Abschnittstyp, EinheitStatus, Organisation, Schicht, TaktischeEbene } from "./ereignis.js";
import type { Vorlagenkatalog } from "./vorlagen/katalog.js";

const STATUS: Readonly<Record<EinheitStatus, string>> = {
  RUFBEREITSCHAFT: "Rufbereitschaft",
  EINSATZVORBEHALT: "Einsatzvorbehalt",
  ANGEFORDERT: "Angefordert",
  ANMARSCH: "Anmarsch",
  EINSATZBEREIT: "Einsatzbereit",
  IM_EINSATZ: "Einsatz",
  RUHE: "Ruhe",
  NICHT_EINSATZBEREIT: "Nicht einsatzbereit",
  RUECKMARSCH: "Rückmarsch",
};

/**
 * Der Ton einer Statusmarke — Farbe **neben** dem Wort, nie statt des Worts.
 *
 * `ok` ist vor Ort und verfügbar, `warn` ist unterwegs oder noch nicht da,
 * `ruhe` ist vor Ort, aber nicht einsetzbar, `fehler` ist ausgefallen.
 * Alle neun Werte haben einen Ton; vorher trugen vier davon keinen, und eine
 * Marke ohne Ton las sich wie ein Wert, den das Programm nicht kennt.
 */
const STATUS_TON: Readonly<Record<EinheitStatus, "ok" | "warn" | "ruhe" | "fehler">> = {
  RUFBEREITSCHAFT: "ruhe",
  EINSATZVORBEHALT: "ruhe",
  ANGEFORDERT: "warn",
  ANMARSCH: "warn",
  EINSATZBEREIT: "ok",
  IM_EINSATZ: "ok",
  RUHE: "ruhe",
  NICHT_EINSATZBEREIT: "fehler",
  RUECKMARSCH: "warn",
};

const SCHICHT: Readonly<Record<Schicht, string>> = {
  TAG: "Tag",
  NACHT: "Nacht",
  FRUEH: "Früh",
  SPAET: "Spät",
};

const EBENE: Readonly<Record<TaktischeEbene, string>> = {
  GROSSVERBAND: "Großverband",
  ABTEILUNG: "Abteilung",
  BEREITSCHAFT: "Bereitschaft",
  ZUG: "Zug",
  ZUGTRUPP: "Zugtrupp",
  GRUPPE: "Gruppe",
  STAFFEL: "Staffel",
  TRUPP: "Trupp",
  PERSON: "Person",
  UNBESTIMMT: "Unbestimmt",
};

const ABSCHNITTSTYP: Readonly<Record<Abschnittstyp, string>> = {
  FUEHRUNGSSTELLE: "Führungsstelle",
  MELDEKOPF: "Meldekopf",
  SONSTIGE_FUEHRUNG: "Sonstige Führung",
  LOGISTIK: "Logistik",
  ANGEFORDERT: "Angefordert / Anmarsch",
  BEREITSTELLUNGSRAUM: "Bereitstellungsraum",
  EINSATZORT: "Einsatzort",
  EINGANG: "Eingang",
  ARCHIV: "Einsatz beendet",
};

const ORGANISATION: Readonly<Record<Organisation, string>> = {
  THW: "THW",
  FEUERWEHR: "Feuerwehr",
  POLIZEI: "Polizei",
  BUNDESPOLIZEI: "Bundespolizei",
  DRK: "DRK",
  JUH: "JUH",
  MHD: "MHD",
  ASB: "ASB",
  DLRG: "DLRG",
  BUNDESWEHR: "Bundeswehr",
  BERGWACHT: "Bergwacht",
  RETTUNGSDIENST: "Rettungsdienst",
  WASSERWIRTSCHAFT: "Wasserwirtschaft",
  REGIE: "Regie",
  ZIVIL: "Zivil",
  SONSTIGE: "Sonstige",
};

/** Die Vorlagenkataloge mit den Namen der Kopiervorlagen-Bereiche im Blatt „Stärke“. */
const VORLAGENKATALOG: Readonly<Record<Vorlagenkatalog, string>> = {
  THW_STAN: "THW StAN",
  FEUERWEHR: "Feuerwehr",
  KATS_STAN_NDS: "KatS-StAN Nds",
};

/** Die Einsatzart des Blattes „Stammdaten“ (§5.2, `zEinsatzArt`). */
const EINSATZART: Readonly<Record<string, string>> = {
  EINSATZ: "Einsatz",
  UEBUNG: "Übung",
  VERANSTALTUNG: "Veranstaltung",
};

/** Das Schichtmodell des Einsatzes (§5.2, `zSchichtmodell`). */
const SCHICHTMODELL: Readonly<Record<string, string>> = {
  ZWEI_SCHICHT: "Zwei Schichten",
  DREI_SCHICHT: "Drei Schichten",
};

/**
 * Die Art einer Hierarchieebene des Erfassungsbogens. Der Bogen schreibt
 * Schlüssel wie `ORTSVERBAND`; die Herkunftsspalte der Excel liest sich als
 * „Ortsverband“. Unbekannte Arten bleiben, wie sie sind.
 */
const HIERARCHIE_ART: Readonly<Record<string, string>> = {
  // Eine frei eingegebene Herkunft („THW OV Hude“, „DRK KV Oldenburg“) hat
  // keine Stufe; die Masken schreiben `HERKUNFT`, und davor steht kein Wort.
  HERKUNFT: "",
  ORTSVERBAND: "Ortsverband",
  REGIONALSTELLE: "Regionalstelle",
  LANDESVERBAND: "Landesverband",
  LEITUNG: "Leitung",
  KREISVERBAND: "Kreisverband",
  ORTSVEREIN: "Ortsverein",
  LANDKREIS: "Landkreis",
  STADT: "Stadt",
  GEMEINDE: "Gemeinde",
  FEUERWEHR: "Feuerwehr",
  DIENSTSTELLE: "Dienststelle",
};

export function hierarchieArtTitel(wert: string): string {
  return titel(HIERARCHIE_ART, wert);
}

/**
 * Ein Zeitpunkt (ISO 8601) als „TT.MM.JJJJ HH:MM“ in der Ortszeit des Rechners —
 * die Schreibweise der Excel-Spalten „Dat. / Zeit“. Was kein Zeitpunkt ist,
 * bleibt, wie es ist; leer bleibt leer.
 */
export function zeitpunktText(wert: string | null | undefined): string {
  if (wert === null || wert === undefined || wert === "") return "";
  const zeit = new Date(wert);
  if (Number.isNaN(zeit.getTime())) return wert;
  const zwei = (n: number): string => String(n).padStart(2, "0");
  return `${zwei(zeit.getDate())}.${zwei(zeit.getMonth() + 1)}.${String(zeit.getFullYear())} ${zwei(zeit.getHours())}:${zwei(zeit.getMinutes())}`;
}

function titel<K extends string>(liste: Readonly<Record<K, string>>, wert: string): string {
  return (liste as Readonly<Record<string, string>>)[wert] ?? wert;
}

export function statusTitel(wert: string): string {
  return titel(STATUS, wert);
}

export function statusTon(wert: string): "ok" | "warn" | "ruhe" | "fehler" | "neutral" {
  return (STATUS_TON as Readonly<Record<string, "ok" | "warn" | "ruhe" | "fehler">>)[wert] ?? "neutral";
}

export function schichtTitel(wert: string): string {
  return titel(SCHICHT, wert);
}

export function einsatzArtTitel(wert: string): string {
  return titel(EINSATZART, wert);
}

export function schichtmodellTitel(wert: string): string {
  return titel(SCHICHTMODELL, wert);
}

export function ebeneTitel(wert: string): string {
  return titel(EBENE, wert);
}

export function abschnittstypTitel(wert: string): string {
  return titel(ABSCHNITTSTYP, wert);
}

/** Wie die Einheit erfasst wird: nur als Zahl oder mit den einzelnen Personen. */
export function personalErfassungTitel(wert: string): string {
  if (wert === "NUR_STAERKE") return "Nur Stärke";
  if (wert === "VOLLSTAENDIG") return "Mit Personen";
  return wert;
}

export function organisationTitel(wert: string): string {
  return titel(ORGANISATION, wert);
}

export function vorlagenkatalogTitel(wert: string): string {
  return titel(VORLAGENKATALOG, wert);
}

/**
 * Die Beschriftung einer Auswahlspalte der Einheitentabelle nach ihrem
 * Schlüssel — damit die Tabelle nicht je Spalte eine eigene Fallunterscheidung
 * führt. Spalten ohne Wörterbuch (der Erfassungsbogen-Schlüssel) zeigen den Wert
 * selbst.
 */
export function spaltenwertTitel(spaltenSchluessel: string, wert: string): string {
  switch (spaltenSchluessel) {
    case "status":
      return statusTitel(wert);
    case "schicht":
      return schichtTitel(wert);
    case "ebene":
      return ebeneTitel(wert);
    case "organisation":
      return organisationTitel(wert);
    case "personalErfassung":
      return personalErfassungTitel(wert);
    default:
      return wert;
  }
}
