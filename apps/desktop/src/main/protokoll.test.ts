/**
 * Prüfungen des Protokolls (M2.2, erweitert in M7.3).
 *
 * Der Ringpuffer wird geprüft, die Datei nur beiläufig: Sie ist seit M2.2 im
 * Betrieb, und ihr Verhalten bei voller Platte ist ausdrücklich „still“ — was
 * sich schlecht behaupten und schlecht prüfen lässt. Der Puffer dagegen ist
 * das, was die Diagnoseansicht zeigt, und er darf weder wachsen noch die
 * Reihenfolge verlieren.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { PROTOKOLL_RINGPUFFER, Protokoll } from "./protokoll.js";

const wegwerf: string[] = [];
afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

function baue(): Protokoll {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-protokoll-"));
  wegwerf.push(wurzel);
  return new Protokoll(path.join(wurzel, "s1-control.log"));
}

describe("Der Ringpuffer (M7.3)", () => {
  it("gibt die jüngste Meldung zuerst", () => {
    const protokoll = baue();
    protokoll.schreibe("info", "erste", "2026-09-10T10:00:00.000Z");
    protokoll.schreibe("fehler", "zweite", "2026-09-10T10:00:01.000Z");

    expect(protokoll.letzteMeldungen.map((z) => z.text)).toEqual(["zweite", "erste"]);
  });

  it("wächst nicht über seine Grenze hinaus", () => {
    // Der Grund für die Grenze: Ein Arbeitsplatz läuft eine Schicht lang, und
    // ein Puffer ohne Grenze wüchse mit der Zahl der Störungen — genau das,
    // was §3.1 dem Zustand verbietet und was hier nicht anders ist.
    const protokoll = baue();
    for (let i = 0; i < PROTOKOLL_RINGPUFFER + 20; i += 1) {
      protokoll.schreibe("info", `Meldung ${String(i)}`);
    }

    const gehalten = protokoll.letzteMeldungen;
    expect(gehalten).toHaveLength(PROTOKOLL_RINGPUFFER);
    expect(gehalten[0]?.text).toBe(`Meldung ${String(PROTOKOLL_RINGPUFFER + 19)}`);
  });

  it("hält keine Zeilenumbrüche — sie zerrissen die Datei und die Tabelle", () => {
    const protokoll = baue();
    protokoll.schreibe("warnung", "erste Zeile\nzweite Zeile");

    expect(protokoll.letzteMeldungen[0]?.text).toBe("erste Zeile zweite Zeile");
  });

  it("gibt eine Kopie heraus, in die niemand hineinschreibt", () => {
    const protokoll = baue();
    protokoll.schreibe("info", "eine");
    const erste = protokoll.letzteMeldungen;
    protokoll.schreibe("info", "zweite");

    expect(erste).toHaveLength(1);
    expect(protokoll.letzteMeldungen).toHaveLength(2);
  });

  it("schreibt dieselbe Meldung auch in die Datei", async () => {
    const protokoll = baue();
    protokoll.schreibe("fehler", "etwas ging schief", "2026-09-10T10:00:00.000Z");
    await protokoll.ruhe();

    expect(readFileSync(protokoll.datei, "utf8")).toBe(
      "2026-09-10T10:00:00.000Z\tFEHLER\tetwas ging schief\n",
    );
  });
});
