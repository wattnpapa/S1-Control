/**
 * Eine Tabellenzelle einer Einheit setzen — über die Spaltentabelle der Domäne.
 *
 * Das Drehbuch schreibt Status, Schicht, Zeitpunkte und Logistikzahlen auf
 * demselben Weg wie die Inline-Bearbeitung der Einheitentabelle
 * (`inlineEntwurf`). Kennt die Spaltentabelle eine Spalte nicht mehr oder
 * schreibt sie nichts, scheitert das Drehbuch hier laut — und nicht still mit
 * einem Ereignis, das keine Zelle mehr füllt.
 */

import { projektion, type EinheitZustand } from "@s1/domaene";

import { inlineEntwurf } from "../../kontrakt/bedienschritte.js";
import type { Entwurf } from "../../kontrakt/index.js";
import type { Entwurfsbauer } from "./drehbuch.js";

export function zelle(schluessel: string, einheitId: string, vorher: unknown, neu: unknown): Entwurf {
  const spalte = projektion.spalte(schluessel);
  const entwurf = spalte === undefined ? undefined : inlineEntwurf(spalte, einheitId, vorher, neu);
  if (entwurf === undefined) throw new Error(`Demo-Drehbuch: Die Spalte ${schluessel} schreibt kein Ereignis.`);
  return entwurf;
}

/**
 * Wie {@link zelle}, aber der Vorher-Wert kommt beim Abspielen aus dem
 * Zustand. Für alles, was die Übernahme eines Erfassungsbogens schon gesetzt
 * haben kann: Das Drehbuch weiß nicht, was im Bogen steht.
 */
export function zelleNeu(schluessel: string, einheitId: string, gesehen: (einheit: EinheitZustand) => unknown, neu: unknown): Entwurfsbauer {
  return (zustand) => {
    const einheit = zustand.einheiten[einheitId];
    return einheit === undefined ? undefined : zelle(schluessel, einheitId, gesehen(einheit) ?? null, neu);
  };
}

/** Der Status einer Einheit, gesetzt gegen den Status, der gerade gilt. */
export function statusNeu(einheitId: string, neu: string): Entwurfsbauer {
  return zelleNeu("status", einheitId, (einheit) => einheit.status.wert, neu);
}
