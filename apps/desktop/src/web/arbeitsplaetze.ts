/**
 * Die Arbeitsplaetze der Web-Schale — ein Arbeitsplatz je Browser.
 *
 * Die Web-Schale ist **kein** Server im Sinne des Datenpfads (02-ZIELBILD.md
 * sagt „kein Serverprozess" fuer die Wahrheit auf dem Share, und daran aendert
 * sich hier nichts). Sie ist ein Rechner, auf dem mehrere Arbeitsplaetze
 * laufen, und jeder Browser ist einer davon: mit eigener `clientId` (§4.1),
 * eigenem Spiegel (§5.1), eigenen Ereignisdateien und eigenem Undo-Stapel.
 * Fuer den Share und fuer die Desktop-Arbeitsplaetze sieht ein Browser damit
 * genau so aus wie ein weiterer Rechner in der Fuehrungsstelle.
 *
 * Die Alternative — ein Arbeitsplatz fuer alle Browser — waere kuerzer
 * gewesen und falsch: Der Undo-Stapel ist je Client (§6 U3), und ein Bediener,
 * der den Schritt eines anderen zuruecknimmt, ohne es zu wissen, ist genau das
 * stille Verwerfen, das 02-ZIELBILD.md Nr. 5 ausschliesst.
 *
 * **Die Kennung des Arbeitsplatzes ist ein Cookie.** Es ist ein zufaelliger
 * Schluessel und nicht die `clientId`: Die `clientId` bleibt auf dem Server in
 * der `einstellungen.json` des Arbeitsplatzes, so wie sie auf dem Desktop im
 * Profil bleibt (§4.1). Zwei Reiter desselben Browsers teilen das Cookie und
 * damit den Arbeitsplatz — das ist der Fall „zwei Fenster einer Instanz", nicht
 * der Fall „zwei Schreiber mit einer Kennung" (§4.4), weil der Arbeitsplatz je
 * Schluessel nur einmal existiert.
 *
 * Diese Datei kennt weder HTTP noch Electron. Sie bekommt eine Fabrik fuer
 * die Schale eines Arbeitsplatzes und verwaltet Lebensdauer und Zuhoerer.
 */

import type { Antwort, Mitteilung, Ruf } from "../kontrakt/index.js";

/** Was ein Arbeitsplatz der Web-Schale koennen muss — die Vermittlung passt. */
export interface Arbeitsplatzschale {
  beantworte(ruf: Ruf): Promise<Antwort<unknown>>;
  /** Schliesst alle offenen Akten geordnet (Upload-Stand, Praesenz). */
  schliesse(): Promise<void>;
}

/**
 * Baut die Schale eines Arbeitsplatzes.
 *
 * @param schluessel die Kennung aus dem Cookie — bestimmt das Verzeichnis
 * @param sende wohin die Mitteilungen der Worker dieses Arbeitsplatzes gehen
 */
export type Schalenfabrik = (
  schluessel: string,
  sende: (mitteilung: Mitteilung) => void,
) => Arbeitsplatzschale;

export interface ArbeitsplaetzeOptionen {
  readonly fabrik: Schalenfabrik;
  /**
   * Wie lange ein Arbeitsplatz ohne Zuhoerer offen bleibt, in Millisekunden.
   *
   * Ein Browser, der neu laedt, ist fuer einen Augenblick ohne Zuhoerer; seine
   * Akten dafuer zu schliessen hiesse, den Worker bei jedem Neuladen neu zu
   * starten und den Fold neu zu rechnen. Ein Browser, der zugeklappt wurde,
   * soll dagegen nicht bis zum naechsten Neustart des Dienstes einen Thread
   * halten und eine Praesenz fortschreiben, hinter der niemand sitzt.
   */
  readonly gnadenfristMs: number;
  readonly zeit?: () => number;
  readonly protokolliere?: (stufe: "info" | "warnung" | "fehler", text: string) => void;
}

interface Platz {
  readonly schale: Arbeitsplatzschale;
  readonly zuhoerer: Set<(mitteilung: Mitteilung) => void>;
  schliessung: ReturnType<typeof setTimeout> | undefined;
}

