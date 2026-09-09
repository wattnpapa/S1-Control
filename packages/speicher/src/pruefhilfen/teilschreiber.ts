/**
 * Ein Dateisystem, das einen Anhang **teilweise** ausführt und dann scheitert
 * — ausschließlich Prüfhilfe.
 *
 * Das ist der Fall, den KONZEPT-SPEICHER.md §5.4.1 für den Share ausdrücklich
 * benennt („Was dort ankommt, ist ein Präfix dessen, was gesendet wurde") und
 * den §8.1 lokal als Kill mitten im Append führt. `stoerdateisystem.ts` kann
 * ihn nicht abbilden: Dort scheitert ein Aufruf **vor** der Wirkung, hier
 * hinterlässt er eine.
 *
 * Die Simulation M0.4 hat mit genau diesem Bild drei Befunde erzeugt; die
 * Regressionstests dazu stehen in `stoerfestigkeit.test.ts`.
 */

import { DateisystemFehler, type Dateisystem } from "../dateisystem.js";

export interface Teilschreibung {
  /** Nur Pfade, die diese Zeichenkette enthalten. */
  readonly pfadEnthaelt: string;
  /** Wie viele Bytes tatsächlich ankommen. */
  readonly bytes: number;
  /** Fehlercode, mit dem der Aufruf danach scheitert. */
  readonly code: string;
  /** Wie oft; danach läuft der Aufruf wieder durch. */
  malen: number;
}

/** Reicht alles durch, bis eine Teilschreibung greift. */
export function teilschreiber(echt: Dateisystem, teile: Teilschreibung[]): Dateisystem {
  return {
    ...echt,
    dauerhaftigkeit: echt.dauerhaftigkeit,
    async haengeAnUndSynchronisiere(pfad: string, bytes: Uint8Array): Promise<void> {
      for (const teil of teile) {
        if (teil.malen <= 0 || !pfad.includes(teil.pfadEnthaelt)) continue;
        teil.malen -= 1;
        await echt.haengeAnUndSynchronisiere(pfad, bytes.subarray(0, teil.bytes));
        throw new DateisystemFehler(teil.code, pfad);
      }
      await echt.haengeAnUndSynchronisiere(pfad, bytes);
    },
  };
}
