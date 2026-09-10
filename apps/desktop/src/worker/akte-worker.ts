/**
 * Der Worker-Einstieg — ein `worker_thread` je offener Akte (M2.1).
 *
 * Er ist mit Absicht duenn. Alles Fachliche steht in {@link Aktendienst}; hier
 * steht nur, was ohne `worker_threads` nicht zu haben ist: das Auspacken der
 * Startdaten, die Botschaftsschleife und der Zeitgeber.
 *
 * **Warum ueberhaupt ein eigener Thread.** 02-ZIELBILD.md haelt den
 * Main-Prozess frei von Fachzustand, und M2.1 verlangt „kein synchroner
 * Datei- oder Netzaufruf im Main". Der Fold ist rechenintensiv (§2.6 nennt
 * 50.000 Ereignisse je Einsatz), und ein Poll-Zyklus wartet auf ein
 * SMB-Laufwerk. Beides im Main hiesse: Das Fenster steht still, waehrend das
 * NAS nachdenkt.
 */

import { parentPort, workerData } from "node:worker_threads";
import os from "node:os";

import { Einsatzablage, knotenDateisystem, systemZeit } from "@s1/speicher";

import { Aktendienst, type Takte } from "./aktendienst.js";
import type { Entwurf, Mitteilung } from "../kontrakt/index.js";

/** Was der Main-Prozess dem Worker beim Start mitgibt — alles serialisierbar. */
export interface Startdaten {
  readonly akteId: string;
  readonly shareEinsatzOrdner: string;
  readonly lokalerEinsatzOrdner: string;
  readonly clientId: string;
  readonly einsatzId: string;
  readonly benutzer: string;
  readonly anzeigename: string;
  readonly programmversion: string;
  readonly takte?: Partial<Takte>;
}

/** Was der Main dem Worker sagt. `nummer` ordnet Antwort und Auftrag einander zu. */
export type Auftrag =
  | { readonly art: "oeffne"; readonly nummer: number }
  | { readonly art: "bediene"; readonly nummer: number; readonly entwurf: Entwurf }
  | { readonly art: "zurueck"; readonly nummer: number; readonly grund?: string }
  | { readonly art: "undoStapel"; readonly nummer: number }
  | { readonly art: "standAnfordern"; readonly nummer: number }
  | { readonly art: "schliesse"; readonly nummer: number };

/** Was der Worker zurueckschickt. */
export type WorkerBotschaft =
  | { readonly art: "antwort"; readonly nummer: number; readonly wert: unknown }
  | { readonly art: "fehler"; readonly nummer: number; readonly meldung: string }
  | { readonly art: "mitteilung"; readonly mitteilung: Mitteilung };

/**
 * Erzeugt eine neue Client-Kennung fuer §4.5, Reaktion Schritt 1.
 *
 * `crypto.randomUUID` ohne Bindestriche: §4.1 verlangt eine Kennung, deren
 * ersten Stellen als Dateinamenspraefix taugen; Bindestriche waeren dort
 * zulaessig, aber die Praefixlaenge rechnet in Zeichen und nicht in Gruppen.
 */
function neueKennung(): string {
  return globalThis.crypto.randomUUID().replaceAll("-", "");
}

if (parentPort !== null) {
  const start = workerData as Startdaten;
  const port = parentPort;

  const dienst = new Aktendienst({
    akteId: start.akteId,
    dateisystem: knotenDateisystem(),
    zeit: systemZeit,
    ablage: new Einsatzablage(start.shareEinsatzOrdner, start.lokalerEinsatzOrdner),
    clientId: start.clientId,
    einsatzId: start.einsatzId,
    akteur: { benutzer: start.benutzer, host: os.hostname(), clientId: start.clientId },
    anzeigename: start.anzeigename,
    rechnername: os.hostname(),
    programmversion: start.programmversion,
    neueKennung,
    sende: (mitteilung) => {
      port.postMessage({ art: "mitteilung", mitteilung } satisfies WorkerBotschaft);
    },
    ...(start.takte === undefined ? {} : { takte: start.takte }),
  });

  /**
   * Ein einziger Zeitgeber fuer alle vier Takte.
   *
   * Vier `setInterval` waeren vier Weckvorgaenge je Sekunde; welcher Schritt
   * faellig ist, entscheidet ohnehin {@link Aktendienst.takt} an der Uhr. Der
   * Aufruf ist ausserdem **serialisiert** — laeuft ein Durchlauf noch, wird
   * der naechste uebersprungen. §8.4 verlangt genau das nicht vom Aufrufer,
   * aber ein Rueckstau von Durchlaeufen auf einem langsamen Share waere ein
   * wachsender Speicherverbrauch ohne Nutzen.
   */
  let laeuft = false;
  const zeitgeber = setInterval(() => {
    if (laeuft) return;
    laeuft = true;
    void dienst
      .takt()
      .catch((fehler: unknown) => {
        port.postMessage({
          art: "mitteilung",
          mitteilung: {
            art: "hinweis",
            akteId: start.akteId,
            stufe: "fehler",
            text: `Takt: ${(fehler as Error).message}`,
          },
        } satisfies WorkerBotschaft);
      })
      .finally(() => {
        laeuft = false;
      });
  }, 500);
  // Der Zeitgeber darf den Thread nicht am Leben halten, wenn sonst nichts
  // mehr laeuft — sonst haengt ein geschlossener Einsatz als Zombie.
  zeitgeber.unref();

  port.on("message", (auftrag: Auftrag) => {
    void (async () => {
      try {
        const wert = await bearbeite(auftrag);
        port.postMessage({ art: "antwort", nummer: auftrag.nummer, wert } satisfies WorkerBotschaft);
      } catch (fehler) {
        port.postMessage({
          art: "fehler",
          nummer: auftrag.nummer,
          meldung: (fehler as Error).message,
        } satisfies WorkerBotschaft);
      }
    })();
  });

  async function bearbeite(auftrag: Auftrag): Promise<unknown> {
    switch (auftrag.art) {
      case "oeffne":
        return { befund: (await dienst.oeffne()).befund.art };
      case "bediene":
        return dienst.bediene(auftrag.entwurf);
      case "zurueck":
        return dienst.zurueck(auftrag.grund);
      case "undoStapel":
        return dienst.undoStapel();
      case "standAnfordern":
        dienst.sendeVollenStand();
        return null;
      case "schliesse":
        dienst.schliesse();
        clearInterval(zeitgeber);
        return null;
    }
  }
}
