/**
 * Der Reload-Merker, die zuletzt gesehenen Stände und der Entwurf.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MERKER_MAX_ALTER_MS,
  ladeEntwurf,
  ladeMerker,
  ladeStaende,
  loescheEntwurf,
  loescheMerker,
  merkeStand,
  speichereEntwurf,
  speichereMerker,
} from "./sitzung.js";

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Merker des zuletzt geöffneten Einsatzes", () => {
  it("merkt Einsatz und Blatt für diese Browser-Sitzung", () => {
    speichereMerker("2026-10-31_uebung_abc123", "tagebuch", 1000);
    expect(ladeMerker(2000)).toEqual({ ordner: "2026-10-31_uebung_abc123", blatt: "tagebuch", zeit: 1000 });
  });

  it("fällt auf den localStorage zurück — aber nur mit frischem Zeitstempel", () => {
    speichereMerker("E1", "lage", 1000);
    sessionStorage.clear();
    expect(ladeMerker(1000 + MERKER_MAX_ALTER_MS)?.ordner).toBe("E1");
    expect(ladeMerker(1001 + MERKER_MAX_ALTER_MS)).toBeUndefined();
  });

  it("löscht beide Speicher beim ausdrücklichen Zurück", () => {
    speichereMerker("E1", "lage");
    loescheMerker();
    expect(ladeMerker()).toBeUndefined();
  });

  it("ignoriert kaputte Einträge", () => {
    sessionStorage.setItem("s1.zuletzt", "{kaputt");
    localStorage.setItem("s1.zuletzt", JSON.stringify({ ordner: 5 }));
    expect(ladeMerker()).toBeUndefined();
  });

  it("bleibt bedienbar, wenn der Speicher wirft", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("voll");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    expect(() => { speichereMerker("E1", "lage"); }).not.toThrow();
    expect(ladeMerker()).toBeUndefined();
    expect(ladeStaende()).toEqual({});
  });
});

describe("Zuletzt gesehener Stand je Einsatz", () => {
  it("merkt Status und Einheiten und kürzt auf die jüngsten fünfzig", () => {
    for (let i = 0; i < 55; i += 1) merkeStand(`E${String(i)}`, { status: "AKTIV", einheiten: i, genutzt: i });
    const staende = ladeStaende();
    expect(Object.keys(staende)).toHaveLength(50);
    expect(staende["E54"]).toEqual({ status: "AKTIV", einheiten: 54, genutzt: 54 });
    expect(staende["E0"]).toBeUndefined();
  });
});

describe("Entwurf", () => {
  it("überlebt das Neuladen und ist löschbar", () => {
    speichereEntwurf("E1", { kennung: "A-1" });
    expect(ladeEntwurf<{ kennung: string }>()).toEqual({ ordner: "E1", eingabe: { kennung: "A-1" } });
    loescheEntwurf();
    expect(ladeEntwurf()).toBeUndefined();
  });
});
