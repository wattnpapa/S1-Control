/**
 * Die Web-Bruecke gegen Attrappen von `fetch` und `EventSource`.
 *
 * Geprueft wird, was die Bruecke selbst entscheidet: die Form des Rufs, die
 * Uebersetzung eines HTTP-Fehlers in `{ ok: false }` und die Lebensdauer des
 * Stroms. Was der Dienst antwortet, prueft `../web/dienst.test.ts`.
 */

import { describe, expect, it, vi } from "vitest";

import { MELDUNG_ABGEMELDET, webBruecke } from "./webBruecke.js";
import { MELDUNG_KEINE_VERBINDUNG } from "./verbindung.js";
import type { Mitteilung } from "../kontrakt/index.js";

class Quelle extends EventTarget {
  static offene: Quelle[] = [];
  readonly url: string;
  geschlossen = false;
  constructor(url: string) {
    super();
    this.url = url;
    Quelle.offene.push(this);
  }
  close(): void {
    this.geschlossen = true;
  }
  liefere(mitteilung: Mitteilung): void {
    this.dispatchEvent(new MessageEvent("mitteilung", { data: JSON.stringify(mitteilung) }));
  }
}

function antwortMit(status: number, koerper: unknown): Response {
  return new Response(JSON.stringify(koerper), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("webBruecke", () => {
  it("schickt einen Ruf als JSON an `ruf` und packt die Antwort aus", async () => {
    const hole = vi.fn(async () => antwortMit(200, { ok: true, wert: { plattform: "web" } }));
    const bruecke = webBruecke({ hole, Quelle: Quelle as unknown as typeof EventSource });
    expect(await bruecke.ruf({ art: "umgebung" })).toEqual({ ok: true, wert: { plattform: "web" } });
    expect(hole).toHaveBeenCalledWith("ruf", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ art: "umgebung" }),
    });
    expect(bruecke.plattform).toBe("web");
  });

  it("macht aus einem HTTP-Fehler eine Antwort mit ok: false", async () => {
    const hole = vi.fn(async () => antwortMit(500, {}));
    const bruecke = webBruecke({ hole, Quelle: Quelle as unknown as typeof EventSource });
    expect(await bruecke.ruf({ art: "umgebung" })).toEqual({
      ok: false,
      meldung: "Der Dienst antwortete mit 500.",
    });
  });

  it("geht bei 401 (Anmeldung abgelaufen) zur Anmeldeseite", async () => {
    const hole = vi.fn(async () => antwortMit(401, { ok: false, meldung: "Nicht angemeldet." }));
    const weiterleiten = vi.fn();
    const bruecke = webBruecke({ hole, Quelle: Quelle as unknown as typeof EventSource, weiterleiten });
    expect(await bruecke.ruf({ art: "umgebung" })).toEqual({ ok: false, meldung: MELDUNG_ABGEMELDET });
    // Relativ, wie `ruf` und `mitteilungen` — auch hinter einem Unterpfad.
    expect(weiterleiten).toHaveBeenCalledWith("anmeldung");
  });

  it("leitet bei anderen Fehlern nicht weiter", async () => {
    const weiterleiten = vi.fn();
    const bruecke = webBruecke({
      hole: vi.fn(async () => antwortMit(403, {})),
      Quelle: Quelle as unknown as typeof EventSource,
      weiterleiten,
    });
    await bruecke.ruf({ art: "umgebung" });
    expect(weiterleiten).not.toHaveBeenCalled();
  });

  it("macht aus einem Netzfehler eine Antwort mit ok: false", async () => {
    const hole = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const bruecke = webBruecke({ hole, Quelle: Quelle as unknown as typeof EventSource });
    expect(await bruecke.ruf({ art: "umgebung" })).toEqual({
      ok: false,
      meldung: MELDUNG_KEINE_VERBINDUNG,
    });
  });

  it("öffnet den Strom beim ersten Zuhörer, teilt ihn und schließt ihn nach dem letzten", () => {
    Quelle.offene = [];
    const bruecke = webBruecke({ hole: vi.fn(), Quelle: Quelle as unknown as typeof EventSource });
    const erste: Mitteilung[] = [];
    const zweite: Mitteilung[] = [];
    const abErste = bruecke.aufMitteilung((m) => erste.push(m));
    const abZweite = bruecke.aufMitteilung((m) => zweite.push(m));
    expect(Quelle.offene).toHaveLength(1);
    expect(Quelle.offene[0]?.url).toBe("mitteilungen");

    const hinweis: Mitteilung = { art: "hinweis", stufe: "info", text: "hallo" };
    Quelle.offene[0]?.liefere(hinweis);
    expect(erste).toEqual([hinweis]);
    expect(zweite).toEqual([hinweis]);

    abErste();
    expect(Quelle.offene[0]?.geschlossen).toBe(false);
    abZweite();
    expect(Quelle.offene[0]?.geschlossen).toBe(true);

    // Ein neuer Zuhörer bekommt einen neuen Strom.
    bruecke.aufMitteilung(() => undefined);
    expect(Quelle.offene).toHaveLength(2);
  });
});
