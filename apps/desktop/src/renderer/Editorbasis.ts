/**
 * Der Wert, den ein Editor beim **Öffnen** sah.
 *
 * Schreibt eine Zelle erst nach Minuten (Unterbrechung, Funk), ist der Wert
 * in der Tabelle längst der eines Kollegen. Würde die Zelle diesen als
 * `vorher` schicken, wäre jedes Überschreiben „abgestimmt". Die Basis wird
 * deshalb beim Öffnen festgehalten und mit dem Schreibschritt als erwarteter
 * Vorwert geschickt (`vorwertPruefen`); der Worker weist dann ab, wenn ein
 * anderer Arbeitsplatz inzwischen etwas anderes gesetzt hat.
 */

import { useCallback, useRef } from "react";

import { CODE_VORWERT, type Bedienergebnis, type Entwurf } from "../kontrakt/index.js";

export interface Editorbasis {
  /** Beim Öffnen des Editors: den gesehenen Wert merken. */
  readonly merke: (schluessel: string, wert: unknown) => void;
  /** Der erwartete Vorwert; ohne gemerkte Basis der aktuelle Wert. */
  readonly vorwert: (schluessel: string, aktuell: unknown) => unknown;
  /** Nach Abbruch, Erfolg oder bewusster Übernahme: Basis vergessen. */
  readonly vergiss: (schluessel: string) => void;
}

export function useEditorbasis(): Editorbasis {
  const basen = useRef(new Map<string, unknown>());
  const merke = useCallback((schluessel: string, wert: unknown): void => {
    basen.current.set(schluessel, wert);
  }, []);
  const vorwert = useCallback(
    (schluessel: string, aktuell: unknown): unknown =>
      basen.current.has(schluessel) ? basen.current.get(schluessel) : aktuell,
    [],
  );
  const vergiss = useCallback((schluessel: string): void => {
    basen.current.delete(schluessel);
  }, []);
  return { merke, vorwert, vergiss };
}

/** Der Entwurf mit dem Verlangen, den Vorwert zu prüfen. */
export function mitVorwertpruefung(entwurf: Entwurf): Entwurf {
  return { ...entwurf, vorwertPruefen: true };
}

/** Hat der Worker abgewiesen, weil ein Kollege das Feld inzwischen geändert hat? */
export function istVorwertKonflikt(ergebnis: Bedienergebnis | undefined): boolean {
  return ergebnis?.art === "abgewiesen" && ergebnis.code === CODE_VORWERT;
}

/** Der Satz an der Zelle: Meldung des Workers plus die Wahl, die der Bediener hat. */
export const VORWERT_WAHL = "Enter übernimmt Ihren Wert trotzdem, Esc verwirft.";
