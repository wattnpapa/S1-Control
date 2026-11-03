/**
 * Eine Filterzeile mit Chips wie über der Einheitentabelle (Entwurf
 * „Entlastung", 3.5 und 3.7): links „Filter" klein in Mono, damit die Chips
 * als Filter lesbar sind (Audit P2-2), dann je Zustand ein Chip mit Marke und
 * Zahl, gewählt mit `aria-pressed`.
 *
 * Eingangskorb und Anforderungen filtern damit ihre Zustände. Keine Wahl
 * heißt „alle" und nicht „nichts": Eine leere Tabelle liest sich wie ein
 * Fehler. „Alle zeigen" hebt die Wahl auf, sobald es eine gibt.
 */

import type { ReactNode } from "react";

export interface Filterchip {
  readonly wert: string;
  readonly titel: string;
  /** Ton der Marke: `warn`, `ok` oder leer (neutral). */
  readonly ton: string;
  /** Fehlt, solange die Liste nicht geladen ist. */
  readonly anzahl: number | undefined;
}

export interface FilterchipsEigenschaften {
  /** Name der Gruppe für Vorleseprogramme („Filter nach Zustand"). */
  readonly beschriftung: string;
  readonly chips: readonly Filterchip[];
  readonly wahl: readonly string[];
  readonly aufWahl: (wahl: readonly string[]) => void;
  /** Was rechts in der Zeile steht (ein Schalter wie „Nur jüngste Fassung"). */
  readonly dazu?: ReactNode;
}

export function Filterchips({ beschriftung, chips, wahl, aufWahl, dazu }: FilterchipsEigenschaften): React.JSX.Element {
  return (
    <div className="statusfilter filterzeile" role="group" aria-label={beschriftung}>
      <span className="statusfilter-titel">Filter</span>
      {chips.map((chip) => {
        const gewaehlt = wahl.includes(chip.wert);
        return (
          <button
            key={chip.wert}
            type="button"
            aria-pressed={gewaehlt}
            title="Klicken filtert die Liste; keine Wahl zeigt alle"
            onClick={() => {
              aufWahl(gewaehlt ? wahl.filter((wert) => wert !== chip.wert) : [...wahl, chip.wert]);
            }}
          >
            <span className={chip.ton === "" ? "marke-zustand" : `marke-zustand ${chip.ton}`}>{chip.titel}</span>
            <span className="statusfilter-zahl">{chip.anzahl ?? "—"}</span>
          </button>
        );
      })}
      {wahl.length > 0 && (
        <button type="button" className="alsLink" onClick={() => aufWahl([])}>
          Alle zeigen
        </button>
      )}
      {dazu}
    </div>
  );
}
