/**
 * Textnormalisierung fuer die Zeichen- und STAN-Inferenz (M1.4).
 *
 * Uebernommen aus v1, wo dieselbe Funktion in vier Dateien stand
 * (`tactical-sign/scoring.ts`, `tactical-sign/thw-shortcodes.ts`,
 * `tactical-sign/catalog.ts`, `stan/thw-stan-inference.ts`). Die vierfache
 * Kopie war der Grund, sie beim Portieren zuerst herauszuziehen: Vier
 * Fassungen derselben Regel sind vier Stellen, an denen sie auseinanderlaufen
 * kann, und die Inferenz haengt an jedem Zeichen.
 *
 * Rein und plattformneutral: keine Uhr, kein Zufall, keine Plattform-API.
 */

/**
 * Kleinschreibung, Diakritika weg, alles ausser `a-z0-9` zu einem Leerzeichen.
 *
 * `NFKD` zerlegt Umlaute in Grundzeichen plus Diakritikum, das die folgende
 * Ersetzung entfernt: aus „Brückenbau" wird „bruckenbau". Das ist gewollt —
 * die Kuerzel der Excel und der Handlisten sind uneinheitlich geschrieben
 * („Oel", „Öl", „Ol"), und die Inferenz soll alle drei finden.
 */
export function normalisiereText(wert: string): string {
  return wert
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Die Woerter eines normalisierten Textes, ohne leere. */
export function zerlegeInWorte(wert: string): string[] {
  const normalisiert = normalisiereText(wert);
  if (normalisiert.length === 0) return [];
  return normalisiert.split(/\s+/).filter((wort) => wort.length > 0);
}

/** Dieselbe Zerlegung als Menge — fuer Treffer-Pruefungen. */
export function wortmenge(wert: string): ReadonlySet<string> {
  return new Set(zerlegeInWorte(wert));
}

/**
 * Trifft ein Muster auf einen Namen zu?
 *
 * Ein Muster mit Leerzeichen wird als Teilzeichenkette gesucht, ein Muster
 * ohne als **ganzes Wort**. Der Unterschied ist keine Feinheit: „w" als
 * Teilzeichenkette traefe jedes Wort mit einem w, „fgr w" dagegen soll auch
 * in „FGr W (A) Oldenburg" gefunden werden.
 */
export function trifftMuster(
  normalisierterName: string,
  worte: ReadonlySet<string>,
  muster: string,
): boolean {
  const normalisiertesMuster = normalisiereText(muster);
  if (normalisiertesMuster.length === 0) return false;
  return normalisiertesMuster.includes(" ")
    ? normalisierterName.includes(normalisiertesMuster)
    : worte.has(normalisiertesMuster);
}
