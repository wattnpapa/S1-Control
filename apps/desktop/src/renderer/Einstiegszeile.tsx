/**
 * Die Einstiegszeile je Blatt (Entwurf „Entlastung", 3.6, Optionen 6b, 6e).
 *
 * Statt zwölf Fragezeichen an den Kartenköpfen steht beim ersten Aufschlagen
 * eines Blatts **eine** Zeile unter dem Kopfband: fett der Blattname, ein
 * Satz, was das Blatt ist, und „Verstanden". Danach steht derselbe Satz nur
 * noch in der Hilfe (Strg+H), die sich nicht ändert.
 *
 * **Der Satz kommt aus `ANSICHTEN` in Ring 2** — derselben Liste, aus der
 * Hilfefenster und Handbuch lesen. Ein eigener Text hier wäre nach der
 * zweiten Änderung ein anderer als dort. Genommen wird der erste Satz von
 * „Wozu"; die Lage nimmt den Text der Einheitentabelle, weil das Blatt im
 * Wesentlichen diese Tabelle ist.
 *
 * Gemerkt wird je Gerät (`s1.einstieg.<blatt>`, `geraetemerker.ts`): Die
 * Zeile betrifft keinen Einsatz.
 */

import { useState } from "react";

import { ansichtshilfe, type Ansichtskennung } from "@s1/domaene";

import { BLAETTER, type Blatt } from "./blaetter.js";
import { istGemerkt, merke } from "./geraetemerker.js";
import { kuerzel, kuerzelText } from "./tastatur.js";

const KENNUNG: Readonly<Record<Blatt, Ansichtskennung>> = {
  lage: "einheiten",
  eingang: "eingangskorb",
  anforderungen: "anforderungen",
  fuest: "fuehrungsstelle",
  funkplan: "funkplan",
  versorgung: "versorgung",
  kosten: "kosten",
  fueorg: "abschnitte",
  ausgaben: "ausgaben",
  tagebuch: "tagebuch",
  diagnose: "diagnose",
};

export function einstiegsschluessel(blatt: Blatt): string {
  return `s1.einstieg.${blatt}`;
}

/** Der erste Satz eines Hilfetexts — bis zum ersten Satzzeichen vor Leerraum oder Ende. */
export function ersterSatz(text: string): string {
  return /^.*?[.!?](?=\s|$)/su.exec(text)?.[0] ?? text;
}

export function Einstiegszeile({ blatt }: { readonly blatt: Blatt }): React.JSX.Element | null {
  // Auch ohne Speicher bleibt die Zeile weg, nachdem sie in dieser Sitzung
  // bestätigt wurde; erst das nächste Öffnen zeigt sie wieder.
  const [bestaetigt, setzeBestaetigt] = useState<readonly Blatt[]>([]);
  if (bestaetigt.includes(blatt) || istGemerkt(einstiegsschluessel(blatt))) return null;
  const titel = BLAETTER.find((eintrag) => eintrag.schluessel === blatt)?.titel ?? blatt;
  const satz = ersterSatz(ansichtshilfe(KENNUNG[blatt]).wozu);
  return (
    <aside className="einstiegszeile" aria-label={`Einstieg: ${titel}`}>
      <p>
        <strong>{titel}</strong> {satz} <span className="nebenwert">Mehr in der Hilfe ({kuerzelText(kuerzel("hilfe") as never)}).</span>
      </p>
      <button
        type="button"
        onClick={() => {
          merke(einstiegsschluessel(blatt));
          setzeBestaetigt([...bestaetigt, blatt]);
        }}
      >
        Verstanden
      </button>
    </aside>
  );
}
