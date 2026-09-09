/**
 * Was ein Schreibversuch entgegennimmt und zurückgibt — KONZEPT-SPEICHER.md
 * §2.4, §2.5 und §8.8.
 *
 * Getrennt vom Schreiber, weil hier nur die Form festgehalten ist. Die
 * Unterscheidung der drei Ausgänge ist trotzdem nicht beliebig: §8.8 Punkt 1
 * verlangt, dass ein gescheiterter Bedienschritt **sichtbar abgewiesen** wird
 * und der Wert nicht in den Zustand kommt — „ein Bedienschritt, den die
 * Oberfläche annimmt und der nirgends steht, wäre der schlimmste Fehler dieses
 * Entwurfs".
 */

import type { Uhrmeldung } from "@s1/domaene";

import type { Rahmenblick } from "./zeile.js";

/** Was ein Aufrufer über ein zu schreibendes Ereignis mitgibt (§2.4). */
export interface Ereignisentwurf {
  readonly typ: string;
  readonly nutzlast?: unknown;
  /** Gesehener Vorher-Wert bei setzenden Ereignissen (§2.5, Auflage 6). */
  readonly vorher?: unknown;
  readonly neu?: unknown;
  readonly undoOf?: string;
  readonly korrekturVon?: string;
  readonly grund?: string;
  readonly schemaVersion?: number;
}

/** Eine geschriebene Zeile samt ihrer Stelle in der Datei. */
export interface GeschriebeneZeile {
  readonly segment: number;
  readonly offset: number;
  readonly bytes: Uint8Array;
  readonly rahmen: Rahmenblick;
  readonly kette: string;
}

/** Das Ergebnis eines Schreibversuchs. */
export type Schreibergebnis =
  | { readonly art: "geschrieben"; readonly zeile: GeschriebeneZeile; readonly meldung?: Uhrmeldung }
  /**
   * §8.8 Punkt 1: Der Bedienschritt wird **sichtbar abgewiesen**. Die Eingabe
   * bleibt im Formular stehen, der Wert wird nicht in den Zustand übernommen.
   * Ein Bedienschritt, den die Oberfläche annimmt und der nirgends steht, wäre
   * der schlimmste Fehler dieses Entwurfs.
   */
  | {
      readonly art: "abgewiesen";
      readonly meldung: string;
      readonly code?: string;
      /** §8.8 Punkt 4: dauerhafter Hinweis in der Statuszeile bei `ENOSPC` und `EIO`. */
      readonly dauerhafterHinweis: boolean;
    }
  /** §3.2, Zählerüberlauf: Die Uhr steht, der Zähler ist voll. */
  | { readonly art: "uhrSteht"; readonly meldung: Uhrmeldung };
