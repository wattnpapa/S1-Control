/**
 * Der Griff ins Netz — die einzige Stelle dieses Programms, die einen Ruf
 * nach draußen tut (M9.1).
 *
 * **Sie ist absichtlich die einzige.** Bis M8 hat S1-Control nie das Netz
 * benutzt; das war eine Zusage („keine Telemetrie", M7) und keine Lücke. Mit
 * dem Holen eines Pakets kommt ein Ruf hinzu, und deshalb steht er hier
 * allein, mit dem, was ein Ruf nach draußen braucht:
 *
 *  * **Ein Zeitausstieg.** Ohne ihn hinge die Anwendung an einer Leitung, die
 *    keine Antwort mehr schickt, bis jemand das Fenster schließt.
 *  * **Eine Grenze für die Antwort, mitgezählt beim Lesen.** Auf
 *    `content-length` zu vertrauen hieße, dem zu glauben, den man gerade
 *    prüft; wer eine Verbindung offen hält und weiterschickt, füllte sonst
 *    den Arbeitsspeicher.
 *  * **Kein Weiterreichen von Kennungen.** Kein Kekshalter, keine Anmeldung,
 *    keine Kennung dieses Arbeitsplatzes. Die Gegenstelle erfährt, dass
 *    jemand ein Paket holt, und sonst nichts.
 *
 * Umleitungen folgt `fetch` von selbst; das ist bei einer
 * Veröffentlichungsstelle der Normalfall, weil die Anhänge auf einem
 * Auslieferungswirt liegen. Dass das Ziel dieser Umleitung nicht beliebig ist,
 * wird **vor** dem Ruf geprüft (`deuteRelease` in Ring 2) — und die Aussage,
 * auf die es ankommt, macht ohnehin erst die Signatur.
 */

import { ANHANG_ZEITAUSSTIEG_MS, AUSKUNFT_ZEITAUSSTIEG_MS } from "./verteilquelle.js";
import type { Netzholer } from "./programmbezug.js";

/** Kopfzeilen, die jeder Ruf trägt — und nur diese. */
const KOPFZEILEN: Readonly<Record<string, string>> = {
  accept: "application/octet-stream, application/json;q=0.9, */*;q=0.8",
  "user-agent": "S1-Control",
};

async function liesBegrenzt(antwort: Response, grenze: number, url: string): Promise<Uint8Array> {
  const koerper = antwort.body;
  if (koerper === null) return new Uint8Array(0);
  const leser = koerper.getReader();
  const stuecke: Uint8Array[] = [];
  let gelesen = 0;
  for (;;) {
    const { done, value } = await leser.read();
    if (done === true) break;
    if (value === undefined) continue;
    gelesen += value.byteLength;
    if (gelesen > grenze) {
      await leser.cancel().catch(() => undefined);
      throw new Error(`Die Antwort von ${url} ist größer als die zugesagten ${String(grenze)} Byte.`);
    }
    stuecke.push(value);
  }
  const alles = new Uint8Array(gelesen);
  let stelle = 0;
  for (const stueck of stuecke) {
    alles.set(stueck, stelle);
    stelle += stueck.byteLength;
  }
  return alles;
}

async function rufe(url: string, grenze: number, zeitausstiegMs: number): Promise<Uint8Array> {
  const abbruch = new AbortController();
  const wecker = setTimeout(() => {
    abbruch.abort();
  }, zeitausstiegMs);
  try {
    const antwort = await fetch(url, {
      signal: abbruch.signal,
      redirect: "follow",
      headers: KOPFZEILEN,
      // Keine Kennung, kein Keks: Was diese Anwendung tut, geht die
      // Gegenstelle nichts an, das Holen des Pakets ausgenommen.
      credentials: "omit",
      cache: "no-store",
    });
    if (!antwort.ok) {
      throw new Error(`${url} antwortet mit ${String(antwort.status)}.`);
    }
    return await liesBegrenzt(antwort, grenze, url);
  } catch (fehler) {
    if (abbruch.signal.aborted) {
      throw new Error(
        `${url} hat innerhalb von ${String(Math.round(zeitausstiegMs / 1000))} s nicht geantwortet.`,
        { cause: fehler },
      );
    }
    throw fehler;
  } finally {
    clearTimeout(wecker);
  }
}

/** Der Holer, wie ihn die Schale benutzt. */
export function knotenNetzholer(): Netzholer {
  return {
    async text(url, grenze) {
      return new TextDecoder().decode(await rufe(url, grenze, AUSKUNFT_ZEITAUSSTIEG_MS));
    },
    async bytes(url, grenze) {
      return rufe(url, grenze, ANHANG_ZEITAUSSTIEG_MS);
    },
  };
}
