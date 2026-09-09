/**
 * Abbildung der v1-Zeichentypen auf die taktische Ebene des Zielmodells
 * (Zieldatenmodell §2.8).
 *
 * v1 fuehrte drei Generationen von Werten nebeneinander: die englischen
 * (`platoon`, `group`, `squad`), die deutschen (`zug`, `gruppe`, `trupp`) und
 * `none`. Zieldatenmodell §2.8 Nr. 2 streicht die englischen; §2.8 Nr. 1
 * trennt zusaetzlich `TRUPP` und `STAFFEL`, die die Excel in einer Spalte
 * („Trupp o.") fuehrt.
 */

import type { TaktischeEbene } from "../ereignis.js";

/** Die Werte, die v1 in `TacticalSignConfig.typ` geschrieben hat. */
export type V1Zeichentyp =
  | "grossverband"
  | "abteilung"
  | "bereitschaft"
  | "zug"
  | "zugtrupp"
  | "gruppe"
  | "staffel"
  | "trupp"
  | "none"
  // Altwerte aus fruehen v1-Staenden (§2.8 Nr. 2)
  | "platoon"
  | "group"
  | "squad";

const NACH_EBENE: Readonly<Record<V1Zeichentyp, TaktischeEbene>> = {
  grossverband: "GROSSVERBAND",
  abteilung: "ABTEILUNG",
  bereitschaft: "BEREITSCHAFT",
  zug: "ZUG",
  zugtrupp: "ZUGTRUPP",
  gruppe: "GRUPPE",
  staffel: "STAFFEL",
  trupp: "TRUPP",
  none: "UNBESTIMMT",
  platoon: "ZUG",
  group: "GRUPPE",
  squad: "TRUPP",
};

/**
 * Uebersetzt einen v1-Zeichentyp in die taktische Ebene.
 *
 * Ein unbekannter Wert wird zu `UNBESTIMMT` statt zu einem Fehler: Die
 * Inferenz ist ein Vorschlag, und ein Vorschlag darf an einem alten Datensatz
 * nicht scheitern. Zieldatenmodell §2.8 fuehrt `UNBESTIMMT` genau fuer den
 * Fall „keine Spalte gefuellt".
 */
export function ebeneAusV1Typ(typ: string | undefined): TaktischeEbene {
  if (typ === undefined) return "UNBESTIMMT";
  return NACH_EBENE[typ as V1Zeichentyp] ?? "UNBESTIMMT";
}
