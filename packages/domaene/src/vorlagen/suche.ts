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
import { AKUELI } from "../akueli.js";
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

/** Kürzel → Bedeutung aus der Abkürzungsliste: „ZTr“ findet auch „Zugtrupp“. */
const BEDEUTUNG_JE_KUERZEL: ReadonlyMap<string, string> = new Map(
  AKUELI.map((eintrag) => [vergleichbar(eintrag.kuerzel), vergleichbar(eintrag.bedeutung)]),
);

function worte(text: string): string[] {
  return vergleichbar(text).split(/[^a-z0-9]+/).filter((wort) => wort !== "");
}

/** Die Wörter der Bezeichnung und was ihre Kürzel bedeuten. */
function suchbestand(eintrag: EinheitVorlage): { bezeichnung: string; woerter: string[]; lang: string[]; alias: string } {
  const bezeichnung = vergleichbar(eintrag.bezeichnung).replace(/[()]/g, "").trim();
  const woerter = worte(eintrag.bezeichnung);
  const alias = woerter
    .map((wort) => BEDEUTUNG_JE_KUERZEL.get(wort))
    .filter((bedeutung): bedeutung is string => bedeutung !== undefined)
    .join(" ");
  return { bezeichnung, woerter, lang: worte(`${eintrag.lang ?? ""} ${alias}`), alias };
}

/**
 * Wie gut ein Suchwort passt — kleiner ist besser; `undefined` heißt: gar nicht.
 *
 * 0 die ganze Bezeichnung, 1 ein ganzes Wort der Bezeichnung, 2 Anfang der
 * Bezeichnung, 3 Wortanfang in der Bezeichnung, 4 Wortanfang in Langname oder
 * Kürzelbedeutung, 5 Teiltreffer in der Bezeichnung, 6 Teiltreffer im Rest.
 * So steht „TZ“ vor „Nutzlast“ und „LG“ vor „LGr“.
 */
function wortguete(bestand: ReturnType<typeof suchbestand>, lang: string | undefined, wort: string): number | undefined {
  if (bestand.bezeichnung === wort) return 0;
  if (bestand.woerter.includes(wort)) return 1;
  if (bestand.bezeichnung.startsWith(wort)) return 2;
  if (bestand.woerter.some((w) => w.startsWith(wort))) return 3;
  if (bestand.lang.some((w) => w.startsWith(wort))) return 4;
  if (bestand.bezeichnung.includes(wort)) return 5;
  if (vergleichbar(`${lang ?? ""} ${bestand.alias}`).includes(wort)) return 6;
  return undefined;
}

/** Die Güte einer Vorlage für alle Suchwörter; `undefined`, wenn eines nicht passt. */
function guete(eintrag: EinheitVorlage, suchwoerter: readonly string[]): number | undefined {
  const bestand = suchbestand(eintrag);
  let summe = 0;
  for (const wort of suchwoerter) {
    const einzeln = wortguete(bestand, eintrag.lang, wort);
    if (einzeln === undefined) return undefined;
    summe += einzeln;
  }
  return summe;
}

/**
 * Entfernt Doppelte: dieselbe Bezeichnung derselben Organisation aus mehreren
 * Katalogen erscheint einmal, mit Sollstärke bevorzugt. Ist ein Katalog
 * gewählt, gibt es keine Doppelten.
 */
function ohneDoppelte(treffer: readonly EinheitVorlage[]): EinheitVorlage[] {
  const beste = new Map<string, EinheitVorlage>();
  for (const eintrag of treffer) {
    const schluessel = `${vergleichbar(eintrag.bezeichnung)}|${vergleichbar(eintrag.lang ?? "")}|${eintrag.organisation}`;
    const bisher = beste.get(schluessel);
    if (bisher === undefined || (bisher.sollStaerke === undefined && eintrag.sollStaerke !== undefined)) {
      beste.set(schluessel, eintrag);
    }
  }
  const behalten = new Set(beste.values());
  return treffer.filter((eintrag) => behalten.has(eintrag));
}

/**
 * Die Vorlagen, die zum Filter passen.
 *
 * Ohne Suchtext in der Reihenfolge des Katalogs. Mit Suchtext nach Güte:
 * genaue Kürzel und Wortanfänge zuerst, Teiltreffer danach, bei gleicher
 * Güte Vorlagen mit Sollstärke vor solchen ohne.
 */
export function sucheVorlagen(filter: Vorlagenfilter): readonly EinheitVorlage[] {
  const suchwoerter = worte(filter.text ?? "");
  const infrage = vorlagen().filter(
    (eintrag) =>
      (filter.katalog === undefined || eintrag.katalog === filter.katalog) &&
      (filter.organisation === undefined || vorlagenOrganisationen(eintrag).includes(filter.organisation)),
  );
  const treffer = filter.katalog === undefined ? ohneDoppelte(infrage) : infrage;
  if (suchwoerter.length === 0) return treffer;
  return treffer
    .map((eintrag, reihenfolge) => ({ eintrag, reihenfolge, guete: guete(eintrag, suchwoerter) }))
    .filter((zeile): zeile is typeof zeile & { guete: number } => zeile.guete !== undefined)
    .sort(
      (a, b) =>
        a.guete - b.guete ||
        Number(b.eintrag.sollStaerke !== undefined) - Number(a.eintrag.sollStaerke !== undefined) ||
        a.reihenfolge - b.reihenfolge,
    )
    .map((zeile) => zeile.eintrag);
}
