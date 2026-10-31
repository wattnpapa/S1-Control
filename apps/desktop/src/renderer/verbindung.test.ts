/**
 * Der Verbindungsstatus: Bewertung, Wiederverbindung, Herzschlag-Abfrage.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SCHWELLE_ROT_MS,
  SCHWELLE_UNTERBROCHEN_MS,
  bewerte,
  dauerText,
  schreibenGesperrt,
  unterbrochenText,
  useVerbindung,
} from "./verbindung.js";
import { TAKT_AUSFALL_MS, TAKT_VERBUNDEN_MS, starteUeberwachung } from "./verbindungsueberwachung.js";
import { OffeneAnfragen, ANFRAGE_GUELTIG_MS, istSchreibend, neueAnfrageId } from "./webAnfrage.js";

beforeEach(() => {
  useVerbindung.getState().zuruecksetzen();
});

describe("bewerte", () => {
  it("zeigt nichts, solange keine Überwachung läuft (Electron)", () => {
    expect(bewerte(useVerbindung.getState(), 99_999).zustand).toBe("unbekannt");
  });

  it("ist verbunden bis zur Schwelle und danach unterbrochen (gelb, später rot)", () => {
    useVerbindung.getState().meldeKontakt(1000);
    const z = useVerbindung.getState();
    expect(bewerte(z, 1000 + SCHWELLE_UNTERBROCHEN_MS).zustand).toBe("verbunden");
    expect(bewerte(z, 1000 + SCHWELLE_UNTERBROCHEN_MS + 1)).toMatchObject({ zustand: "unterbrochen", stufe: "gelb" });
    expect(bewerte(z, 1000 + SCHWELLE_ROT_MS)).toMatchObject({ zustand: "unterbrochen", stufe: "rot" });
  });

  it("gilt bei einem gemeldeten Ausfall sofort als unterbrochen und sperrt das Schreiben", () => {
    useVerbindung.getState().meldeKontakt(1000);
    useVerbindung.getState().meldeAusfall(2000);
    expect(bewerte(useVerbindung.getState(), 2500)).toMatchObject({ zustand: "unterbrochen", seitMs: 1500 });
    expect(schreibenGesperrt(useVerbindung.getState(), 2500)).toBe(true);
  });

  it("formuliert Dauer und Satz in Klartext", () => {
    expect(dauerText(12_400)).toBe("12 s");
    expect(dauerText(190_000)).toBe("3 min");
    expect(dauerText(2 * 3600_000)).toBe("2 h");
    expect(unterbrochenText(12_000)).toBe("Keine Verbindung zum Dienst seit 12 s");
  });
});

describe("Wiederverbindung", () => {
  it("zählt nach Ausfall und hebt die Störung auf", () => {
    const s = useVerbindung.getState();
    s.meldeKontakt(1000);
    expect(useVerbindung.getState().wiederverbunden).toBe(0);
    s.meldeAusfall(2000);
    useVerbindung.getState().meldeKontakt(5000);
    const z = useVerbindung.getState();
    expect(z.wiederverbunden).toBe(1);
    expect(z.wiederverbundenUm).toBe(5000);
    expect(z.ausfallSeit).toBeUndefined();
    expect(schreibenGesperrt(z, 5001)).toBe(false);
  });

  it("zählt auch nach langer Stille ohne gemeldeten Ausfall (Gerät im Ruhezustand)", () => {
    useVerbindung.getState().meldeKontakt(1000);
    useVerbindung.getState().meldeKontakt(1000 + SCHWELLE_UNTERBROCHEN_MS + 5000);
    expect(useVerbindung.getState().wiederverbunden).toBe(1);
  });

  it("zählt einen normalen Kontakt nicht", () => {
    useVerbindung.getState().meldeKontakt(1000);
    useVerbindung.getState().meldeKontakt(3000);
    expect(useVerbindung.getState().wiederverbunden).toBe(0);
  });
});

describe("Strom liefert weiter, Rufe scheitern (Regression: seit 0 s)", () => {
  it("lässt die Dauer weiterzählen und erreicht die rote Stufe", () => {
    const s = useVerbindung.getState();
    s.meldeKontakt(1000);
    s.meldeAusfall(2000);
    // Jede Sekunde kommt eine Mitteilung, jede zweite Sekunde scheitert der Herzschlag.
    for (let t = 3000; t <= 70_000; t += 1000) {
      useVerbindung.getState().meldeStromKontakt(t);
      if (t % 2000 === 0) useVerbindung.getState().meldeAusfall(t);
    }
    const z = useVerbindung.getState();
    expect(z.wiederverbunden).toBe(0);
    const status = bewerte(z, 70_000);
    expect(status).toMatchObject({ zustand: "unterbrochen", stufe: "rot" });
    expect(status.zustand === "unterbrochen" && status.seitMs).toBe(69_000);
  });

  it("zählt den Strom als Kontakt, solange keine Störung festgestellt ist", () => {
    useVerbindung.getState().meldeKontakt(1000);
    useVerbindung.getState().meldeStromKontakt(9000);
    expect(bewerte(useVerbindung.getState(), 12_000)).toEqual({ zustand: "verbunden", letzterKontakt: 9000 });
  });

  it("heilt erst ein beantworteter Ruf oder Herzschlag", () => {
    const s = useVerbindung.getState();
    s.meldeKontakt(1000);
    s.meldeAusfall(2000);
    useVerbindung.getState().meldeStromKontakt(3000);
    expect(bewerte(useVerbindung.getState(), 3000).zustand).toBe("unterbrochen");
    useVerbindung.getState().meldeKontakt(4000);
    expect(bewerte(useVerbindung.getState(), 4000).zustand).toBe("verbunden");
  });
});

describe("Herzschlag-Abfrage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function ziel() {
    return { meldeKontakt: vi.fn(), meldeAusfall: vi.fn() };
  }

  it("fragt im Takt, meldet Kontakt und bei Ausfall dichter nach", async () => {
    const z = ziel();
    const hole = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("ok"))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response("ok"));
    const stop = starteUeberwachung({ hole, uhr: () => Date.now(), ziel: z });

    await vi.advanceTimersByTimeAsync(TAKT_VERBUNDEN_MS);
    expect(z.meldeKontakt).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(TAKT_VERBUNDEN_MS);
    expect(z.meldeAusfall).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(TAKT_AUSFALL_MS);
    expect(z.meldeKontakt).toHaveBeenCalledTimes(2);
    expect(hole.mock.calls[0]?.[0]).toBe("gesundheit");
    stop();
  });

  it("meldet einen Dienst, der nicht 200 antwortet, als Ausfall", async () => {
    const z = ziel();
    const hole = vi.fn<typeof fetch>(async () => new Response("", { status: 502 }));
    const stop = starteUeberwachung({ hole, uhr: () => 7, ziel: z });
    await vi.advanceTimersByTimeAsync(TAKT_VERBUNDEN_MS);
    expect(z.meldeAusfall).toHaveBeenCalledWith(7);
    stop();
  });

  it("reagiert sofort auf offline/online des Browsers und hört nach dem Anhalten auf", async () => {
    const z = ziel();
    const fenster = new EventTarget();
    const hole = vi.fn<typeof fetch>(async () => new Response("ok"));
    const stop = starteUeberwachung({ hole, uhr: () => 1, ziel: z, fenster });
    fenster.dispatchEvent(new Event("offline"));
    expect(z.meldeAusfall).toHaveBeenCalledTimes(1);
    fenster.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(1);
    expect(z.meldeKontakt).toHaveBeenCalledTimes(1);
    stop();
    await vi.advanceTimersByTimeAsync(TAKT_VERBUNDEN_MS * 3);
    expect(hole).toHaveBeenCalledTimes(1);
  });
});

describe("Anfragen", () => {
  it("erkennt schreibende Rufe", () => {
    expect(istSchreibend("bedienen")).toBe(true);
    expect(istSchreibend("einsatzAnlegen")).toBe(true);
    expect(istSchreibend("tabelleAnfordern")).toBe(false);
    expect(istSchreibend("standAnfordern")).toBe(false);
  });

  it("erzeugt IDs, die der Dienst annimmt", () => {
    expect(neueAnfrageId()).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(neueAnfrageId()).not.toBe(neueAnfrageId());
  });

  it("hält die ID eines unklaren Rufs für die Wiederholung bereit, begrenzt", () => {
    let jetzt = 0;
    let n = 0;
    const o = new OffeneAnfragen(() => jetzt, () => `neu${String(++n)}`);
    const erste = o.idFuer("a");
    o.merke("a", erste);
    expect(o.idFuer("a")).toBe(erste);
    o.gib("a");
    expect(o.idFuer("a")).not.toBe(erste);
    o.merke("a", "alt");
    jetzt = ANFRAGE_GUELTIG_MS + 1;
    expect(o.idFuer("a")).not.toBe("alt");
    for (let i = 0; i < 80; i += 1) o.merke(`k${String(i)}`, "x");
    expect(o.anzahl).toBeLessThanOrEqual(50);
  });
});
