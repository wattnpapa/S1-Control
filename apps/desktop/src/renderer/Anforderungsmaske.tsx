/**
 * „Anforderung anlegen" als Maske (Entwurf „Entlastung", 3.7).
 *
 * Bis Runde 6 standen die Felder einer neuen Anforderung dauerhaft über der
 * Liste. Jetzt öffnet sie der Hauptknopf „Anforderung anlegen" (Strg+N). Die
 * Felder selbst und ihr Ablauf sind dieselben (`Anforderungsneu.tsx`): Der
 * Entwurf liegt im Store und übersteht Schließen, Blattwechsel und Reload;
 * nach bestätigtem Schreiben schließt die Maske. Kein `<form>`: Die Felder
 * haben ihr eigenes Enter und ihren eigenen Knopf „Anfordern"; ein Formular
 * darum schickte Enter ein zweites Mal ab.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import type { Einheitenwahl } from "@s1/domaene";

import { Anforderungsneu } from "./Anforderungsneu.js";

export interface AnforderungsmaskeEigenschaften {
  readonly einheitenwahl: readonly Einheitenwahl[];
  readonly aufSchliessen: () => void;
}

export function Anforderungsmaske({ einheitenwahl, aufSchliessen }: AnforderungsmaskeEigenschaften): React.JSX.Element {
  const rahmen = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rahmen.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }, []);
  return createPortal(
    <div className="maskengrund">
      <div
        ref={rahmen}
        role="dialog"
        aria-modal="true"
        aria-label="Anforderung anlegen"
        className="maske anforderungsmaske"
        onKeyDown={(ereignis) => {
          if (ereignis.key !== "Escape") return;
          // Wie in jeder Maske: Esc bleibt hier und hebt draußen keine Auswahl auf.
          ereignis.stopPropagation();
          ereignis.preventDefault();
          aufSchliessen();
        }}
      >
        <h3>Anforderung anlegen</h3>
        <Anforderungsneu einheitenwahl={einheitenwahl} aufAngelegt={aufSchliessen} />
        <div className="maskenknoepfe">
          <button type="button" className="abbrechen" onClick={aufSchliessen} title="Die Eingabe bleibt stehen, bis sie angelegt oder verworfen ist">
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
