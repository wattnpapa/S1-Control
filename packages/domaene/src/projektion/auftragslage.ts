/**
 * Die laufenden Aufträge je Abschnitt für den Monitor (S3): was wird wo von
 * wem gerade getan. Aus dem Review: S3, Führung und die Fachberatung wollen
 * an der Wand den Auftrag sehen, nicht nur Köpfe.
 *
 * Laufend heißt: nicht zurückgenommen und ohne Ende (`bis` leer) — dieselbe
 * Regel wie „beendet" in der Einheitentabelle. Der Abschnitt ist der des
 * Auftrags, sonst der wirksame der Einheit. Einheiten, die beendet oder nicht
 * mehr in der Lage sind, fallen weg.
 */

import { zaehlklasse } from "../kennzahlen.js";
import type { AuftragZustand, Zustand } from "../zustand.js";

export interface Auftragszeile {
  readonly schluessel: string;
  /** Leer, wenn weder Auftrag noch Einheit einen Abschnitt nennen. */
  readonly abschnittId: string;
  readonly abschnitt: string;
  /** Leer bei einem Auftrag ohne Einheit. */
  readonly einheit: string;
  /** Statusschlüssel der Einheit, leer ohne Einheit. */
  readonly status: string;
  readonly text: string;
  readonly von?: string;
}

function text(wert: unknown): string {
  return typeof wert === "string" ? wert : "";
}

function zeileAus(zustand: Zustand, a: AuftragZustand): Auftragszeile | undefined {
  if (a.zurueckgenommen?.wert === true || (a.bis?.wert ?? null) !== null) return undefined;
  const einheitId = text(a.einheitId?.wert);
  const einheit = einheitId === "" ? undefined : zustand.einheiten[einheitId];
  if (einheit !== undefined) {
    const klasse = zaehlklasse(zustand, einheit);
    if (klasse === "beendet" || klasse === "ausserhalb") return undefined;
  }
  const abschnittId = text(a.abschnittId?.wert) || (einheit?.wirksamerAbschnittId ?? "");
  const von = text(a.von?.wert);
  return {
    schluessel: a.id,
    abschnittId,
    abschnitt: text(zustand.abschnitte[abschnittId]?.name.wert) || abschnittId,
    einheit: einheit === undefined ? "" : text(einheit.bezeichnung.wert) || einheit.id,
    status: einheit === undefined ? "" : text(einheit.status.wert),
    text: text(a.text.wert),
    ...(von === "" ? {} : { von }),
  };
}

/** Laufende Aufträge, älteste zuerst; ohne Beginn ans Ende. */
export function laufendeAuftraege(zustand: Zustand): readonly Auftragszeile[] {
  return Object.values(zustand.auftraege)
    .map((a) => zeileAus(zustand, a))
    .filter((z): z is Auftragszeile => z !== undefined && z.text !== "")
    .sort((x, y) => (x.von ?? "￿").localeCompare(y.von ?? "￿") || x.schluessel.localeCompare(y.schluessel));
}
