/**
 * Die Zuteilung einer Nachricht an einen Fernmelder in der Oberfläche
 * (KONZEPT-NACHRICHTEN.md §5, ergänzt 2026-11-21).
 *
 * Der LdF sichtet den Ausgang und teilt ihn im Übermittlungsvorschlag einem
 * der Fernmelder Fm1 bis Fm3 zu. Die Warteschlange eines Fernmelders zeigt
 * die ihm zugeteilten Nachrichten zuoberst, darunter die ohne Zuteilung und
 * zuletzt die der anderen — ein Zuschnitt, kein Recht: Jeder Fernmelder
 * sieht und befördert jede Nachricht, etwa wenn ein Platz ausfällt.
 *
 * Reine Funktionen, damit die Tests sie ohne DOM prüfen.
 */

import { eigeneFernmelder, istZugeteilt, type Nachrichtenzeile } from "@s1/domaene";

/** „Fm2 · Meyer“, „Fm3 (nicht besetzt)“; ein Altname (Anzeigename eines FMZ-Platzes) steht, wie er kam. */
export function fernmelderbeschriftung(fernmelder: string, besetzung: Readonly<Record<string, string>> | undefined): string {
  if (besetzung === undefined || !/^Fm\d$/u.test(fernmelder)) return fernmelder;
  const platz = besetzung[fernmelder];
  return platz === undefined ? `${fernmelder} (nicht besetzt)` : `${fernmelder} · ${platz}`;
}

/** 0: mir zugeteilt, 1: niemandem zugeteilt, 2: einem anderen Fernmelder zugeteilt. */
function rang(zeile: Nachrichtenzeile, stellen: readonly string[]): number {
  const fernmelder = zeile.vorschlag?.fernmelder.trim() ?? "";
  if (fernmelder === "") return 1;
  return istZugeteilt(fernmelder, stellen) ? 0 : 2;
}

/**
 * Die Warteschlange mit den eigenen Nachrichten zuoberst. Ohne eigene
 * Fernmelderstelle (LdF, Altwert FMZ, andere Stellen) bleibt die Ordnung
 * von Ring 2 unverändert; innerhalb jeder Gruppe ebenso (Vorrang, Eingang).
 */
export function eigeneZuerst(zeilen: readonly Nachrichtenzeile[], stellen: readonly string[]): readonly Nachrichtenzeile[] {
  if (eigeneFernmelder(stellen).length === 0) return zeilen;
  return zeilen
    .map((zeile, index) => ({ zeile, index, rang: rang(zeile, stellen) }))
    .sort((a, b) => a.rang - b.rang || a.index - b.index)
    .map((e) => e.zeile);
}

/** Nur die Nachrichten, die einem der eigenen Fernmelder zugeteilt sind. */
export function nurZugeteilte(zeilen: readonly Nachrichtenzeile[], stellen: readonly string[]): readonly Nachrichtenzeile[] {
  return zeilen.filter((zeile) => rang(zeile, stellen) === 0);
}

/** Ist die Zeile einem der eigenen Fernmelder zugeteilt? */
export function mirZugeteilt(zeile: Nachrichtenzeile, stellen: readonly string[]): boolean {
  return rang(zeile, stellen) === 0;
}
