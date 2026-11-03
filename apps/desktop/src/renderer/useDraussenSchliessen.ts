/**
 * Schließen bei Esc und bei einem Tipp daneben — für alles, was aufklappt.
 *
 * Gebraucht wird es an drei Stellen: der Zählregel unter der Ist-Stärke, dem
 * Fenstermenü „⋯" und der Bildschirmwahl des Stärke-Monitors. Alle drei
 * hängen am Kopfband und sollen sich gleich verhalten; dreimal von Hand
 * gebaut, verhielte sich nach der zweiten Änderung eines davon anders.
 *
 * Gehört wird am Dokument und nur, solange etwas offen ist: Ein Hörer, der
 * immer hängt, schlösse auch, was gerade gar nicht offen ist, und fräße bei
 * jedem Tipp Zeit.
 */

import { useEffect, useRef } from "react";

export function useDraussenSchliessen<T extends HTMLElement>(
  offen: boolean,
  schliesse: () => void,
): React.RefObject<T | null> {
  const huelle = useRef<T>(null);
  useEffect(() => {
    if (!offen) return undefined;
    const aufTaste = (ereignis: KeyboardEvent): void => {
      if (ereignis.key === "Escape") schliesse();
    };
    const aufZeiger = (ereignis: Event): void => {
      if (!huelle.current?.contains(ereignis.target as Node | null)) schliesse();
    };
    document.addEventListener("keydown", aufTaste);
    document.addEventListener("pointerdown", aufZeiger);
    return () => {
      document.removeEventListener("keydown", aufTaste);
      document.removeEventListener("pointerdown", aufZeiger);
    };
  }, [offen, schliesse]);
  return huelle;
}
