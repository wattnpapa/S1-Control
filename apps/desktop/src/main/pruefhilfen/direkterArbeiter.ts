/**
 * Ein Arbeiter, der den Aktendienst im selben Thread faehrt — fuer die Tests.
 *
 * Der Weg, den ein Ruf nimmt, ist damit vollstaendig pruefbar: Ruf →
 * Vermittlung → Arbeiterhof → Aktendienst → Speicherschicht → Dateisystem, und
 * die Mitteilungen denselben Weg zurueck. Nur die Thread-Grenze fehlt, und die
 * ist das einzige Stueck, das nichts entscheidet.
 *
 * Er liegt in einer eigenen Datei, weil zwei Nachweise ihn brauchen: der zur
 * Vermittlung (`../vermittlung.test.ts`) und der zur Web-Schale
 * (`../../web/schale.test.ts`, ADR-005).
 */

import { Einsatzablage, knotenDateisystem } from "@s1/speicher";

import type { Arbeiter } from "../arbeiterhof.js";
import { Aktendienst } from "../../worker/aktendienst.js";
import type { Auftrag, Startdaten, WorkerBotschaft } from "../../worker/akte-worker.js";
import { bearbeiteAuftrag } from "../../worker/auftraege.js";

/**
 * `queueMicrotask` fuer die Antwort ist kein Zierrat: Ein echter Worker
 * antwortet nie im selben Zug, in dem der Auftrag gestellt wurde. Antwortete
 * die Attrappe synchron, liefe der Test durch eine Reihenfolge, die es im
 * Betrieb nicht gibt.
 */
export function baueDirektenArbeiter(
  start: Startdaten,
  dienste: Map<string, Aktendienst>,
): Arbeiter {
  let botschaft: ((b: WorkerBotschaft) => void) | undefined;
  const dienst = new Aktendienst({
    akteId: start.akteId,
    dateisystem: knotenDateisystem(),
    zeit: () => Date.now(),
    ablage: new Einsatzablage(start.shareEinsatzOrdner, start.lokalerEinsatzOrdner),
    clientId: start.clientId,
    einsatzId: start.einsatzId,
    akteur: { benutzer: start.benutzer, host: "pruefrechner", clientId: start.clientId },
    anzeigename: start.anzeigename,
    rechnername: "pruefrechner",
    programmversion: start.programmversion,
    neueKennung: () => "9".repeat(32),
    sende: (mitteilung) => botschaft?.({ art: "mitteilung", mitteilung }),
    takte: { spiegelungMs: 0, taktAMs: 0, taktBMs: 0, praesenzMs: 0 },
  });
  dienste.set(start.akteId, dienst);

  return {
    sende(auftrag: Auftrag) {
      void (async () => {
        try {
          const wert = await bearbeite(dienst, auftrag);
          queueMicrotask(() => botschaft?.({ art: "antwort", nummer: auftrag.nummer, wert }));
        } catch (fehler) {
          queueMicrotask(() =>
            botschaft?.({
              art: "fehler",
              nummer: auftrag.nummer,
              meldung: (fehler as Error).message,
            }),
          );
        }
      })();
    },
    aufBotschaft(hoerer) {
      botschaft = hoerer;
    },
    aufEnde() {
      // Ein direkter Arbeiter stürzt nicht ab; den Fall prüft arbeiterhof.test.ts.
    },
    async beende() {
      dienste.delete(start.akteId);
    },
  };
}

/**
 * Die Auftragsbearbeitung dieser Werkstatt — **derselbe** Verteiler wie im
 * Betrieb.
 *
 * Hier stand bis M5.3 eine zweite, handgeschriebene Fassung mit sechs
 * Auftragsarten. Sie war der Grund, warum `kostenAnfordern` durch die
 * Vermittlung fallen konnte, ohne dass ein Test es bemerkte: Der Aktendienst
 * konnte die Ansicht, die Naht dorthin war nicht verdrahtet, und dieser Test
 * kannte den Auftrag gar nicht. Jetzt ruft er `bearbeiteAuftrag`, und ein
 * neuer Ansichtsruf ist hier ohne Zutun abgedeckt.
 */
async function bearbeite(dienst: Aktendienst, auftrag: Auftrag): Promise<unknown> {
  if (auftrag.art === "schliesse") {
    dienst.schliesse();
    return null;
  }
  return bearbeiteAuftrag(dienst, auftrag);
}
