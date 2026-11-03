/**
 * Die Blätter „Eingang" und „Führungsstelle" mit ihrem Umschalter (Entwurf
 * „Entlastung", 3.2, Schnitt E3).
 *
 * Der Umschalter ist derselbe wie in der Versorgung (`.umschalter`,
 * `aria-pressed`): Knöpfe ohne Zwischenraum, der gewählte gefüllt. Darunter
 * steht **nur die gewählte Unteransicht**. Die andere ist nicht bloß
 * versteckt, sondern ausgehängt: So gelten Strg+N und die übrigen Kürzel
 * eines Unterblatts nur, solange es zu sehen ist, und ein Blatt holt seine
 * Daten erst, wenn es aufgeschlagen wird (M3.7) — wie bisher als Reiter.
 *
 * Welche Unteransicht offen ist, hält der Arbeitsplatz: Die Einstiegszeile
 * über dem Blatt richtet sich danach.
 */

import { Anforderungen } from "./Anforderungen.js";
import { Eingangskorb } from "./Eingangskorb.js";
import { Fuehrungsorganisation } from "./Fuehrungsorganisation.js";
import { Fuehrungsstelle } from "./Fuehrungsstelle.js";
import { blatttitel } from "./blaetter.js";
import { useLaden } from "./laden.js";
import { UNTERBLAETTER, type Sammelblatt, type Unteransicht } from "./unterblaetter.js";

export interface BlattumschalterEigenschaften<B extends Sammelblatt> {
  readonly blatt: B;
  readonly gewaehlt: Unteransicht<B>;
  readonly aufWahl: (unter: Unteransicht<B>) => void;
  /** Ein Zusatz je Unteransicht, in Klammern hinter dem Namen („3 offen"). */
  readonly zusatz?: Partial<Record<Unteransicht<B>, string>>;
}

export function Blattumschalter<B extends Sammelblatt>({
  blatt,
  gewaehlt,
  aufWahl,
  zusatz,
}: BlattumschalterEigenschaften<B>): React.JSX.Element {
  const eintraege: readonly { readonly schluessel: Unteransicht<B>; readonly titel: string }[] = UNTERBLAETTER[blatt];
  return (
    <div className="werkzeugzeile">
      <div className="umschalter" role="group" aria-label={`Unteransicht ${blatttitel(blatt)}`}>
        {eintraege.map((eintrag) => {
          const extra = zusatz?.[eintrag.schluessel];
          return (
            <button
              key={eintrag.schluessel}
              type="button"
              aria-pressed={gewaehlt === eintrag.schluessel}
              onClick={() => {
                aufWahl(eintrag.schluessel);
              }}
            >
              {extra === undefined ? eintrag.titel : `${eintrag.titel} (${extra})`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SammelblattEigenschaften<B extends Sammelblatt> {
  readonly gewaehlt: Unteransicht<B>;
  readonly aufWahl: (unter: Unteransicht<B>) => void;
}

/** „Eingang": Eingangskorb und Anforderungen — was von außen hereinkommt. */
export function Eingangsblatt({ gewaehlt, aufWahl }: SammelblattEigenschaften<"eingang">): React.JSX.Element {
  const offen = useLaden((zustand) => zustand.eingangskorb?.offen ?? 0);
  return (
    <div className="sammelblatt">
      <Blattumschalter
        blatt="eingang"
        gewaehlt={gewaehlt}
        aufWahl={aufWahl}
        {...(offen > 0 ? { zusatz: { eingangskorb: `${String(offen)} offen` } } : {})}
      />
      {gewaehlt === "eingangskorb" ? <Eingangskorb /> : <Anforderungen />}
    </div>
  );
}

/** „Führungsstelle": Stammdaten mit Dienstposten und Schichtplan, daneben die Harke. */
export function Fuehrungsblatt({ gewaehlt, aufWahl }: SammelblattEigenschaften<"fuest">): React.JSX.Element {
  return (
    <div className="sammelblatt">
      <Blattumschalter blatt="fuest" gewaehlt={gewaehlt} aufWahl={aufWahl} />
      {gewaehlt === "stammdaten" ? <Fuehrungsstelle /> : <Fuehrungsorganisation />}
    </div>
  );
}
