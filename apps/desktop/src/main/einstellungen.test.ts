/**
 * Die Einstellungsdatei des Arbeitsplatzes (M2.2).
 *
 * Geprüft wird der Weg über einen Neustart: Was `#setzeEinstellungen`
 * schreibt, muss `liesArbeitsplatz` beim nächsten Start wiederfinden. Eine
 * Einstellung, die nur bis zum Beenden hält, ist keine.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { liesArbeitsplatz, schreibeArbeitsplatz } from "./einstellungen.js";

const wegwerf: string[] = [];

afterAll(() => {
  for (const ordner of wegwerf) rmSync(ordner, { recursive: true, force: true });
});

function datei(): string {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-einstellungen-"));
  wegwerf.push(wurzel);
  return path.join(wurzel, "profil", "einstellungen.json");
}

describe("liesArbeitsplatz", () => {
  it("findet Betriebsart und Erscheinungsbild nach einem Neustart wieder", async () => {
    const ziel = datei();
    await schreibeArbeitsplatz(ziel, {
      sharePfad: "/share",
      anzeigename: "Führungsstelle 1",
      betriebsart: "meldekopf",
      theme: "nacht",
      clientId: "aabbccddeeff00112233445566778899",
    });

    const gelesen = await liesArbeitsplatz(ziel);
    expect(gelesen.betriebsart).toBe("meldekopf");
    expect(gelesen.theme).toBe("nacht");
    expect(gelesen.clientId).toBe("aabbccddeeff00112233445566778899");
  });

  it("lässt beides weg, wenn die Datei nichts dazu sagt", async () => {
    const ziel = datei();
    await fsp.mkdir(path.dirname(ziel), { recursive: true });
    writeFileSync(
      ziel,
      JSON.stringify({ sharePfad: "/share", anzeigename: "Alt", clientId: "0".repeat(32) }),
      "utf8",
    );

    const gelesen = await liesArbeitsplatz(ziel);
    expect(gelesen.betriebsart).toBeUndefined();
    expect(gelesen.theme).toBeUndefined();
    expect(gelesen.sharePfad).toBe("/share");
  });

  it("startet mit den Vorbelegungen, wenn die Datei unlesbar ist", async () => {
    const ziel = datei();
    await fsp.mkdir(path.dirname(ziel), { recursive: true });
    writeFileSync(ziel, "{ das ist kein JSON", "utf8");

    const gelesen = await liesArbeitsplatz(ziel, "/vorbelegt");
    expect(gelesen.sharePfad).toBe("/vorbelegt");
    expect(gelesen.anzeigename).toBe("Arbeitsplatz");
    expect(gelesen.clientId).toMatch(/^[0-9a-f]{32}$/);
  });
});