/** Form des Schluessels: `base64url` aus 24 Bytes — nichts, was in einen Pfad gehoert. */
export const SCHLUESSEL_FORM = /^[A-Za-z0-9_-]{32}$/;

export class Arbeitsplaetze {
  readonly #o: ArbeitsplaetzeOptionen;
  readonly #plaetze = new Map<string, Platz>();

  constructor(optionen: ArbeitsplaetzeOptionen) {
    this.#o = optionen;
  }

  get offene(): readonly string[] {
    return [...this.#plaetze.keys()];
  }

  /** Beantwortet einen Ruf fuer den Arbeitsplatz mit diesem Schluessel. */
  async beantworte(schluessel: string, ruf: Ruf): Promise<Antwort<unknown>> {
    return this.#platz(schluessel).schale.beantworte(ruf);
  }

  /**
   * Meldet einen Zuhoerer an und liefert das Abmelden.
   *
   * Solange ein Zuhoerer da ist, bleibt der Arbeitsplatz offen; nach dem
   * letzten Abmelden laeuft die Gnadenfrist.
   */
  hoere(schluessel: string, zuhoerer: (mitteilung: Mitteilung) => void): () => void {
    const platz = this.#platz(schluessel);
    platz.zuhoerer.add(zuhoerer);
    if (platz.schliessung !== undefined) {
      clearTimeout(platz.schliessung);
      platz.schliessung = undefined;
    }
    return () => {
      platz.zuhoerer.delete(zuhoerer);
      if (platz.zuhoerer.size === 0) this.#gnadenfristStarten(schluessel, platz);
    };
  }

  /** Schliesst einen Arbeitsplatz jetzt — seine Akten geordnet, seine Zuhoerer verwaist. */
  async schliesse(schluessel: string): Promise<void> {
    const platz = this.#plaetze.get(schluessel);
    if (platz === undefined) return;
    if (platz.schliessung !== undefined) clearTimeout(platz.schliessung);
    this.#plaetze.delete(schluessel);
    await platz.schale.schliesse();
    this.#o.protokolliere?.("info", `Arbeitsplatz ${schluessel.slice(0, 8)}… geschlossen`);
  }

  async alleSchliessen(): Promise<void> {
    for (const schluessel of [...this.#plaetze.keys()]) await this.schliesse(schluessel);
  }

  #platz(schluessel: string): Platz {
    if (!SCHLUESSEL_FORM.test(schluessel)) throw new Error("Ungültiger Arbeitsplatzschlüssel.");
    const vorhanden = this.#plaetze.get(schluessel);
    if (vorhanden !== undefined) return vorhanden;

    const zuhoerer = new Set<(mitteilung: Mitteilung) => void>();
    const schale = this.#o.fabrik(schluessel, (mitteilung) => {
      for (const hoerer of zuhoerer) hoerer(mitteilung);
    });
    const platz: Platz = { schale, zuhoerer, schliessung: undefined };
    this.#plaetze.set(schluessel, platz);
    this.#o.protokolliere?.("info", `Arbeitsplatz ${schluessel.slice(0, 8)}… geöffnet`);
    // Ein Arbeitsplatz, der nur einen Ruf gestellt hat und nie zuhoert, soll
    // nicht ewig stehen bleiben: Die Frist laeuft ab dem ersten Kontakt.
    this.#gnadenfristStarten(schluessel, platz);
    return platz;
  }

  #gnadenfristStarten(schluessel: string, platz: Platz): void {
    if (platz.schliessung !== undefined) clearTimeout(platz.schliessung);
    platz.schliessung = setTimeout(() => {
      platz.schliessung = undefined;
      if (platz.zuhoerer.size > 0) return;
      void this.schliesse(schluessel).catch((fehler: unknown) => {
        this.#o.protokolliere?.("fehler", `Schließen: ${(fehler as Error).message}`);
      });
    }, this.#o.gnadenfristMs);
    // Der Zeitgeber darf den Prozess nicht am Leben halten — sonst haengt ein
    // beendeter Dienst an einem Arbeitsplatz, den niemand mehr braucht.
    platz.schliessung.unref();
  }
}
