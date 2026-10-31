/**
 * Die Web-Brücke bei Störungen: verlorene Antwort, Unterbrechung, Wiederholung.
 *
 * Der Kern ist der Befund P0-1: Kommt die Antwort eines Schreibrufs nicht an,
 * darf die Wiederholung die Einheit nicht doppelt anlegen. Hier wird geprüft,
 * was die Brücke dafür tut (gleiche ID bei Wiederholung, ehrliche Meldung,
 * Sperre bei Unterbrechung); dass der Dienst die ID auswertet, prüft
 * `../web/dienst.test.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MELDUNG_KEINE_VERBINDUNG,
  MELDUNG_NICHT_GESPEICHERT,
  MELDUNG_UNKLAR,
  useVerbindung,
} from "./verbindung.js";
import { KOPF_ANFRAGE_ID, webBruecke } from "./webBruecke.js";
import { ANFRAGE_GUELTIG_MS } from "./webAnfrage.js";
import type { Ruf } from "../kontrakt/index.js";

const SCHREIBEN: Ruf = { art: "einsatzSchliessen", akteId: "akte-1" };

function ok(wert: unknown): Response {
  return new Response(JSON.stringify({ ok: true, wert }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function bruecke(hole: typeof fetch, uhr: () => number = () => 1000) {
  let n = 0;
  return webBruecke({
    hole,
    uhr,
    neueId: () => `id-${String(++n).padStart(16, "0")}`,
    ueberwachen: false,
    Quelle: class {} as unknown as typeof EventSource,
  });
}

function kopfId(hole: ReturnType<typeof vi.fn>, aufruf: number): string | undefined {
  const init = hole.mock.calls[aufruf]?.[1] as RequestInit;
  return (init.headers as Record<string, string>)[KOPF_ANFRAGE_ID];
}

beforeEach(() => {
  useVerbindung.getState().zuruecksetzen();
});

describe("Schreibruf mit verlorener Antwort", () => {
  it("meldet „Unklar, ob gespeichert“ statt „nicht erreichbar“", async () => {
    const hole = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const antwort = await bruecke(hole as unknown as typeof fetch).ruf(SCHREIBEN);
    expect(antwort).toEqual({ ok: false, meldung: MELDUNG_UNKLAR });
    expect(MELDUNG_UNKLAR).toContain("Liste prüfen");
    expect(JSON.stringify(antwort)).not.toContain("Failed to fetch");
    expect(useVerbindung.getState().unklar).toBe(1);
  });

  it("wiederholt mit derselben Anfrage-ID, damit der Dienst nicht doppelt schreibt", async () => {
    const hole = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(ok("fertig"));
    const b = bruecke(hole, () => 1000);
    // Eine Störung ist erkannt, aber noch keine Sperre: Wir lassen die Zeit stehen und
    // heben den Ausfall vor der Wiederholung auf (der Herzschlag tut das im Betrieb).
    expect((await b.ruf(SCHREIBEN)).ok).toBe(false);
    useVerbindung.getState().meldeKontakt(1000);
    expect(await b.ruf(SCHREIBEN)).toEqual({ ok: true, wert: "fertig" });
    expect(kopfId(hole as unknown as ReturnType<typeof vi.fn>, 0)).toMatch(/^id-/);
    expect(kopfId(hole as unknown as ReturnType<typeof vi.fn>, 1)).toBe(
      kopfId(hole as unknown as ReturnType<typeof vi.fn>, 0),
    );
  });

  it("vergibt nach eindeutigem Ausgang wieder eine neue ID", async () => {
    const hole = vi.fn<typeof fetch>(async () => ok("fertig"));
    const b = bruecke(hole);
    await b.ruf(SCHREIBEN);
    await b.ruf(SCHREIBEN);
    expect(kopfId(hole as unknown as ReturnType<typeof vi.fn>, 0)).not.toBe(
      kopfId(hole as unknown as ReturnType<typeof vi.fn>, 1),
    );
  });

  it("vergibt nach Ablauf der Gültigkeit eine neue ID", async () => {
    let jetzt = 1000;
    const hole = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("x"))
      .mockResolvedValueOnce(ok(1));
    const b = bruecke(hole, () => jetzt);
    await b.ruf(SCHREIBEN);
    jetzt += ANFRAGE_GUELTIG_MS + 1;
    useVerbindung.getState().meldeKontakt(jetzt);
    await b.ruf(SCHREIBEN);
    expect(kopfId(hole as unknown as ReturnType<typeof vi.fn>, 1)).not.toBe(
      kopfId(hole as unknown as ReturnType<typeof vi.fn>, 0),
    );
  });

  it("meldet bei Gateway-Fehler des Proxys ebenfalls „unklar“, bei Lesen „keine Verbindung“", async () => {
    const hole = vi.fn<typeof fetch>(async () => new Response("", { status: 504 }));
    const b = bruecke(hole);
    expect(await b.ruf(SCHREIBEN)).toEqual({ ok: false, meldung: MELDUNG_UNKLAR });
    useVerbindung.getState().meldeKontakt(1000);
    expect(await b.ruf({ art: "umgebung" })).toEqual({ ok: false, meldung: MELDUNG_KEINE_VERBINDUNG });
  });

  it("schickt lesende Rufe ohne Anfrage-ID", async () => {
    const hole = vi.fn<typeof fetch>(async () => ok(null));
    await bruecke(hole).ruf({ art: "einsaetzeAuflisten" });
    expect(kopfId(hole as unknown as ReturnType<typeof vi.fn>, 0)).toBeUndefined();
  });
});

describe("Schreibsperre bei Unterbrechung", () => {
  it("weist Schreibrufe ohne Netzaufruf ab, lässt Lesen aber durch", async () => {
    const hole = vi.fn<typeof fetch>(async () => ok([]));
    const b = bruecke(hole);
    useVerbindung.getState().meldeAusfall(500);
    expect(await b.ruf(SCHREIBEN)).toEqual({ ok: false, meldung: MELDUNG_NICHT_GESPEICHERT });
    expect(hole).not.toHaveBeenCalled();
    expect((await b.ruf({ art: "einsaetzeAuflisten" })).ok).toBe(true);
  });

  it("schreibt wieder, sobald der Kontakt zurück ist", async () => {
    const hole = vi.fn<typeof fetch>(async () => ok("gut"));
    const b = bruecke(hole);
    useVerbindung.getState().meldeAusfall(500);
    useVerbindung.getState().meldeKontakt(900);
    expect(await b.ruf(SCHREIBEN)).toEqual({ ok: true, wert: "gut" });
  });

  it("nennt die Meldung ohne englische Reste und mit klarer Folge", () => {
    expect(MELDUNG_NICHT_GESPEICHERT).toContain("nicht gespeichert");
    expect(MELDUNG_NICHT_GESPEICHERT).not.toMatch(/fetch/i);
  });
});
