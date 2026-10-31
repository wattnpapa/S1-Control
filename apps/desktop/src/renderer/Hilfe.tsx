/**
 * Das Hilfefenster: Erste Schritte, Tastenkürzel, Abkürzungsliste, Ansichten,
 * Störfälle (M3.6, erweitert in M8.1).
 *
 * **Nichts hier ist abgeschrieben.** Die Tastenkürzel kommen aus derselben
 * Liste, aus der die Kürzel tatsächlich greifen; die Abkürzungen aus der, die
 * die Suche bedient; die Ansichtstexte aus der, die auch an den Ansichten
 * selbst hängt; die Störfälle aus der, die die Diagnose und die gedruckte
 * Karte lesen. Zwei Listen wären nach der dritten Änderung zwei verschiedene,
 * und die falsche stünde in der Hilfe.
 *
 * **Klartext zuerst.** Wer die Hilfe öffnet, hat eine Frage; der erste Bereich
 * beantwortet in wenigen Sätzen, wie ein Einsatz abläuft, und führt die
 * Tastenkürzel erst danach. Die Hilfe schließt mit Esc, mit „Schließen“ und
 * mit einem Tipp außerhalb — auf dem Handy der einzige Weg ohne Tastatur.
 *
 * **Vier Bereiche, umschaltbar statt untereinander** (M8.1). Wer die Hilfe
 * öffnet, hat eine Frage, und die gehört zu einem der vier Bereiche.
 */

import { useEffect, useRef, useState } from "react";

import { Akueliteil, Ansichtenteil, Stoerfallteil, Tastenteil } from "./Hilfeteile.js";
import { useLaden } from "./laden.js";

export { klartext } from "./Hilfeteile.js";

/** Die vier Bereiche des Fensters, in der Reihenfolge der Häufigkeit ihrer Frage. */
const TEILE = [
  { schluessel: "tasten", titel: "Erste Schritte und Tasten" },
  { schluessel: "akueli", titel: "Abkürzungen" },
  { schluessel: "ansichten", titel: "Ansichten" },
  { schluessel: "stoerfaelle", titel: "Störfälle" },
] as const;

type Teil = (typeof TEILE)[number]["schluessel"];

export interface HilfeEigenschaften {
  readonly aufSchliessen: () => void;
}

/**
 * Schließt die Hilfe bei Esc und bei einem Tipp außerhalb des Fensters.
 *
 * Der Hilfeknopf im Kopfband zählt nicht als „außerhalb“: Er schaltet selbst
 * um, und ein Schließen davor ließe ihn die Hilfe gleich wieder öffnen.
 */
function useSchliessen(aufSchliessen: () => void): React.RefObject<HTMLElement | null> {
  const bereich = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const beiTaste = (ereignis: KeyboardEvent): void => {
      if (ereignis.key === "Escape") aufSchliessen();
    };
    const beiTipp = (ereignis: Event): void => {
      const ziel = ereignis.target;
      if (!(ziel instanceof Node)) return;
      if (bereich.current?.contains(ziel) === true) return;
      if (ziel instanceof Element && ziel.closest(".hilfeknopf, [role='dialog']") !== null) return;
      aufSchliessen();
    };
    document.addEventListener("keydown", beiTaste);
    document.addEventListener("pointerdown", beiTipp);
    return () => {
      document.removeEventListener("keydown", beiTaste);
      document.removeEventListener("pointerdown", beiTipp);
    };
  }, [aufSchliessen]);
  return bereich;
}

export function Hilfe({ aufSchliessen }: HilfeEigenschaften): React.JSX.Element {
  const [teil, setzeTeil] = useState<Teil>("tasten");
  const imBrowser = useLaden((zustand) => zustand.umgebung?.plattform === "web");
  const bereich = useSchliessen(aufSchliessen);

  return (
    <section aria-label="Hilfe" className="hilfe" ref={bereich}>
      <div className="hilfekopf">
        <h2>Hilfe</h2>
        <button type="button" onClick={aufSchliessen}>
          Schließen
        </button>
      </div>

      <div className="reiterleiste" role="tablist">
        {TEILE.map((eintrag) => (
          <button
            key={eintrag.schluessel}
            type="button"
            role="tab"
            aria-selected={teil === eintrag.schluessel}
            onClick={() => {
              setzeTeil(eintrag.schluessel);
            }}
          >
            {eintrag.titel}
          </button>
        ))}
      </div>

      <div className="hilfespalten">
        {teil === "tasten" && <Tastenteil />}
        {teil === "akueli" && <Akueliteil />}
        {teil === "ansichten" && <Ansichtenteil />}
        {teil === "stoerfaelle" && <Stoerfallteil imBrowser={imBrowser} />}
      </div>
    </section>
  );
}
