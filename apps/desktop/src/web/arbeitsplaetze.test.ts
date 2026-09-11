/**
 * Die Arbeitsplaetze der Web-Schale gegen eine Attrappe der Schale.
 *
 * Geprueft wird die Lebensdauer: dass ein Browser, der neu laedt, seinen
 * Arbeitsplatz behaelt, und ein Browser, der fort ist, ihn nach der Frist
 * verliert. Beides ist im Betrieb der Normalfall, und beides waere ohne
 * Fehlermeldung falsch — ein Worker zu viel oder ein Fold zu oft.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Arbeitsplaetze, type Arbeitsplatzschale } from "./arbeitsplaetze.js";
import type { Mitteilung, Ruf } from "../kontrakt/index.js";

const SCHLUESSEL_A = "a".repeat(32);
const SCHLUESSEL_B = "b".repeat(32);

interface Attrappe extends Arbeitsplatzschale {
  readonly rufe: Ruf[];
  readonly sende: (mitteilung: Mitteilung) => void;
  geschlossen: boolean;
}

function baue(): { plaetze: Arbeitsplaetze; attrappen: Map<string, Attrappe> } {
  const attrappen = new Map<string, Attrappe>();
  const plaetze = new Arbeitsplaetze({
    gnadenfristMs: 1_000,
    fabrik: (schluessel, sende) => {
      const rufe: Ruf[] = [];
      const attrappe: Attrappe = {
        rufe,
        sende,
        geschlossen: false,
        async beantworte(ruf) {
          rufe.push(ruf);
          return { ok: true, wert: schluessel };
        },
        async schliesse() {
          attrappe.geschlossen = true;
        },
      };
      attrappen.set(schluessel, attrappe);
      return attrappe;
    },
  });
  return { plaetze, attrappen };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Arbeitsplaetze", () => {
  it("baut je Schlüssel genau einen Arbeitsplatz", async () => {
    const { plaetze, attrappen } = baue();
    expect(await plaetze.beantworte(SCHLUESSEL_A, { art: "umgebung" })).toEqual({ ok: true, wert: SCHLUESSEL_A });
    await plaetze.beantworte(SCHLUESSEL_A, { art: "einstellungenLesen" });
    await plaetze.beantworte(SCHLUESSEL_B, { art: "umgebung" });
    expect(attrappen.size).toBe(2);
    expect(attrappen.get(SCHLUESSEL_A)?.rufe.map((r) => r.art)).toEqual(["umgebung", "einstellungenLesen"]);
  });

  it("weist einen Schlüssel ab, der nicht die Form hat", async () => {
    const { plaetze } = baue();
    await expect(plaetze.beantworte("../etc", { art: "umgebung" })).rejects.toThrow(
      "Ungültiger Arbeitsplatzschlüssel.",
    );
  });

  it("liefert Mitteilungen nur an die Zuhörer desselben Arbeitsplatzes", async () => {
    const { plaetze, attrappen } = baue();
    const beiA: Mitteilung[] = [];
    const beiB: Mitteilung[] = [];
    plaetze.hoere(SCHLUESSEL_A, (m) => beiA.push(m));
    plaetze.hoere(SCHLUESSEL_B, (m) => beiB.push(m));
    const hinweis: Mitteilung = { art: "hinweis", stufe: "info", text: "nur A" };
    attrappen.get(SCHLUESSEL_A)?.sende(hinweis);
    expect(beiA).toEqual([hinweis]);
    expect(beiB).toEqual([]);
  });

  it("schließt einen Arbeitsplatz nach der Gnadenfrist ohne Zuhörer", async () => {
    const { plaetze, attrappen } = baue();
    const abmelden = plaetze.hoere(SCHLUESSEL_A, () => undefined);
    abmelden();
    await vi.advanceTimersByTimeAsync(999);
    expect(attrappen.get(SCHLUESSEL_A)?.geschlossen).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(attrappen.get(SCHLUESSEL_A)?.geschlossen).toBe(true);
    expect(plaetze.offene).toEqual([]);
  });

  it("behält den Arbeitsplatz, wenn innerhalb der Frist wieder jemand zuhört (Neuladen)", async () => {
    const { plaetze, attrappen } = baue();
    plaetze.hoere(SCHLUESSEL_A, () => undefined)();
    await vi.advanceTimersByTimeAsync(500);
    const abmelden = plaetze.hoere(SCHLUESSEL_A, () => undefined);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(attrappen.get(SCHLUESSEL_A)?.geschlossen).toBe(false);
    expect(attrappen.size).toBe(1);
    abmelden();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(attrappen.get(SCHLUESSEL_A)?.geschlossen).toBe(true);
  });

  it("schließt auch einen Arbeitsplatz, der nur gerufen und nie zugehört hat", async () => {
    const { plaetze, attrappen } = baue();
    await plaetze.beantworte(SCHLUESSEL_A, { art: "umgebung" });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(attrappen.get(SCHLUESSEL_A)?.geschlossen).toBe(true);
  });

  it("baut nach dem Schließen auf Zuruf einen neuen Arbeitsplatz unter demselben Schlüssel", async () => {
    const { plaetze, attrappen } = baue();
    await plaetze.beantworte(SCHLUESSEL_A, { art: "umgebung" });
    const erste = attrappen.get(SCHLUESSEL_A);
    await plaetze.schliesse(SCHLUESSEL_A);
    await plaetze.beantworte(SCHLUESSEL_A, { art: "umgebung" });
    expect(attrappen.get(SCHLUESSEL_A)).not.toBe(erste);
    expect(erste?.geschlossen).toBe(true);
  });

  it("schließt alle", async () => {
    const { plaetze, attrappen } = baue();
    plaetze.hoere(SCHLUESSEL_A, () => undefined);
    plaetze.hoere(SCHLUESSEL_B, () => undefined);
    await plaetze.alleSchliessen();
    expect([...attrappen.values()].every((a) => a.geschlossen)).toBe(true);
    expect(plaetze.offene).toEqual([]);
  });
});
