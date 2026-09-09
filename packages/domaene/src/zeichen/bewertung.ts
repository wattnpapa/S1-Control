/**
 * Bewertung der Katalogkandidaten (M1.4, aus v1 `tactical-sign/scoring.ts`).
 *
 * Die vier Summanden und ihre Gewichte sind unveraendert aus v1 uebernommen.
 * Sie sind nicht hergeleitet, sondern erprobt — deshalb stehen sie in
 * `inferenz.ts` als Startwerte und nicht als Regel.
 */

import type { KatalogEintrag } from "./katalog.js";
import { ZEICHEN_ALIASE } from "./thw-kuerzel.js";
import { normalisiereText, wortmenge, zerlegeInWorte } from "./text.js";

export interface BewerteterEintrag extends KatalogEintrag {
  readonly punkte: number;
}

function aliasWorte(schluessel: string): readonly string[] {
  const eintrag = ZEICHEN_ALIASE.find((alias) => alias.schluessel === schluessel);
  if (eintrag === undefined) return [];
  return eintrag.aliase.map(normalisiereText).filter((alias) => alias.length > 0);
}

function bewerte(name: string, eintrag: KatalogEintrag): number {
  const normalisierterName = normalisiereText(name);
  const namensworte = wortmenge(name);
  if (normalisierterName.length === 0 || namensworte.size === 0) return 0;

  const bezeichnungNormalisiert = normalisiereText(eintrag.bezeichnung);
  const bezeichnungsworte = zerlegeInWorte(eintrag.bezeichnung);

  let punkte = 0;
  // Die ganze Bezeichnung steckt im Namen — der staerkste Beleg.
  if (bezeichnungNormalisiert.length > 0 && normalisierterName.includes(bezeichnungNormalisiert)) {
    punkte += 0.55;
  }
  // Das Einheitenkuerzel steckt im Namen.
  if (eintrag.einheit.length > 0 && normalisierterName.includes(normalisiereText(eintrag.einheit))) {
    punkte += 0.25;
  }
  // Anteil der Bezeichnungsworte, die im Namen vorkommen.
  if (bezeichnungsworte.length > 0) {
    const treffer = bezeichnungsworte.filter((wort) => namensworte.has(wort)).length;
    punkte += (treffer / bezeichnungsworte.length) * 0.25;
  }
  // Eine bekannte Schreibweise trifft.
  if (aliasWorte(eintrag.schluessel).some((alias) => normalisierterName.includes(alias))) {
    punkte += 0.3;
  }
  return Math.min(1, punkte);
}

/** Der Katalog, absteigend nach Punkten. */
export function bewerteKandidaten(
  name: string,
  eintraege: readonly KatalogEintrag[],
): readonly BewerteterEintrag[] {
  return eintraege
    .map((eintrag) => ({ ...eintrag, punkte: bewerte(name, eintrag) }))
    .sort((a, b) => b.punkte - a.punkte);
}
