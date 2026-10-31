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
 * **Ehrlich bei Störungen.** Die Brücke misst den Kontakt zum Dienst
 * (`verbindung.ts`, `verbindungsueberwachung.ts`) und sperrt schreibende Rufe,
 * solange er unterbrochen ist: Es gibt bewusst keine Warteschlange für später
 * (siehe docs/v2/adr/ADR-007). Ein Schreibruf, dessen Antwort ausbleibt, meldet
 * „Unklar, ob gespeichert" und nicht „nicht erreichbar"; seine Anfrage-ID bleibt
 * für die Wiederholung stehen, damit der Dienst nicht doppelt schreibt
 * (`webAnfrage.ts`, `web/wiederholung.ts`).
 *
 * Hinter der Anmeldung der Web-Schale (ADR-006) antwortet `ruf` mit 401,
 * sobald die Sitzung abgelaufen ist. Dann geht das Fenster zur Anmeldeseite,
 * statt den Bediener mit einer Statusnummer stehen zu lassen.
 */

import type { Bruecke } from "./bruecke.js";
import type { Antwort, Mitteilung, Ruf } from "../kontrakt/index.js";
import { OffeneAnfragen, istSchreibend } from "./webAnfrage.js";
import {
  MELDUNG_KEINE_VERBINDUNG,
  MELDUNG_NICHT_GESPEICHERT,
  MELDUNG_UNKLAR,
  schreibenGesperrt,
  useVerbindung,
} from "./verbindung.js";
import { meldeBeimSchliessenAb } from "./abmeldung.js";
import { starteUeberwachung } from "./verbindungsueberwachung.js";

export interface WebbrueckeOptionen {
  /** `fetch` und `EventSource` des Fensters — injizierbar fuer die Tests. */
  readonly hole?: typeof fetch;
  readonly Quelle?: typeof EventSource;
  /** Wohin das Fenster bei abgelaufener Anmeldung geht — injizierbar fuer die Tests. */
  readonly weiterleiten?: (ziel: string) => void;
  /** Uhr und ID-Erzeugung — injizierbar fuer die Tests. */
  readonly uhr?: () => number;
  readonly neueId?: () => string;
  /** `false` schaltet die Herzschlag-Abfrage ab (Tests ohne Zeitgeber). */
  readonly ueberwachen?: boolean;
}

/** Die Meldung, die noch kurz steht, bis die Anmeldeseite geladen ist. */
export const MELDUNG_ABGEMELDET = "Die Anmeldung ist abgelaufen. Bitte neu anmelden.";

/** Der Kopf, in dem die Anfrage-ID zum Dienst geht. */
export const KOPF_ANFRAGE_ID = "x-anfrage-id";

