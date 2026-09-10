/**
 * Die Nebenblätter: Kosten, Anforderungen, Führungsstelle (M5).
 *
 * **Warum eine Reiterleiste und nicht drei weitere Abschnitte untereinander.**
 * Das Lagebild trägt schon Baum, Tabelle, Ausgaben und Tagebuch. Drei weitere
 * Blätter darunter hieße scrollen, um die Lage zu sehen — und die Lage ist
 * das, was während eines Einsatzes offen bleibt. Die Blätter hier werden
 * dagegen aufgeschlagen, gelesen und wieder zugeklappt.
 *
 * **Zugeklappt kostet nichts.** Genau darauf beruht der Zuschnitt aus M3.7:
 * Geschoben wird ein Zeiger, geholt wird, was offen ist. Solange niemand die
 * Kostenübersicht aufschlägt, holt der Renderer sie nicht — und `frischeAnsichten`
 * erneuert sie danach nur, weil sie einmal geholt wurde.
 */

import { useState } from "react";

import { Anforderungen } from "./Anforderungen.js";
import { Kosten } from "./Kosten.js";

/** Die Blätter in der Reihenfolge, in der sie in der Leiste stehen. */
const BLAETTER = [
  { schluessel: "anforderungen", titel: "Anforderungen" },
  { schluessel: "kosten", titel: "Kosten" },
] as const;

type Blatt = (typeof BLAETTER)[number]["schluessel"];

export function Blaetter(): React.JSX.Element {
  const [offen, setzeOffen] = useState<Blatt | undefined>(undefined);

  return (
    <section aria-label="Nebenblätter" className="blaetter">
      <div className="reiterleiste" role="tablist">
        {BLAETTER.map((blatt) => (
          <button
            key={blatt.schluessel}
            type="button"
            role="tab"
            aria-selected={offen === blatt.schluessel}
            onClick={() => {
              // Ein zweiter Klick auf denselben Reiter klappt zu. Das ist die
              // Bedienung, die ein Blatt braucht, das man kurz aufschlägt.
              setzeOffen((bisher) => (bisher === blatt.schluessel ? undefined : blatt.schluessel));
            }}
          >
            {blatt.titel}
          </button>
        ))}
      </div>
      {offen === "anforderungen" && <Anforderungen />}
      {offen === "kosten" && <Kosten />}
    </section>
  );
}
