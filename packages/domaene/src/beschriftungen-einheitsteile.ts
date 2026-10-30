/**
 * Die Beschriftungen der Werte an Fahrzeug und Person (§5.5) — ein Wort je
 * Wert, so wie es auf dem Blatt der Führungsstelle steht.
 *
 * Eine eigene Datei neben `beschriftungen.ts` und nicht darin, weil diese
 * Wörter nur die Untertabellen einer Einheit und ihr Tagebuch brauchen; die
 * Spaltenwörter der Einheitentabelle bleiben, wo sie sind.
 *
 * **Die Werte kommen aus dem Katalog** (`katalog/bausteine.ts`), nicht aus
 * einer zweiten Liste: Die Maske bietet genau an, was das Nutzlastschema
 * annimmt. Käme ein Wert hinzu, fehlte hier nur sein Wort — und dann steht
 * der Schlüssel da, nicht eine Lücke.
 *
 * „Helfer“ für `MANNSCHAFT` ist das Wort der Excel: Die Stärke heißt dort
 * „Fü/UFü/He“.
 */

import { zErnaehrung, zFahrzeugStatus, zGeschlecht, zRolle } from "./katalog/bausteine.js";

/** Ein Eintrag eines Auswahlfelds: der Schlüssel des Ereignisses und sein Wort. */
export interface Auswahlwert {
  readonly wert: string;
  readonly titel: string;
}

const WOERTER: Readonly<Record<string, string>> = {
  FUEHRER: "Führer",
  UNTERFUEHRER: "Unterführer",
  MANNSCHAFT: "Helfer",
  MAENNLICH: "männlich",
  WEIBLICH: "weiblich",
  DIVERS: "divers",
  FLEISCH: "mit Fleisch",
  VEGETARISCH: "vegetarisch",
  VEGAN: "vegan",
  EINSATZBEREIT: "Einsatzbereit",
  NICHT_EINSATZBEREIT: "Nicht einsatzbereit",
};

/** Das Wort zu einem Wert; ein unbekannter Wert bleibt sichtbar (§3.7). */
export function einheitsteilTitel(wert: string): string {
  return WOERTER[wert] ?? wert;
}

function auswahl(werte: readonly string[]): readonly Auswahlwert[] {
  return werte.map((wert) => ({ wert, titel: einheitsteilTitel(wert) }));
}

/** Die Rollen einer Person — dieselben drei wie im Stärke-Tripel. */
export const ROLLEN_AUSWAHL = auswahl(zRolle.options);
export const GESCHLECHT_AUSWAHL = auswahl(zGeschlecht.options);
export const ERNAEHRUNG_AUSWAHL = auswahl(zErnaehrung.options);
export const FAHRZEUGSTATUS_AUSWAHL = auswahl(zFahrzeugStatus.options);
