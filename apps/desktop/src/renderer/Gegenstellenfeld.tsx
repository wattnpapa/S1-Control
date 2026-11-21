/**
 * Das Feld 6 des Vordrucks („Rufname der Gegenstelle / Spruchkopf“) mit der
 * Vorschlagsliste der Einheiten der Lage. Freitext bleibt erlaubt: Die
 * Gegenstelle draußen (Heros, Leitstelle, Nachbar-FüSt) steht oft in keiner
 * Liste. Eine Quelle für Aufnahme, Papier-Nachtrag und Befördern.
 */

import { useId } from "react";

import type { Gegenstelle } from "../kontrakt/index.js";

import { GEGENSTELLE_BESCHRIFTUNG, GEGENSTELLE_HILFE } from "./gegenstellentext.js";

export interface GegenstellenfeldEigenschaften {
  readonly wert: string;
  readonly aufAenderung: (wert: string) => void;
  /** Die Einheiten der Lage als Vorschläge; leer oder fehlend: nur Freitext. */
  readonly gegenstellen?: readonly Gegenstelle[] | undefined;
  /** Platzhalter; ohne Angabe „Einheit wählen oder Freitext“ (mit Vorschlägen) bzw. ein Beispiel. */
  readonly platzhalter?: string | undefined;
  readonly tabfolge?: number | undefined;
}

/** Die Namen für die Vorschlagsliste: ohne leere und doppelte, in der Reihenfolge der Lage. */
export function gegenstellenvorschlaege(gegenstellen: readonly Gegenstelle[] | undefined): readonly string[] {
  return [...new Set((gegenstellen ?? []).map((g) => g.name.trim()).filter((n) => n !== ""))];
}

export function Gegenstellenfeld({ wert, aufAenderung, gegenstellen, platzhalter, tabfolge }: GegenstellenfeldEigenschaften): React.JSX.Element {
  const listenId = `gegenstellen-${useId()}`;
  const vorschlaege = gegenstellenvorschlaege(gegenstellen);
  const mitListe = vorschlaege.length > 0;
  return (
    <label>
      {GEGENSTELLE_BESCHRIFTUNG}
      <input
        value={wert}
        title={GEGENSTELLE_HILFE}
        list={mitListe ? listenId : undefined}
        placeholder={platzhalter ?? (mitListe ? "Einheit wählen oder Freitext" : "z. B. Heros Wildeshausen")}
        {...(tabfolge === undefined ? {} : { "data-tabfolge": tabfolge })}
        onChange={(e) => aufAenderung(e.target.value)}
      />
      {mitListe && (
        <datalist id={listenId}>
          {vorschlaege.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      )}
    </label>
  );
}
