/**
 * Die Bruecke zur Web-Schale — die andere Seite von `web/dienst.ts`.
 *
 * Wo das Preload `ipcRenderer.invoke` und `ipcRenderer.on` in zwei
 * Funktionen fasst, tun das hier `fetch` und `EventSource`. Die Form ist
 * dieselbe {@link Bruecke}; der Store und die Komponenten merken nicht, ob
 * sie in einem Electron-Fenster oder in einem Browser laufen.
 *
 * Relative Pfade (`ruf`, `mitteilungen`), kein fuehrender Schraegstrich: Der
 * Renderer wird mit `base: "./"` gebaut und soll auch hinter einem
 * Reverse-Proxy unter einem Unterpfad laufen.
 *
 * Der Strom wird erst geoeffnet, wenn jemand zuhoert, und geschlossen, wenn
 * der letzte Zuhoerer geht. `EventSource` verbindet nach einem Abriss selbst
 * neu; die Luecke, die dabei entstehen kann, faengt der Store ueber die Folge
 * der Standmitteilungen (`standAnfordern`).
 *
 * Hinter der Anmeldung der Web-Schale (ADR-006) antwortet `ruf` mit 401,
 * sobald die Sitzung abgelaufen ist. Dann geht das Fenster zur Anmeldeseite,
 * statt den Bediener mit einer Statusnummer stehen zu lassen.
 */

import type { Bruecke } from "./bruecke.js";
import type { Antwort, Mitteilung, Ruf } from "../kontrakt/index.js";

export interface WebbrueckeOptionen {
  /** `fetch` und `EventSource` des Fensters — injizierbar fuer die Tests. */
  readonly hole?: typeof fetch;
  readonly Quelle?: typeof EventSource;
  /** Wohin das Fenster bei abgelaufener Anmeldung geht — injizierbar fuer die Tests. */
  readonly weiterleiten?: (ziel: string) => void;
}

/** Die Meldung, die noch kurz steht, bis die Anmeldeseite geladen ist. */
export const MELDUNG_ABGEMELDET = "Die Anmeldung ist abgelaufen. Bitte neu anmelden.";

export function webBruecke(optionen: WebbrueckeOptionen = {}): Bruecke {
  const hole = optionen.hole ?? ((eingabe, init) => fetch(eingabe, init));
  const Quelle = optionen.Quelle ?? EventSource;
  const weiterleiten =
    optionen.weiterleiten ??
    ((ziel: string) => {
      window.location.assign(ziel);
    });
  const zuhoerer = new Set<(mitteilung: Mitteilung) => void>();
  let quelle: EventSource | undefined;

  function verbinde(): void {
    if (quelle !== undefined) return;
    quelle = new Quelle("mitteilungen");
    quelle.addEventListener("mitteilung", (ereignis) => {
      const mitteilung = JSON.parse((ereignis as MessageEvent<string>).data) as Mitteilung;
      for (const hoerer of zuhoerer) hoerer(mitteilung);
    });
  }

  return {
    plattform: "web",
    electron: "keine",

    async ruf(anfrage: Ruf): Promise<Antwort<unknown>> {
      let antwort: Response;
      try {
        antwort = await hole("ruf", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(anfrage),
        });
      } catch (fehler) {
        return { ok: false, meldung: `Der Dienst ist nicht erreichbar: ${(fehler as Error).message}` };
      }
      if (antwort.status === 401) {
        weiterleiten("anmeldung");
        return { ok: false, meldung: MELDUNG_ABGEMELDET };
      }
      if (!antwort.ok) {
        return { ok: false, meldung: `Der Dienst antwortete mit ${String(antwort.status)}.` };
      }
      return (await antwort.json()) as Antwort<unknown>;
    },

    aufMitteilung(hoerer) {
      zuhoerer.add(hoerer);
      verbinde();
      return () => {
        zuhoerer.delete(hoerer);
        if (zuhoerer.size === 0) {
          quelle?.close();
          quelle = undefined;
        }
      };
    },
  };
}