/** Gateway-Fehler eines Reverse-Proxys: Der Dienst dahinter hat die Anfrage womöglich doch gesehen. */
function istGatewayFehler(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

export function webBruecke(optionen: WebbrueckeOptionen = {}): Bruecke {
  const hole = optionen.hole ?? ((eingabe, init) => fetch(eingabe, init));
  const Quelle = optionen.Quelle ?? EventSource;
  const uhr = optionen.uhr ?? (() => Date.now());
  const weiterleiten =
    optionen.weiterleiten ??
    ((ziel: string) => {
      window.location.assign(ziel);
    });
  const offene = new OffeneAnfragen(uhr, optionen.neueId);
  const zuhoerer = new Set<(mitteilung: Mitteilung) => void>();
  let quelle: EventSource | undefined;
  let anhalten: (() => void) | undefined;

  function verbinde(): void {
    if (quelle !== undefined) return;
    quelle = new Quelle("mitteilungen");
    const verbindung = useVerbindung.getState();
    verbindung.starte(uhr());
    quelle.addEventListener("open", () => useVerbindung.getState().meldeStromKontakt(uhr()));
    quelle.addEventListener("mitteilung", (ereignis) => {
      useVerbindung.getState().meldeStromKontakt(uhr());
      const mitteilung = JSON.parse((ereignis as MessageEvent<string>).data) as Mitteilung;
      for (const hoerer of zuhoerer) hoerer(mitteilung);
    });
    if (optionen.ueberwachen !== false) {
      anhalten = starteUeberwachung({
        hole,
        uhr,
        ziel: {
          meldeKontakt: (t) => useVerbindung.getState().meldeKontakt(t),
          meldeAusfall: (t) => useVerbindung.getState().meldeAusfall(t),
        },
        ...(typeof window === "undefined" ? {} : { fenster: window }),
      });
    }
    if (typeof window !== "undefined" && optionen.ueberwachen !== false) {
      const beacon = typeof navigator === "undefined" ? undefined : navigator.sendBeacon?.bind(navigator);
      const ohneAbmeldung = meldeBeimSchliessenAb(window, beacon);
      const bisher = anhalten;
      anhalten = () => {
        bisher?.();
        ohneAbmeldung();
      };
    }
  }

  /** Der Ruf ging hinaus, aber es kam keine brauchbare Antwort zurück. */
  function ohneAntwort(schreibend: boolean): Antwort<unknown> {
    if (!schreibend) return { ok: false, meldung: MELDUNG_KEINE_VERBINDUNG };
    useVerbindung.getState().meldeUnklar();
    return { ok: false, meldung: MELDUNG_UNKLAR };
  }

  async function sende(koerper: string, id: string | undefined): Promise<Antwort<unknown>> {
    const schreibend = id !== undefined;
    let antwort: Response;
    try {
      antwort = await hole("ruf", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(id === undefined ? {} : { [KOPF_ANFRAGE_ID]: id }),
        },
        body: koerper,
      });
    } catch {
      useVerbindung.getState().meldeAusfall(uhr());
      if (schreibend) offene.merke(koerper, id);
      return ohneAntwort(schreibend);
    }
    if (antwort.status === 401) {
      weiterleiten("anmeldung");
      return { ok: false, meldung: MELDUNG_ABGEMELDET };
    }
    if (istGatewayFehler(antwort.status)) {
      useVerbindung.getState().meldeAusfall(uhr());
      if (schreibend) offene.merke(koerper, id);
      return ohneAntwort(schreibend);
    }
    useVerbindung.getState().meldeKontakt(uhr());
    return lies(antwort, koerper, id);
  }

  async function lies(antwort: Response, koerper: string, id: string | undefined): Promise<Antwort<unknown>> {
    const schreibend = id !== undefined;
    if (antwort.ok) {
      try {
        const wert = (await antwort.json()) as Antwort<unknown>;
        offene.gib(koerper);
        return wert;
      } catch {
        // Der Körper kam nicht vollständig an: Ausgang unbekannt.
        if (schreibend) offene.merke(koerper, id);
        return ohneAntwort(schreibend);
      }
    }
    if (schreibend && antwort.status >= 500) {
      offene.merke(koerper, id);
      return ohneAntwort(true);
    }
    offene.gib(koerper);
    return { ok: false, meldung: `Der Dienst antwortete mit ${String(antwort.status)}.` };
  }

  return {
    plattform: "web",
    electron: "keine",

    async ruf(anfrage: Ruf): Promise<Antwort<unknown>> {
      const schreibend = istSchreibend(anfrage.art);
      // Kein Schreiben ins Ungewisse: Bei erkannter Unterbrechung geht die
      // Eingabe gar nicht erst hinaus, und die Meldung sagt das klar.
      if (schreibend && schreibenGesperrt(useVerbindung.getState(), uhr())) {
        return { ok: false, meldung: MELDUNG_NICHT_GESPEICHERT };
      }
      const koerper = JSON.stringify(anfrage);
      return sende(koerper, schreibend ? offene.idFuer(koerper) : undefined);
    },

    aufMitteilung(hoerer) {
      zuhoerer.add(hoerer);
      verbinde();
      return () => {
        zuhoerer.delete(hoerer);
        if (zuhoerer.size === 0) {
          quelle?.close();
          quelle = undefined;
          anhalten?.();
          anhalten = undefined;
        }
      };
    },
  };
}
