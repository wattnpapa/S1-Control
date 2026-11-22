/**
 * Einsatzwert der Kräfte vor Ort: je Organisation und je Abschnitt, wie viele
 * Einheiten und Köpfe im Einsatz, einsatzbereit (Reserve), in Ruhe oder
 * nicht einsatzbereit sind — für die Monitoransichten „Status" (S1) und
 * „Einsatzmittel" (S3).
 *
 * Dieselbe Zählregel wie die Stärketafel (`kennzahlen.zaehlklasse`): nur
 * Einheiten der Klasse „ist". Wer vor Ort ist, aber einen anderen oder keinen
 * Status trägt, steht unter „sonstige" — damit die Zeile die Ist-Stärke ergibt.
 * Je Abschnitt zählt die **eigene** Einheit (wirksamer Abschnitt), wie die
 * Zeilen der Stärketafel.
 */

import { zaehlklasse } from "../kennzahlen.js";
import type { EinheitZustand, Zustand } from "../zustand.js";
import { organisationsschluessel } from "./staerkematrix.js";

/** Die Spalten in der Reihenfolge der Wand: gebunden, Reserve, Ruhe, Ausfall, Rest. */
export const STATUSSPALTEN = ["IM_EINSATZ", "EINSATZBEREIT", "RUHE", "NICHT_EINSATZBEREIT", "SONSTIGE"] as const;
export type Statusspalte = (typeof STATUSSPALTEN)[number];

export interface Statuszelle {
  readonly einheiten: number;
  readonly koepfe: number;
}

export type Statuszeile = Readonly<Record<Statusspalte, Statuszelle>>;

export interface Statustafel {
  /** Schlüssel wie `Staerketafel.organisationen` (leer = ohne Angabe). */
  readonly jeOrganisation: Readonly<Record<string, Statuszeile>>;
  /** Schlüssel wie `Staerketafel.abschnitte` (Abschnitts-Id). */
  readonly jeAbschnitt: Readonly<Record<string, Statuszeile>>;
  readonly gesamt: Statuszeile;
}

const NULL: Statuszelle = { einheiten: 0, koepfe: 0 };

export function leereStatuszeile(): Record<Statusspalte, Statuszelle> {
  return { IM_EINSATZ: NULL, EINSATZBEREIT: NULL, RUHE: NULL, NICHT_EINSATZBEREIT: NULL, SONSTIGE: NULL };
}

/** Die Spalte einer Einheit nach ihrem Status. */
export function statusspalte(einheit: EinheitZustand): Statusspalte {
  const wert = einheit.status.wert;
  return (STATUSSPALTEN as readonly unknown[]).includes(wert) && wert !== "SONSTIGE" ? (wert as Statusspalte) : "SONSTIGE";
}

function zaehle(zeilen: Map<string, Record<Statusspalte, Statuszelle>>, schluessel: string, spalte: Statusspalte, koepfe: number): void {
  const zeile = zeilen.get(schluessel) ?? leereStatuszeile();
  const alt = zeile[spalte];
  zeile[spalte] = { einheiten: alt.einheiten + 1, koepfe: alt.koepfe + koepfe };
  zeilen.set(schluessel, zeile);
}

export function statustafel(zustand: Zustand): Statustafel {
  const org = new Map<string, Record<Statusspalte, Statuszelle>>();
  const abschnitt = new Map<string, Record<Statusspalte, Statuszelle>>();
  const gesamt = new Map<string, Record<Statusspalte, Statuszelle>>();
  for (const einheit of Object.values(zustand.einheiten)) {
    if (zaehlklasse(zustand, einheit) !== "ist") continue;
    const s = einheit.wirksameStaerke;
    const koepfe = s.fuehrer + s.unterfuehrer + s.mannschaft;
    const spalte = statusspalte(einheit);
    zaehle(org, organisationsschluessel(einheit), spalte, koepfe);
    zaehle(abschnitt, einheit.wirksamerAbschnittId, spalte, koepfe);
    zaehle(gesamt, "", spalte, koepfe);
  }
  return {
    jeOrganisation: Object.fromEntries(org),
    jeAbschnitt: Object.fromEntries(abschnitt),
    gesamt: gesamt.get("") ?? leereStatuszeile(),
  };
}
