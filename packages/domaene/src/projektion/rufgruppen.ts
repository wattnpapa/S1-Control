/**
 * Die Rufgruppen des Einsatzes als Liste — geteilt von Funkplan und
 * Einheitentabelle (KONZEPT-FUNKPLAN.md §5 und §6).
 *
 * Eine Stelle für Ordnung, Geltung und Anzeigename: Die Auswahl in der
 * Tabellenzelle und die Zuordnung im Blatt sollen dieselben Gruppen in
 * derselben Reihenfolge zeigen.
 */

import type { Auswahlwert } from "../beschriftungen-einheitsteile.js";
import type { RufgruppeZustand, Zustand } from "../zustand.js";

/** Eine Rufgruppe gilt, solange sie nicht aufgelöst ist. */
export function rufgruppeGilt(rufgruppe: RufgruppeZustand | undefined): rufgruppe is RufgruppeZustand {
  return rufgruppe !== undefined && rufgruppe.aufgeloest?.wert !== true;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

/** Der Name der Rufgruppe, ohne Namen ihre Kennung. */
export function rufgruppenAnzeige(rufgruppe: RufgruppeZustand): string {
  return text(rufgruppe.name.wert) ?? rufgruppe.id;
}

function rang(rufgruppe: RufgruppeZustand): number {
  const wert = rufgruppe.reihenfolge?.wert;
  return typeof wert === "number" ? wert : Number.MAX_SAFE_INTEGER;
}

/**
 * Alle Rufgruppen: die geltenden nach Reihenfolge, dann Name, dann Kennung;
 * die aufgelösten danach in derselben Ordnung — blass am Ende, wie ein
 * aufgelöster Abschnitt.
 */
export function rufgruppenListe(zustand: Zustand): readonly RufgruppeZustand[] {
  return Object.values(zustand.rufgruppen ?? {}).sort(
    (a, b) =>
      Number(!rufgruppeGilt(a)) - Number(!rufgruppeGilt(b)) ||
      rang(a) - rang(b) ||
      rufgruppenAnzeige(a).localeCompare(rufgruppenAnzeige(b), "de") ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** Die Auswahl einer Zelle: die geltenden Rufgruppen mit Name. */
export function rufgruppenAuswahl(zustand: Zustand): readonly Auswahlwert[] {
  return rufgruppenListe(zustand)
    .filter(rufgruppeGilt)
    .map((r) => ({ wert: r.id, titel: rufgruppenAnzeige(r) }));
}
