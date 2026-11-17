/**
 * Die Zahlen hinter den Chips „neu", „gelesen", „erledigt" im Posteingang
 * (KONZEPT-NACHRICHTEN.md §6).
 *
 * Gezählt wird mit derselben Regel wie die Sicht selbst (`posteingangsstand`)
 * und über dieselben Zeilen wie `nachrichtenausschnitt`: Die Zahl am Chip ist
 * damit die Gesamtzahl, die der Chip anschließend zeigt. Zurückgezogene
 * Nachrichten zählen deshalb mit, solange die Sicht sie zeigt — anders als im
 * Band (`nachrichtenlage`), das nur Offenes zählt.
 */

import type { Zustand } from "../zustand.js";
import { posteingangsstand, type Posteingangsstand } from "./nachrichten.js";
import { offenFuerStellen, type Offenumfeld } from "./nachrichtenoffen.js";
import { alleNachrichtenzeilen, zeilenkontext } from "./nachrichtenzeile.js";

/**
 * Die Zahl der Nachrichten im Posteingang dieser Stellen, je Stand — und
 * additiv `OFFEN`: die Gesamtzahl der Sicht „offen" (SGL P1-7, dieselbe
 * Regel `offenFuerStellen`), damit der Chip der Übergabe seine Zahl trägt.
 */
export function nachrichtenZaehlung(
  zustand: Zustand,
  stellen: readonly string[],
  jetzt?: string,
  umfeld: Offenumfeld = {},
): Readonly<Record<Posteingangsstand | "OFFEN", number>> {
  const zahlen: Record<Posteingangsstand | "OFFEN", number> = { NEU: 0, GELESEN: 0, ERLEDIGT: 0, OFFEN: 0 };
  for (const zeile of alleNachrichtenzeilen(zustand, zeilenkontext(zustand, jetzt))) {
    const stand = posteingangsstand(zeile, stellen);
    if (stand !== undefined) zahlen[stand] += 1;
    if (offenFuerStellen(zeile, stellen, umfeld)) zahlen.OFFEN += 1;
  }
  return zahlen;
}
