/**
 * Der Schreibversuch eines Inline-Feldes (Besetzung, Schichtplan, Kosten,
 * Eingangskorb) nach dem Muster des Anlegeversuchs (`Anlegeversuch.tsx`).
 *
 * Vorher löschten diese Felder den Entwurf **vor** dem Schreiben und ließen
 * den Ruf offen laufen: Bei Unterbrechung war die Eingabe still verloren.
 * Hier bleibt die Eingabe stehen, bis der Dienst `geschrieben` meldet; der
 * Hinweis steht am Feld, bei Unterbrechung ist das Schreiben gesperrt, und ein
 * zweiter Auslöser (Enter, dann Blur) schreibt nicht doppelt.
 */

import { useCallback, useRef, useState } from "react";

import type { Entwurf } from "../kontrakt/index.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";

export interface Feldversuch {
  /** Keine Verbindung: das Feld behält seinen Text, geschrieben wird nicht. */
  readonly gesperrt: boolean;
  readonly laeuft: boolean;
  /** Sperrgrund und Hinweis zum Ausgang; unter das Feld zu setzen. */
  readonly anzeige: React.JSX.Element | null;
  /** `true` heißt: vom Dienst als geschrieben bestätigt; nur dann darf der Entwurf weichen. */
  readonly schreibe: (entwurf: Entwurf) => Promise<boolean>;
  /** Vergisst den Hinweis (Escape, neue Eingabe). */
  readonly verwerfe: () => void;
}

export function useFeldversuch(): Feldversuch {
  const versuch = useAnlegeversuch();
  const laeuftSofort = useRef(false);
  const [laeuft, setzeLaeuft] = useState(false);
  const { schreibe: schreibeVersuch, verwerfe } = versuch;
  const gesperrt = versuch.gesperrt;

  const schreibe = useCallback(
    async (entwurf: Entwurf): Promise<boolean> => {
      if (laeuftSofort.current || gesperrt) return false;
      laeuftSofort.current = true;
      setzeLaeuft(true);
      try {
        const ergebnis = await schreibeVersuch(entwurf);
        return ergebnis?.art === "geschrieben";
      } finally {
        laeuftSofort.current = false;
        setzeLaeuft(false);
      }
    },
    [gesperrt, schreibeVersuch],
  );

  return { gesperrt, laeuft, anzeige: versuch.anzeige, schreibe, verwerfe };
}
