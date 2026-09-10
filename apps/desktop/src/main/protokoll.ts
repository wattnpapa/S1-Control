/**
 * Das Protokoll in eine Datei (M2.2, „Logging in Datei").
 *
 * Es ist die Vorstufe der Diagnoseansicht aus M7 und hat eine einzige Aufgabe:
 * Nach einem Einsatz soll nachlesbar sein, was die Schale getan hat, ohne dass
 * jemand die Entwicklerwerkzeuge geoeffnet haben muesste.
 *
 * Drei Festlegungen, jede mit ihrem Grund:
 *
 *  * **Angehaengt, nie ueberschrieben.** Ein Protokoll, das beim Start leer
 *    beginnt, verliert genau den Lauf, nach dem gefragt wird — den davor.
 *  * **Kein `fsync`.** Das Protokoll ist keine Wahrheit; die liegt im
 *    Ereignisprotokoll auf dem Share (§1.3). Ein `fsync` je Zeile kostete
 *    hier nur Zeit.
 *  * **Ein Schreibvorgang zur Zeit.** Die Zeilen werden gereiht, sonst
 *    ueberschnitten sich zwei `appendFile` auf derselben Datei — genau das,
 *    was §8.4 fuer den Datenpfad ausschliesst und hier nicht anders ist.
 *
 * Der Schreibvorgang scheitert still: Ein Protokoll, das die Anwendung
 * anhaelt, weil die Platte voll ist, waere die Umkehrung seines Zwecks.
 *
 * **Seit M7.3 haelt es zusaetzlich die letzten Meldungen im Speicher.** Die
 * Diagnoseansicht braucht sie, und der Weg ueber die Datei waere der falsche:
 * Sie liegt im Benutzerprofil, ist bis zu vier Megabyte gross und kann genau
 * dann unlesbar sein, wenn es interessant wird — bei vollem Datentraeger
 * naemlich, wo der Schreibvorgang oben still scheitert. Der Ringpuffer haelt,
 * was diese Sitzung gemeldet hat, und ist als einziger Teil des Protokolls
 * auch dann noch da.
 */

import * as fsp from "node:fs/promises";
import path from "node:path";

export type Stufe = "info" | "warnung" | "fehler";

/** Ab dieser Groesse wird auf `.1` weggerollt (eine Vorgaengerfassung, mehr nicht). */
export const PROTOKOLL_MAX_BYTES = 4 * 1024 * 1024;

/**
 * So viele Meldungen haelt der Ringpuffer.
 *
 * Fuenfzig, weil die Ansicht sie auf einer Seite zeigen soll und weil eine
 * laengere Liste die Frage nicht besser beantwortet: Wer wissen will, was vor
 * einer Stunde geschah, oeffnet die Datei — ihr Ort steht daneben.
 */
export const PROTOKOLL_RINGPUFFER = 50;

export interface Protokolleintrag {
  readonly wanduhr: string;
  readonly stufe: Stufe;
  readonly text: string;
}

export class Protokoll {
  readonly #datei: string;
  readonly #maxBytes: number;
  #reihe: Promise<void> = Promise.resolve();
  #geschrieben = 0;
  #ring: Protokolleintrag[] = [];

  constructor(datei: string, maxBytes: number = PROTOKOLL_MAX_BYTES) {
    this.#datei = datei;
    this.#maxBytes = maxBytes;
  }

  get datei(): string {
    return this.#datei;
  }

  /**
   * Die letzten Meldungen, juengste zuerst.
   *
   * Umgedreht, weil die Ansicht sie so zeigt und die Umkehrung sonst an drei
   * Stellen stuende. Eine Kopie, damit niemand von aussen in den Puffer
   * schreibt.
   */
  get letzteMeldungen(): readonly Protokolleintrag[] {
    return [...this.#ring].reverse();
  }

  schreibe(stufe: Stufe, text: string, wanduhr: string = new Date().toISOString()): void {
    const gesaeubert = text.replaceAll("\n", " ");
    this.#ring.push({ wanduhr, stufe, text: gesaeubert });
    if (this.#ring.length > PROTOKOLL_RINGPUFFER) this.#ring = this.#ring.slice(-PROTOKOLL_RINGPUFFER);
    const zeile = `${wanduhr}\t${stufe.toUpperCase()}\t${gesaeubert}\n`;
    this.#reihe = this.#reihe.then(async () => {
      try {
        await fsp.mkdir(path.dirname(this.#datei), { recursive: true });
        if (this.#geschrieben === 0) {
          this.#geschrieben = await this.#groesse();
        }
        if (this.#geschrieben + zeile.length > this.#maxBytes) {
          await fsp.rename(this.#datei, `${this.#datei}.1`).catch(() => undefined);
          this.#geschrieben = 0;
        }
        await fsp.appendFile(this.#datei, zeile, "utf8");
        this.#geschrieben += zeile.length;
      } catch {
        // Absichtlich still: siehe Kopf.
      }
    });
  }

  /** Wartet, bis alle bisher gemeldeten Zeilen geschrieben sind — fuer Tests und das Beenden. */
  async ruhe(): Promise<void> {
    await this.#reihe;
  }

  async #groesse(): Promise<number> {
    try {
      return (await fsp.stat(this.#datei)).size;
    } catch {
      return 0;
    }
  }
}
