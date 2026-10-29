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

export function ebeneTitel(wert: string): string {
  return titel(EBENE, wert);
}

export function abschnittstypTitel(wert: string): string {
  return titel(ABSCHNITTSTYP, wert);
}

export function organisationTitel(wert: string): string {
  return titel(ORGANISATION, wert);
}

/**
 * Die Beschriftung einer Auswahlspalte der Einheitentabelle nach ihrem
 * Schlüssel — damit die Tabelle nicht je Spalte eine eigene Fallunterscheidung
 * führt. Spalten ohne Wörterbuch (der Erfassungsbogen-Schlüssel, die
 * Personalerfassung) zeigen den Wert selbst.
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
    default:
      return wert;
  }
}
