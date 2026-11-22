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
import { deflateRawSync, inflateRawSync } from "node:zlib";

import { Einsatzablage, knotenDateisystem, systemZeit } from "@s1/speicher";

import { Aktendienst, type Seitenausgabe, type Takte } from "./aktendienst.js";
import { bearbeiteAuftrag } from "./auftraege.js";
import { uhrFuer } from "./demo/stelluhr.js";
import { klartextFehler } from "./klartextfehler.js";
import type { Automatikdruckeinstellung } from "./automatikdruck.js";
import type { Entwurf, Mitteilung, Ruf } from "../kontrakt/index.js";

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
  /**
   * Additiv (Demo-Einsatz): Der Arbeiter spielt das Demo-Drehbuch ein. Seine
   * Uhr ist dann gestellt und beginnt hier (Unix-Millisekunden), statt der
   * Uhr des Rechners zu folgen; einen Takt hat er nicht. Der Main schließt
   * ihn nach dem Einspielen und öffnet den Einsatz mit einem gewöhnlichen.
   */
  readonly demoBeginnMs?: number;
}

/** Was der Main dem Worker sagt. `nummer` ordnet Antwort und Auftrag einander zu. */
export type Auftrag =
  | { readonly art: "oeffne"; readonly nummer: number }
  | { readonly art: "bediene"; readonly nummer: number; readonly entwurf: Entwurf }
  | { readonly art: "zurueck"; readonly nummer: number; readonly grund?: string }
  | { readonly art: "undoStapel"; readonly nummer: number }
  | { readonly art: "standAnfordern"; readonly nummer: number }
  | { readonly art: "sperre"; readonly nummer: number; readonly entitaetId: string; readonly frei: boolean }
  // Die drei Ansichtsrufe reisen als **der Ruf selbst** durch (M3.7). Ihre
  // Felder hier ein zweites Mal aufzuzaehlen hiesse, jeden neuen Filter an
  // zwei Stellen nachzutragen — und der Kontrakt hat sie bereits geprueft,
  // bevor der Main sie weiterreicht.
  | { readonly art: "baumAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "baumAnfordern" }> }
  | { readonly art: "kostenAnfordern"; readonly nummer: number }
  | { readonly art: "versorgungAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "versorgungAnfordern" }> }
  | { readonly art: "funkplanAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "funkplanAnfordern" }> }
  | { readonly art: "staerketafelAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "staerketafelAnfordern" }> }
  | { readonly art: "stabsuebersichtAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "stabsuebersichtAnfordern" }> }
  | { readonly art: "anforderungenAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "anforderungenAnfordern" }> }
  | { readonly art: "fuestAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "fuestAnfordern" }> }
  | { readonly art: "eingangskorbAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "eingangskorbAnfordern" }> }
  | { readonly art: "fassungsvergleichAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "fassungsvergleichAnfordern" }> }
  | { readonly art: "buendelEinlesen"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "buendelEinlesen" }> }
  | { readonly art: "buendelSchreiben"; readonly nummer: number }
  | { readonly art: "erfassungsboegenSchreiben"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "erfassungsboegenSchreiben" }> }
  | { readonly art: "vokabelnKorrigieren"; readonly nummer: number }
  | { readonly art: "tabelleAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "tabelleAnfordern" }> }
  | { readonly art: "untertabelleAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "untertabelleAnfordern" }> }
  // Additiv (LdF P2-5): `zeitraum` schneidet die Nachweisung auf eine Schicht.
  | { readonly art: "ausgabeHtml"; readonly nummer: number; readonly ausgabe: Seitenausgabe; readonly organisation?: string; readonly zeitraum?: { readonly von?: string; readonly bis?: string } }
  | { readonly art: "auswertungXlsx"; readonly nummer: number }
  | { readonly art: "oldenburgXlsx"; readonly nummer: number }
  | { readonly art: "logFreiXlsx"; readonly nummer: number }
  | { readonly art: "htmlMonitorSchalten"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "htmlMonitorSchalten" }> }
  | { readonly art: "ausgabeSchreiben"; readonly nummer: number; readonly dateiname: string; readonly bytes: Uint8Array }
  | { readonly art: "eebScan"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "eebScan" }> }
  | { readonly art: "eebDatei"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "eebDatei" }> }
  | { readonly art: "eebUeberspringen"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "eebUeberspringen" }> }
  | { readonly art: "eebZuruecksetzen"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "eebZuruecksetzen" }> }
  | { readonly art: "eebUebernehmen"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "eebUebernehmen" }> }
  | { readonly art: "eebAlleUebernehmen"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "eebAlleUebernehmen" }> }
  | { readonly art: "eebAbbrechen"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "eebAbbrechen" }> }
  | { readonly art: "tagebuchAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "tagebuchAnfordern" }> }
  // Nachrichten N1 (KONZEPT-NACHRICHTEN.md §9): das Blatt und Stelle/Handzeichen der Sitzung.
  | { readonly art: "nachrichtenAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "nachrichtenAnfordern" }> }
  // Additiv (ETB P0-1): eine einzelne Nachricht für „Nachricht öffnen" an der Tagebuchzeile.
  | { readonly art: "nachrichtAnfordern"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "nachrichtAnfordern" }> }
  | { readonly art: "stellenSetzen"; readonly nummer: number; readonly stellen?: readonly string[]; readonly handzeichen?: string }
  // Schnitt N3 (§7, Entscheidung 7): Vordruck je Nachricht und Ziel des Automatikdrucks.
  | { readonly art: "nachrichtVordruckErzeugen"; readonly nummer: number; readonly ruf: Extract<Ruf, { art: "nachrichtVordruckErzeugen" }> }
  | { readonly art: "automatikdruckSetzen"; readonly nummer: number; readonly einstellung?: Automatikdruckeinstellung }
  | { readonly art: "einsatzArchivieren"; readonly nummer: number; readonly zeitpunkt: string }
  | { readonly art: "akteErzeugen"; readonly nummer: number }
  // Additiv (Sichter P1-4, ETB P3-3): die Stelle abgeben, die Präsenz sofort ohne Stellen.
  | { readonly art: "stelleAbgeben"; readonly nummer: number }
  // Additiv (Demo-Einsatz): spielt das Drehbuch ein — nur in einem Arbeiter mit `demoBeginnMs`.
  | { readonly art: "demoEinspielen"; readonly nummer: number }
  | { readonly art: "schliesse"; readonly nummer: number };

/**
 * Ein Auftrag ohne seine laufende Nummer — die vergibt der Arbeiterhof.
 *
 * `Omit<Auftrag, "nummer">` allein taugt hier nicht: Auf eine Vereinigung
 * angewandt behaelt `Omit` nur die Felder, die **alle** Zweige teilen, und
 * `entwurf` faellt weg. Der Umweg ueber einen Typparameter verteilt sich
 * dagegen ueber die Zweige — eine bedingte Form verteilt nur, wenn links vom
 * `extends` ein blosser Typparameter steht.
 */
type OhneNummer<T> = T extends unknown ? Omit<T, "nummer"> : never;
export type Auftragsentwurf = OhneNummer<Auftrag>;

/** Was der Worker zurueckschickt. */
export type WorkerBotschaft =
  | { readonly art: "antwort"; readonly nummer: number; readonly wert: unknown }
  | { readonly art: "fehler"; readonly nummer: number; readonly meldung: string }
  | { readonly art: "mitteilung"; readonly mitteilung: Mitteilung }
  // Additiv (N3, Entscheidung 7): ein Vordruck für den Drucker. Er geht an
  // den Main und nicht an die Fenster — drucken kann nur Electron.
  | { readonly art: "druckauftrag"; readonly akteId: string; readonly bytes: Uint8Array; readonly drucker: string; readonly dateiname: string };

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
  // Der Demo-Arbeiter läuft mit gestellter Uhr (`demo/stelluhr.ts`); jeder andere mit der des Rechners.
  const uhr = uhrFuer(start.demoBeginnMs, systemZeit);

  const dienst = new Aktendienst({
    akteId: start.akteId,
    dateisystem: knotenDateisystem(),
    zeit: uhr.zeit,
    ablage: new Einsatzablage(start.shareEinsatzOrdner, start.lokalerEinsatzOrdner),
    clientId: start.clientId,
    einsatzId: start.einsatzId,
    akteur: { benutzer: start.benutzer, host: os.hostname(), clientId: start.clientId },
    anzeigename: start.anzeigename,
    rechnername: os.hostname(),
    programmversion: start.programmversion,
    neueKennung,
    // §M3.4: Der Entpacker des Handscanner-Wegs. Er steht hier und nicht in
    // Ring 2, weil `node:zlib` ein Node-Kernmodul ist; der Worker ist ein
    // eigener Thread, und ein synchroner Aufruf blockiert dort niemanden
    // ausser sich selbst (dieselbe Begruendung wie beim Dateisystem).
    kompressor: {
      deflateRaw: (daten) => new Uint8Array(deflateRawSync(daten)),
      inflateRaw: (daten) => new Uint8Array(inflateRawSync(daten)),
    },
    sende: (mitteilung) => {
      port.postMessage({ art: "mitteilung", mitteilung } satisfies WorkerBotschaft);
    },
    sendeDruck: (auftrag) => {
      port.postMessage({ art: "druckauftrag", akteId: start.akteId, ...auftrag } satisfies WorkerBotschaft);
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
    // Der Demo-Arbeiter taktet nicht: Seine Uhr steht zwischen den Schritten, und
    // eine Präsenz mit der Zeit von vor zwölf Stunden hülfe niemandem.
    if (laeuft || uhr.stelluhr !== undefined) return;
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
            text: klartextFehler(fehler, "Takt"),
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
          meldung: klartextFehler(fehler),
        } satisfies WorkerBotschaft);
      }
    })();
  });

  /**
   * Die Auftragsschleife.
   *
   * Der Verteiler steht in `auftraege.ts` und nicht hier: Die Werkstatt der
   * Vermittlungstests braucht denselben, und zwei Fassungen derselben Tabelle
   * bedeuten, dass die zweite hinterherhinkt (siehe Modulkopf dort).
   * `schliesse` bleibt hier, weil es den Zeitgeber dieses Workers abraeumt.
   */
  async function bearbeite(auftrag: Auftrag): Promise<unknown> {
    if (auftrag.art === "schliesse") {
      clearInterval(zeitgeber);
      dienst.schliesse();
      await dienst.meldeAb();
      return null;
    }
    return bearbeiteAuftrag(dienst, auftrag, uhr.stelluhr);
  }
}
