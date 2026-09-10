/**
 * Der Arbeiterhof gegen eine Attrappe statt gegen einen echten Thread.
 *
 * Geprüft wird genau das, was schwer zu finden wäre, wenn es falsch ist: dass
 * eine Antwort bei **ihrem** Aufrufer landet. Zwei Aufträge, die sich
 * überholen, sind im Betrieb der Normalfall — der Renderer stellt sie nicht
 * der Reihe nach —, und eine vertauschte Zuordnung wäre ein falscher Wert in
 * der Oberfläche ohne jede Fehlermeldung.
 */

import { describe, expect, it } from "vitest";

import { Arbeiterhof, type Arbeiter } from "./arbeiterhof.js";
import type { Auftrag, Startdaten, WorkerBotschaft } from "../worker/akte-worker.js";
import type { Mitteilung } from "../kontrakt/index.js";

const START: Omit<Startdaten, "akteId"> = {
  shareEinsatzOrdner: "/share/einsaetze/E",
  lokalerEinsatzOrdner: "/lokal/E",
  clientId: "1".padEnd(32, "0"),
  einsatzId: "E",
  benutzer: "Bediener",
  anzeigename: "Arbeitsplatz",
  programmversion: "0.0.0",
};

/** Eine Attrappe, die Aufträge sammelt und auf Zuruf antwortet. */
class Attrappe implements Arbeiter {
  readonly empfangen: Auftrag[] = [];
  readonly startdaten: Startdaten;
  #botschaft: ((b: WorkerBotschaft) => void) | undefined;
  #ende: ((grund: string) => void) | undefined;
  beendet = false;

  constructor(start: Startdaten) {
    this.startdaten = start;
  }

  sende(auftrag: Auftrag): void {
    this.empfangen.push(auftrag);
  }
  aufBotschaft(hoerer: (b: WorkerBotschaft) => void): void {
    this.#botschaft = hoerer;
  }
  aufEnde(hoerer: (grund: string) => void): void {
    this.#ende = hoerer;
  }
  async beende(): Promise<void> {
    this.beendet = true;
  }

  antworte(nummer: number, wert: unknown): void {
    this.#botschaft?.({ art: "antwort", nummer, wert });
  }
  scheitere(nummer: number, meldung: string): void {
    this.#botschaft?.({ art: "fehler", nummer, meldung });
  }
  teileMit(mitteilung: Mitteilung): void {
    this.#botschaft?.({ art: "mitteilung", mitteilung });
  }
  stirb(grund: string): void {
    this.#ende?.(grund);
  }
}

function baueHof(): {
  hof: Arbeiterhof;
  attrappen: Attrappe[];
  mitteilungen: Mitteilung[];
} {
  const attrappen: Attrappe[] = [];
  const mitteilungen: Mitteilung[] = [];
  const hof = new Arbeiterhof({
    fabrik: (start) => {
      const attrappe = new Attrappe(start);
      attrappen.push(attrappe);
      return attrappe;
    },
    sende: (m) => mitteilungen.push(m),
  });
  return { hof, attrappen, mitteilungen };
}

describe("Arbeiterhof", () => {
  it("vergibt die Akten-Kennung selbst und reicht sie an den Worker durch", () => {
    const { hof, attrappen } = baueHof();
    const erste = hof.starte(START);
    const zweite = hof.starte(START);
    expect([erste, zweite]).toEqual(["akte-1", "akte-2"]);
    expect(attrappen.map((a) => a.startdaten.akteId)).toEqual(["akte-1", "akte-2"]);
  });

  it("ordnet überholende Antworten ihren Aufträgen zu", async () => {
    const { hof, attrappen } = baueHof();
    const akteId = hof.starte(START);
    const attrappe = attrappen[0] as Attrappe;

    const erste = hof.frage(akteId, { art: "undoStapel" });
    const zweite = hof.frage(akteId, { art: "standAnfordern" });
    expect(attrappe.empfangen.map((a) => a.nummer)).toEqual([1, 2]);

    // Verkehrte Reihenfolge — genau der Fall, um den es hier geht.
    attrappe.antworte(2, "zweite");
    attrappe.antworte(1, "erste");
    await expect(erste).resolves.toBe("erste");
    await expect(zweite).resolves.toBe("zweite");
  });

  it("macht aus einem Worker-Fehler eine abgelehnte Zusage", async () => {
    const { hof, attrappen } = baueHof();
    const akteId = hof.starte(START);
    const frage = hof.frage(akteId, { art: "oeffne" });
    (attrappen[0] as Attrappe).scheitere(1, "Der Share ist fort.");
    await expect(frage).rejects.toThrow("Der Share ist fort.");
  });

  it("reicht Mitteilungen unverändert weiter", () => {
    const { hof, attrappen, mitteilungen } = baueHof();
    hof.starte(START);
    (attrappen[0] as Attrappe).teileMit({
      art: "hinweis",
      akteId: "akte-1",
      stufe: "warnung",
      text: "Uhr steht",
    });
    expect(mitteilungen).toEqual([
      { art: "hinweis", akteId: "akte-1", stufe: "warnung", text: "Uhr steht" },
    ]);
  });

  it("lässt einen abgestürzten Thread keine Zusage offen lassen", async () => {
    const { hof, attrappen, mitteilungen } = baueHof();
    const akteId = hof.starte(START);
    const frage = hof.frage(akteId, { art: "oeffne" });
    (attrappen[0] as Attrappe).stirb("Der Arbeitsprozess ist abgebrochen.");
    await expect(frage).rejects.toThrow("Der Arbeitsprozess ist abgebrochen.");
    expect(mitteilungen[0]).toMatchObject({ art: "akteGeschlossen", akteId });
    expect(hof.offeneAkten).toEqual([]);
  });

  it("schließt geordnet: erst der Auftrag, dann der Thread", async () => {
    const { hof, attrappen } = baueHof();
    const akteId = hof.starte(START);
    const attrappe = attrappen[0] as Attrappe;
    const schliessen = hof.schliesse(akteId);
    expect(attrappe.empfangen.at(-1)?.art).toBe("schliesse");
    expect(attrappe.beendet).toBe(false);
    attrappe.antworte(1, null);
    await schliessen;
    expect(attrappe.beendet).toBe(true);
    expect(hof.offeneAkten).toEqual([]);
  });

  it("meldet eine geschlossene Akte nicht ein zweites Mal", async () => {
    const { hof, attrappen, mitteilungen } = baueHof();
    const akteId = hof.starte(START);
    const attrappe = attrappen[0] as Attrappe;
    const schliessen = hof.schliesse(akteId);
    attrappe.antworte(1, null);
    await schliessen;
    attrappe.stirb("Thread beendet");
    expect(mitteilungen.filter((m) => m.art === "akteGeschlossen")).toHaveLength(0);
  });

  it("weist einen Auftrag an eine unbekannte Akte ab", async () => {
    const { hof } = baueHof();
    await expect(hof.frage("akte-9", { art: "oeffne" })).rejects.toThrow("Unbekannte Akte");
  });
});
