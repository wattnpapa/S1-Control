/**
 * Die Tabulatorfolge der Aufnahmemaske (Audit Fernmelder P1-2, zweite Runde
 * R2-FM P1-1) — die Plätze der Felder für `springeTabfolge` in `Maske.tsx`.
 *
 * Die erste Fassung kannte nur zehn Felder (Mittel, Uhrzeit, Gegenstelle,
 * Absender, Anschrift, Vorrang, Betreff, Inhalt); Handzeichen, Nr.,
 * Abfassungszeit, Zeichen, Funktion und der ganze Laufzettel lagen außerhalb
 * und waren nur mit der Maus erreichbar. Im Papier-Nachtrag sind gerade diese
 * Felder Pflicht, und „Nachtragen“ blieb ohne Maus gesperrt. Jetzt läuft die
 * Folge in der Reihenfolge, in der der Fernmelder den Spruch mitschreibt:
 * Kopf (Mittel, Uhrzeit, Hdz, Gegenstelle, Nr.), Absender, Anschrift,
 * Vorrang, Betreff, Inhalt, dann die Felder, die der Spruch mitbringt
 * (Abfassungszeit, Zeichen, Funktion), und der Laufzettel (Quittung, Hdz,
 * Raster, Vermerke) — danach der Knopf „Aufnehmen“.
 *
 * Gleiche Zahlen (die Kästchen des Rasters) folgen der Dokumentordnung;
 * `springeTabfolge` sortiert stabil.
 */

export const AUFNAHMEFOLGE = {
  mittel: 1,
  zeit: 2,
  handzeichen: 3,
  gegenstelle: 4,
  nummer: 5,
  absender: 6,
  anschrift: 7,
  SOFORT: 8,
  BLITZ: 9,
  betreff: 10,
  inhalt: 11,
  abfassungszeit: 12,
  zeichen: 13,
  funktion: 14,
  quittung: 15,
  laufzettelHandzeichen: 16,
  raster: 17,
  vermerke: 18,
} as const;

export type Aufnahmefeld = keyof typeof AUFNAHMEFOLGE;

/** Der Platz des Felds, wenn die Maske die Folge der Aufnahme führt; sonst die Folge des Dokuments. */
export function aufnahmeplatz(mit: boolean, feld: Aufnahmefeld): number | undefined {
  return mit ? AUFNAHMEFOLGE[feld] : undefined;
}
