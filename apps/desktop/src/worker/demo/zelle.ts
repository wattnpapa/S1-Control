/**
 * Eine Tabellenzelle einer Einheit setzen — über die Spaltentabelle der Domäne.
 *
 * Das Drehbuch schreibt Status, Schicht, Zeitpunkte und Logistikzahlen auf
 * demselben Weg wie die Inline-Bearbeitung der Einheitentabelle
 * (`inlineEntwurf`). Kennt die Spaltentabelle eine Spalte nicht mehr oder
 * schreibt sie nichts, scheitert das Drehbuch hier laut — und nicht still mit
 * einem Ereignis, das keine Zelle mehr füllt.
 */

import { projektion } from "@s1/domaene";

import { inlineEntwurf } from "../../kontrakt/bedienschritte.js";
import type { Entwurf } from "../../kontrakt/index.js";

export function zelle(schluessel: string, einheitId: string, vorher: unknown, neu: unknown): Entwurf {
  const spalte = projektion.spalte(schluessel);
  const entwurf = spalte === undefined ? undefined : inlineEntwurf(spalte, einheitId, vorher, neu);
  if (entwurf === undefined) throw new Error(`Demo-Drehbuch: Die Spalte ${schluessel} schreibt kein Ereignis.`);
  return entwurf;
}
