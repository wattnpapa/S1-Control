/**
 * Der Vorlagenkatalog, zusammengesetzt aus seinen Quellen (M1.4).
 *
 * Zwei der drei Kataloge aus Zieldatenmodell §2.10 sind gefuellt; `KATS_STAN_NDS`
 * fehlt, weil die Arbeitsmappe nicht vorliegt (siehe `feuerwehr.ts`).
 */

import { FEUERWEHR_VORLAGEN } from "./feuerwehr.js";
import { THW_VORLAGEN } from "./thw.js";
import type { EinheitVorlage, Vorlagenkatalog } from "./katalog.js";

const ALLE: readonly EinheitVorlage[] = [...THW_VORLAGEN, ...FEUERWEHR_VORLAGEN];

/** Alle Vorlagen, in stabiler Reihenfolge (Katalog, dann Kennung). */
export function vorlagen(): readonly EinheitVorlage[] {
  return ALLE;
}

/** Die Vorlagen eines Katalogs. */
export function vorlagenAus(katalog: Vorlagenkatalog): readonly EinheitVorlage[] {
  return ALLE.filter((vorlage) => vorlage.katalog === katalog);
}

/** Eine Vorlage nach ihrer Kennung; `undefined`, wenn es sie nicht gibt. */
export function vorlage(id: string): EinheitVorlage | undefined {
  return ALLE.find((eintrag) => eintrag.id === id);
}

/**
 * Die Kataloge, die tatsaechlich Eintraege haben.
 *
 * Ausdruecklich als Funktion und nicht als Konstante: Sobald
 * `KATS_STAN_NDS` nachgezogen wird, stimmt sie ohne weiteres Zutun, und ein
 * Aufrufer, der sich darauf verlaesst, muss nicht angefasst werden.
 */
export function gefuellteKataloge(): readonly Vorlagenkatalog[] {
  const gesehen = new Set<Vorlagenkatalog>();
  for (const eintrag of ALLE) gesehen.add(eintrag.katalog);
  return [...gesehen].sort();
}
