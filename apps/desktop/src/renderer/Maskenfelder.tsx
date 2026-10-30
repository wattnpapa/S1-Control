/**
 * Die Felder, die mehrere Masken der Einheitentabelle teilen: Abschnittswahl
 * und Stärke. Sie stehen hier und nicht in `Einheitenmasken.tsx`, seit die
 * Anlegemaske eine eigene Datei hat (`EinheitAnlegen.tsx`) — zwei Kopien
 * desselben Stärkefelds prüften die Eingabe nach zwei Regeln.
 */

import { STAERKE_OBERGRENZE, istStaerkeEingabe } from "../kontrakt/bedienschritte.js";

/** Eine Stärkeeingabe als Zahl; Ungültiges zählt als 0 und ist am Feld markiert. */
export function zahl(eingabe: string): number {
  if (!istStaerkeEingabe(eingabe)) return 0;
  const wert = Number.parseInt(eingabe, 10);
  return Number.isNaN(wert) ? 0 : wert;
}

/** Ein Stärkefeld der Masken: markiert eine ungültige Eingabe, statt sie still zu null zu machen. */
function Staerkefeld({
  titel,
  wert,
  aufWert,
}: {
  readonly titel: string;
  readonly wert: string;
  readonly aufWert: (wert: string) => void;
}): React.JSX.Element {
  const gueltig = istStaerkeEingabe(wert);
  return (
    <label>
      {titel}
      <input
        value={wert}
        onChange={(e) => {
          aufWert(e.target.value);
        }}
        inputMode="numeric"
        aria-invalid={!gueltig}
        title={gueltig ? undefined : `Ganze Zahl von 0 bis ${String(STAERKE_OBERGRENZE)}`}
      />
      {!gueltig && <span className="feldfehler">Ganze Zahl von 0 bis {STAERKE_OBERGRENZE}</span>}
    </label>
  );
}

export interface Staerkeeingabe {
  readonly fuehrer: string;
  readonly unterfuehrer: string;
  readonly mannschaft: string;
}

export function Staerkefelder({
  wert,
  aufWert,
}: {
  readonly wert: Staerkeeingabe;
  readonly aufWert: (wert: Staerkeeingabe) => void;
}): React.JSX.Element {
  return (
    <>
      <Staerkefeld
        titel="Führer"
        wert={wert.fuehrer}
        aufWert={(fuehrer) => {
          aufWert({ ...wert, fuehrer });
        }}
      />
      <Staerkefeld
        titel="Unterführer"
        wert={wert.unterfuehrer}
        aufWert={(unterfuehrer) => {
          aufWert({ ...wert, unterfuehrer });
        }}
      />
      <Staerkefeld
        titel="Mannschaft"
        wert={wert.mannschaft}
        aufWert={(mannschaft) => {
          aufWert({ ...wert, mannschaft });
        }}
      />
    </>
  );
}

interface FlacherKnoten {
  readonly id: string;
  readonly name: string;
  readonly kinder: readonly unknown[];
}

function flach(knoten: readonly FlacherKnoten[]): readonly FlacherKnoten[] {
  return knoten.flatMap((eintrag) => [eintrag, ...flach(eintrag.kinder as readonly FlacherKnoten[])]);
}

export function Abschnittswahl({
  wert,
  abschnitte,
  aufWahl,
}: {
  readonly wert: string;
  readonly abschnitte: readonly FlacherKnoten[];
  readonly aufWahl: (id: string) => void;
}): React.JSX.Element {
  const alle = flach(abschnitte);
  return (
    <select
      value={wert}
      onChange={(e) => {
        aufWahl(e.target.value);
      }}
    >
      <option value="">— bitte wählen —</option>
      {alle.map((eintrag) => (
        <option key={eintrag.id} value={eintrag.id}>
          {eintrag.name}
        </option>
      ))}
    </select>
  );
}
