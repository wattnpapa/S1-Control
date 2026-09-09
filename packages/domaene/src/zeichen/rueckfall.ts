/**
 * Rueckfallzeichen, wenn kein taktisches Zeichen erzeugt werden kann
 * (M1.4, aus v1 `tactical-sign-fallback.ts`).
 *
 * **Geliefert wird SVG-Text, keine Daten-URL.** v1 kodierte hier mit `btoa`
 * und `unescape` — beides Browser-Globale, die in Ring 2 nicht existieren und
 * nach 02-ZIELBILD.md auch nicht existieren duerfen. Die Kodierung ist
 * ohnehin Darstellung: Wer eine Daten-URL braucht, baut sie dort, wo er sie
 * anzeigt (M3). Als reine Zeichenkette ist die Funktion zudem ohne
 * Base64-Dekodierung pruefbar.
 */

import type { Organisation } from "../ereignis.js";

/** Kurzform je Organisation fuer die Beschriftung des Rueckfallzeichens. */
const KURZFORM: Readonly<Partial<Record<Organisation, string>>> = {
  THW: "THW",
  FEUERWEHR: "FW",
  POLIZEI: "POL",
  BUNDESPOLIZEI: "BPOL",
  BUNDESWEHR: "BW",
  DRK: "DRK",
  JUH: "JUH",
  MHD: "MHD",
  ASB: "ASB",
  DLRG: "DLRG",
  RETTUNGSDIENST: "RD",
  BERGWACHT: "BW",
  WASSERWIRTSCHAFT: "HK",
  REGIE: "REG",
  ZIVIL: "ZIV",
  SONSTIGE: "ORG",
};

/**
 * Die Kurzform einer Organisation; `ORG`, wenn keine hinterlegt ist.
 *
 * Der Rueckfall auf `ORG` bleibt noetig, obwohl die Tabelle alle sechzehn
 * Schluessel aus Zieldatenmodell §2.1 kennt: `organisation` ist nach §3.7 des
 * Ereigniskonzepts ein **offener** Wertebereich, ein unbekannter Wert also
 * moeglich und ausdruecklich erlaubt.
 */
export function organisationsKurzform(organisation: Organisation): string {
  return KURZFORM[organisation] ?? "ORG";
}

function maskiere(wert: string): string {
  return wert
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Ein schlichtes Einheitenzeichen mit der Organisationskurzform. */
export function rueckfallEinheitSvg(organisation: Organisation): string {
  const kurz = maskiere(organisationsKurzform(organisation));
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="28" viewBox="0 0 40 28">',
    '<rect x="1" y="1" width="38" height="26" rx="2" fill="#ffffff" stroke="#1f2937" stroke-width="1.5"/>',
    `<text x="20" y="18" font-size="10" text-anchor="middle" fill="#1f2937" font-family="Arial, sans-serif">${kurz}</text>`,
    "</svg>",
  ].join("");
}

/** Ein schlichtes Fahrzeugzeichen mit der Organisationskurzform. */
export function rueckfallFahrzeugSvg(organisation: Organisation): string {
  const kurz = maskiere(organisationsKurzform(organisation));
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="28" viewBox="0 0 40 28">',
    '<rect x="1" y="5" width="38" height="16" rx="2" fill="#ffffff" stroke="#1f2937" stroke-width="1.5"/>',
    '<circle cx="10" cy="23" r="3" fill="#1f2937"/>',
    '<circle cx="30" cy="23" r="3" fill="#1f2937"/>',
    `<text x="20" y="16" font-size="9" text-anchor="middle" fill="#1f2937" font-family="Arial, sans-serif">${kurz}</text>`,
    "</svg>",
  ].join("");
}
