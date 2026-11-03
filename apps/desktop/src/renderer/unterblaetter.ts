/**
 * Blätter mit Umschalter (Entwurf „Entlastung", 3.2, Schnitt E3).
 *
 * Zwei Blätter tragen je zwei Unteransichten: „Eingang" den Eingangskorb und
 * die Anforderungen, „Führungsstelle" Stammdaten mit Schichtplan und die
 * Führungsorganisation. Bis E3 waren das vier Reiter. Die Komponenten
 * bleiben, wie sie sind; nur der Weg dorthin ist ein Umschalter im Blatt.
 *
 * **Der Ort** ist die Schreibweise, unter der ein Blatt samt Unteransicht
 * gemerkt wird: `lage`, `eingang.anforderungen`, `fuest.fueorg`. Ihn nutzen
 * der Reload-Merker (`sitzung.ts`) und die Einstiegszeile (je Unteransicht
 * eine eigene Zeile). Die Unteransicht selbst ist eine Sache dieses Fensters.
 *
 * **Altbestand.** Ein Merker von vor E3 trägt `anforderungen` oder `fueorg`
 * als Blatt; beide landen in ihrem neuen Blatt mit der passenden
 * Unteransicht. Was es gar nicht gibt, ergibt keinen Ort, und der
 * Arbeitsplatz bleibt bei der Lage.
 */

import { blatttitel, istBlatt, type Blatt } from "./blaetter.js";

export const UNTERBLAETTER = {
  eingang: [
    { schluessel: "eingangskorb", titel: "Eingangskorb" },
    { schluessel: "anforderungen", titel: "Anforderungen" },
  ],
  fuest: [
    { schluessel: "stammdaten", titel: "Stammdaten und Schichtplan" },
    { schluessel: "fueorg", titel: "Führungsorganisation" },
  ],
} as const;

/** Ein Blatt mit Umschalter. */
export type Sammelblatt = keyof typeof UNTERBLAETTER;
export type Unteransicht<B extends Sammelblatt = Sammelblatt> = (typeof UNTERBLAETTER)[B][number]["schluessel"];

/** Welche Unteransicht je Sammelblatt aufgeschlagen ist. */
export type Unterwahl = { readonly [B in Sammelblatt]: Unteransicht<B> };

export const VORGABE_UNTERWAHL: Unterwahl = { eingang: "eingangskorb", fuest: "stammdaten" };

/** Ein Blatt, bei Sammelblättern mit Unteransicht. */
export type Blattort =
  | Exclude<Blatt, Sammelblatt>
  | { readonly [B in Sammelblatt]: `${B}.${Unteransicht<B>}` }[Sammelblatt];

/** Was ein gemerkter Ort aufschlägt: das Blatt und, wenn er sie nennt, die Unteransicht. */
export interface Aufschlag {
  readonly blatt: Blatt;
  readonly unterwahl?: Partial<Unterwahl>;
}

const ALTBESTAND: Readonly<Record<string, Aufschlag>> = {
  anforderungen: { blatt: "eingang", unterwahl: { eingang: "anforderungen" } },
  fueorg: { blatt: "fuest", unterwahl: { fuest: "fueorg" } },
};

export function istSammelblatt(blatt: Blatt): blatt is Sammelblatt {
  return Object.hasOwn(UNTERBLAETTER, blatt);
}

function istUnteransicht<B extends Sammelblatt>(blatt: B, wert: string): wert is Unteransicht<B> {
  return UNTERBLAETTER[blatt].some((eintrag) => eintrag.schluessel === wert);
}

/** Der Ort des aufgeschlagenen Blatts, mit Unteransicht, wo es eine gibt. */
export function blattort(blatt: Blatt, unterwahl: Unterwahl): Blattort {
  return istSammelblatt(blatt) ? (`${blatt}.${unterwahl[blatt]}` as Blattort) : blatt;
}

/** Liest einen gemerkten Ort — `undefined`, wenn es das Blatt nicht (mehr) gibt. */
export function aufschlagAus(wert: unknown): Aufschlag | undefined {
  if (typeof wert !== "string") return undefined;
  if (Object.hasOwn(ALTBESTAND, wert)) return ALTBESTAND[wert];
  const [blatt, unter] = wert.split(".", 2);
  if (!istBlatt(blatt)) return undefined;
  if (unter === undefined || !istSammelblatt(blatt) || !istUnteransicht(blatt, unter)) return { blatt };
  return { blatt, unterwahl: { [blatt]: unter } };
}

/** „Eingang · Anforderungen" — der Name des Orts, wie ihn die Einstiegszeile nennt. */
export function orttitel(ort: Blattort): string {
  const [blatt, unter] = ort.split(".", 2) as [Blatt, string | undefined];
  if (unter === undefined || !istSammelblatt(blatt)) return blatttitel(blatt);
  const titel = UNTERBLAETTER[blatt].find((eintrag) => eintrag.schluessel === unter)?.titel ?? unter;
  return `${blatttitel(blatt)} · ${titel}`;
}
