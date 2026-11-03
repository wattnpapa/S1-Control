/**
 * „✓ … · gespeichert" in der Statuszeile (Entwurf „Entlastung", 3.3, 6e).
 *
 * Steht zehn Sekunden nach dem eigenen Schreiben links neben „Rückgängig"
 * und verschwindet dann. Die Uhr ist eine eigene: Die Uhr des Fensters tickt
 * jede Sekunde für „vor 8 s", aber diese Marke braucht genau einen Takt, den
 * zum Verschwinden.
 *
 * Das Element bleibt stehen, auch leer: Es ist ein Live-Bereich, und ein
 * Vorlesegerät sagt nur an, was in einen **schon vorhandenen** Bereich
 * geschrieben wird.
 */

import { useEffect, useState } from "react";

import { BESTAETIGUNG_MS } from "./bestaetigungsfolge.js";
import { useLaden } from "./laden.js";

export function Schreibbestaetigung(): React.JSX.Element {
  const bestaetigung = useLaden((zustand) => zustand.letzteBestaetigung);
  const [jetzt, setzeJetzt] = useState(() => Date.now());

  useEffect(() => {
    if (bestaetigung === undefined) return undefined;
    const rest = BESTAETIGUNG_MS - (Date.now() - bestaetigung.zeit);
    if (rest <= 0) return undefined;
    const zeitgeber = setTimeout(() => {
      setzeJetzt(Date.now());
    }, rest);
    return () => {
      clearTimeout(zeitgeber);
    };
  }, [bestaetigung]);

  // `jetzt` ist der Zeitpunkt des letzten Takts. Eine neue Bestätigung ist
  // jünger als er und steht damit sofort; nach dem Takt ist sie abgelaufen.
  const sichtbar = bestaetigung !== undefined && jetzt - bestaetigung.zeit < BESTAETIGUNG_MS;
  return (
    <span className="bestaetigung" aria-live="polite">
      {sichtbar ? `✓ ${bestaetigung.text}` : ""}
    </span>
  );
}
