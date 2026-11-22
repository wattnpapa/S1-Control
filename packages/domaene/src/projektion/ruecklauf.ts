/**
 * Der Rücklauf: verteilt, aber beim Hauptempfänger noch nicht erledigt.
 *
 * Gefordert im Stab-Review vom 22.11.2026 (Sichter, auch FüGeh S2 und S2):
 * Nach dem Sichten sagte die Liste nur noch „verteilt“. Ein Blitz lag 20
 * Minuten als „neu“ bei S3, ohne dass jemand es sah. Gelesen und erledigt
 * je Stelle stehen an jeder Nachricht (`Nachrichtenmarke`); hier werden sie
 * je Stelle zusammengezählt. Die Oberfläche rechnet aus der Nachweisung,
 * die sie für den Sichter ohnehin vollständig lädt.
 *
 * Gezählt wird nur die grüne Kopie, also wer bearbeiten soll, nicht wer
 * mitliest. Die eigene Kopie des Verfassers eines Ausgangs zählt nicht; er
 * kennt den Inhalt (R2-FaBe P1-4). Zurückgezogene Nachrichten fallen weg.
 */

import type { Id } from "../werte.js";
import type { Nachrichtenzeile, Vorrangstufe } from "./nachrichtenzeile.js";

export interface Ruecklaufkopie {
  readonly nachrichtId: Id;
  /** „E 12“, ohne Nummer „E“. */
  readonly kennzeichen: string;
  readonly betreff: string;
  readonly vorrangstufe: Vorrangstufe;
  /** Zeit der Sichtung — seit dann liegt die Kopie bei der Stelle. */
  readonly seit?: string;
  readonly gelesen: boolean;
}

export interface Ruecklaufzeile {
  readonly stelle: string;
  /** Offene grüne Kopien, dringendste und älteste zuerst. */
  readonly kopien: readonly Ruecklaufkopie[];
  readonly ungelesen: number;
}

function ms(zeitpunkt: string | undefined): number {
  const wert = zeitpunkt === undefined ? Number.NaN : Date.parse(zeitpunkt);
  return Number.isNaN(wert) ? Number.MAX_SAFE_INTEGER : wert;
}

function kopieAus(zeile: Nachrichtenzeile, gelesen: boolean): Ruecklaufkopie {
  return {
    nachrichtId: zeile.id,
    kennzeichen: zeile.nummer === undefined ? zeile.richtungKurz : `${zeile.richtungKurz} ${String(zeile.nummer)}`,
    betreff: zeile.betreff,
    vorrangstufe: zeile.vorrangstufe,
    ...(zeile.sichtung?.zeitpunkt === undefined ? {} : { seit: zeile.sichtung.zeitpunkt }),
    gelesen,
  };
}

function dringender(a: Ruecklaufkopie, b: Ruecklaufkopie): number {
  return a.vorrangstufe - b.vorrangstufe || ms(a.seit) - ms(b.seit) || a.nachrichtId.localeCompare(b.nachrichtId);
}

/**
 * Je Stelle die offenen grünen Kopien. Stellen mit dem dringendsten und
 * ältesten Rückstand zuerst; Stellen ohne Rückstand fehlen.
 */
export function ruecklauf(zeilen: readonly Nachrichtenzeile[]): readonly Ruecklaufzeile[] {
  const jeStelle = new Map<string, Ruecklaufkopie[]>();
  for (const zeile of zeilen) {
    if (zeile.zurueckgezogen || zeile.sichtung === undefined) continue;
    for (const marke of zeile.verteiler) {
      if (marke.kopie !== "GRUEN" || marke.erledigt || marke.eigenerAusgang === true) continue;
      const liste = jeStelle.get(marke.stelle) ?? [];
      liste.push(kopieAus(zeile, marke.gelesen));
      jeStelle.set(marke.stelle, liste);
    }
  }
  const ergebnis = [...jeStelle].map(([stelle, kopien]) => {
    const sortiert = [...kopien].sort(dringender);
    return { stelle, kopien: sortiert, ungelesen: sortiert.filter((k) => !k.gelesen).length };
  });
  return ergebnis.sort((a, b) => {
    const [x, y] = [a.kopien[0], b.kopien[0]];
    return (x !== undefined && y !== undefined ? dringender(x, y) : 0) || a.stelle.localeCompare(b.stelle, "de");
  });
}
