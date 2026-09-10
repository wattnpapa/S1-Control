/**
 * Die echte {@link ArbeiterFabrik}: ein `worker_thread` je Akte.
 *
 * Sie steht getrennt vom {@link Arbeiterhof}, weil sie das einzige Stueck ist,
 * das `node:worker_threads` braucht. Der Hof selbst laesst sich damit gegen
 * eine Attrappe pruefen.
 */

import { Worker } from "node:worker_threads";

import type { Arbeiter, ArbeiterFabrik } from "./arbeiterhof.js";
import type { Auftrag, Startdaten, WorkerBotschaft } from "../worker/akte-worker.js";

/**
 * @param workerDatei absoluter Pfad des gebauten Worker-Buendels
 *   (`out/akte-worker.mjs`). Er wird uebergeben und nicht hier berechnet: Im
 *   Bau liegt die Datei neben `main.mjs`, im Test nirgends.
 */
export function knotenArbeiterFabrik(workerDatei: string): ArbeiterFabrik {
  return (start: Startdaten): Arbeiter => {
    const worker = new Worker(workerDatei, { workerData: start });
    return {
      sende(auftrag: Auftrag) {
        worker.postMessage(auftrag);
      },
      aufBotschaft(hoerer) {
        worker.on("message", (botschaft: WorkerBotschaft) => {
          hoerer(botschaft);
        });
      },
      aufEnde(hoerer) {
        // Beide Wege fuehren hierher: ein geworfener Fehler im Thread und ein
        // Beenden mit einem Code ungleich 0. Der Hof macht daraus eine
        // geschlossene Akte — ein Worker, der still verschwindet, liesse die
        // Oberflaeche mit einem Stand stehen, der nicht mehr fortgeschrieben
        // wird.
        worker.on("error", (fehler: Error) => {
          hoerer(`Der Arbeitsprozess ist abgebrochen: ${fehler.message}`);
        });
        worker.on("exit", (code: number) => {
          if (code !== 0) hoerer(`Der Arbeitsprozess endete mit Code ${String(code)}.`);
        });
      },
      async beende() {
        await worker.terminate();
      },
    };
  };
}
