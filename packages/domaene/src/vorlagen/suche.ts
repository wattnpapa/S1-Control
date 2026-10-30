/**
 * Suche im Vorlagenkatalog — damit die lange Liste aus drei Katalogen in der
 * Anlegemaske bedienbar bleibt.
 *
 * Sie liegt in Ring 2 und nicht in der Maske, weil sie eine Regel ist und
 * keine Darstellung: *Unter welcher Organisation steht eine Vorlage?* Die
 * Antwort „unter jedem ihrer Traeger“ (`traeger`) gilt fuer jede Ansicht, die
 * Vorlagen anbietet, und ist ohne DOM pruefbar.
 */

import type { Organisation } from "../ereignis.js";
import type { EinheitVorlage, Vorlagenkatalog } from "./katalog.js";
import { vorlagen } from "./index.js";

export interface Vorlagenfilter {
  /** Freitext; jedes Wort muss in Kurz- oder Langbezeichnung vorkommen. */
  readonly text?: string;
  readonly katalog?: Vorlagenkatalog;
  readonly organisation?: Organisation;
}

/** Die Organisationen, unter denen eine Vorlage gefunden wird. */
export function vorlagenOrganisationen(eintrag: EinheitVorlage): readonly Organisation[] {
  return eintrag.traeger ?? [eintrag.organisation];
}

/** Gross-/Kleinschreibung und Umlaute spielen beim Tippen keine Rolle. */
function vergleichbar(text: string): string {
  return text
    .toLocaleLowerCase("de")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
}

function passtText(eintrag: EinheitVorlage, text: string | undefined): boolean {
  const woerter = vergleichbar(text ?? "").split(/\s+/).filter((wort) => wort !== "");
  if (woerter.length === 0) return true;
  const heuhaufen = vergleichbar(`${eintrag.bezeichnung} ${eintrag.lang ?? ""}`);
  return woerter.every((wort) => heuhaufen.includes(wort));
}

/** Die Vorlagen, die zum Filter passen, in der Reihenfolge des Katalogs. */
export function sucheVorlagen(filter: Vorlagenfilter): readonly EinheitVorlage[] {
  return vorlagen().filter(
    (eintrag) =>
      (filter.katalog === undefined || eintrag.katalog === filter.katalog) &&
      (filter.organisation === undefined || vorlagenOrganisationen(eintrag).includes(filter.organisation)) &&
      passtText(eintrag, filter.text),
  );
}
