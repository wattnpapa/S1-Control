/**
 * Das Auswahlblatt am unteren Bildrand (Handy, Tablet hochkant, Touch) —
 * aus `Einheitenzelle.tsx` herausgelöst, damit jene unter 400 Zeilen bleibt.
 *
 * Ein Tipp daneben verwirft nicht stumm, sondern meldet „Nicht übernommen"
 * und lässt das Blatt stehen; Escape am Gerät mit Tastatur verwirft.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** Text, wenn neben das Blatt getippt wurde: Die Wahl ist nicht übernommen. */
export const TEXT_NICHT_UEBERNOMMEN = "Nicht übernommen – bitte „Übernehmen“ oder „Abbrechen“ tippen.";

export interface BlattEigenschaften {
  readonly titel: string;
  readonly hinweis: boolean;
  readonly aufDaneben: () => void;
  readonly aufAbbrechen: () => void;
  readonly children: React.ReactNode;
}

/** Das Blatt am unteren Bildrand; der Grund dahinter fängt Tipps daneben ab. */
export function Auswahlblatt({ titel, hinweis, aufDaneben, aufAbbrechen, children }: BlattEigenschaften): React.JSX.Element {
  const blatt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Das Blatt steht über der Tabelle; Escape am Gerät mit Tastatur verwirft.
    const aufTaste = (ereignis: KeyboardEvent): void => {
      if (ereignis.key === "Escape") aufAbbrechen();
    };
    document.addEventListener("keydown", aufTaste);
    return () => {
      document.removeEventListener("keydown", aufTaste);
    };
  }, [aufAbbrechen]);
  return createPortal(
    <div className="auswahlgrund" 
      onClick={(ereignis) => {
        ereignis.stopPropagation();
        aufDaneben();
      }}
      data-testid="auswahlgrund"
    >
      <div
        ref={blatt}
        className="auswahlblatt"
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        onClick={(ereignis) => {
          ereignis.stopPropagation();
        }}
      >
        <strong className="auswahltitel">{titel}</strong>
        {children}
        {hinweis && (
          <p className="hinweistext auswahlhinweis" role="alert">
            {TEXT_NICHT_UEBERNOMMEN}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
