/**
 * Der Kern der Einsatzakte in der Speicherschicht.
 *
 * Die volle Abnahme (Export, Reimport, `zustandsHash`) prüfen die Tests der
 * Kommandozeile. Hier steht, was an der Naht hängt: dass der Packer
 * hereingereicht und genau einmal mit Anker vorn und Manifest hinten gerufen
 * wird, dass `praesenz/` nicht mitfährt und dass ein zweites Ablegen die
 * Datei ersetzt statt an sie anzuhängen.
 */

import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EINSATZ_UNTERORDNER } from "./index.js";
import { MANIFEST_DATEI, legeArchivAb, packeAkte, type Akteneintrag } from "./aktenarchiv.js";
import { legeEinsatzAn } from "./einsatzordner.js";
import { knotenDateisystem } from "./knotenDateisystem.js";
import { Einsatzablage } from "./pfade.js";

let wurzel: string;

beforeEach(async () => {
  wurzel = await fsp.mkdtemp(path.join(os.tmpdir(), "s1-aktenarchiv-"));
});

afterEach(async () => {
  await fsp.rm(wurzel, { recursive: true, force: true });
});

async function leererEinsatz(): Promise<string> {
  const ablage = new Einsatzablage(path.join(wurzel, "share"), path.join(wurzel, "lokal"));
  await fsp.mkdir(ablage.share, { recursive: true });
  await legeEinsatzAn(
    knotenDateisystem(),
    ablage,
    { einsatzId: "2026-10-30_test_ab12cd", name: "Test", datum: "2026-10-30", angelegtAm: "2026-10-30T08:00:00.000Z", angelegtVon: "aabbccdd" },
    EINSATZ_UNTERORDNER,
  );
  await fsp.writeFile(path.join(ablage.share, "ausgaben", "druck.html"), "<p>Druck</p>");
  await fsp.writeFile(path.join(ablage.share, "praesenz", "aabbccdd.json"), "{}");
  return ablage.share;
}

describe("packeAkte", () => {
  it("reicht die Einträge an den Packer und legt das Manifest ans Ende", async () => {
    const ordner = await leererEinsatz();
    const gesehen: Akteneintrag[][] = [];
    const zeitpunkt = new Date("2026-10-30T12:00:00.000Z");
    const { bytes, manifest } = await packeAkte(knotenDateisystem(), ordner, zeitpunkt, (eintraege, optionen) => {
      gesehen.push([...eintraege]);
      expect(optionen.zeitpunkt).toBe(zeitpunkt);
      return new Uint8Array([1, 2, 3]);
    });
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(gesehen).toHaveLength(1);
    const pfade = (gesehen[0] ?? []).map((e) => e.pfad);
    expect(pfade[0]).toBe("einsatz.json");
    expect(pfade.at(-1)).toBe(MANIFEST_DATEI);
    expect(pfade).toContain("ausgaben/druck.html");
    // Präsenz ist Betriebszustand, keine Überlieferung (§6.4).
    expect(pfade.some((pfad) => pfad.startsWith("praesenz"))).toBe(false);
    expect(manifest.einsatzId).toBe("2026-10-30_test_ab12cd");
    expect(manifest.dateien.map((d) => d.pfad)).toEqual(pfade.slice(0, -1));
  });
});

describe("legeArchivAb", () => {
  it("ersetzt ein vorhandenes Archiv, statt anzuhängen", async () => {
    const datei = path.join(wurzel, "ziel", "akte.zip");
    await legeArchivAb(knotenDateisystem(), datei, new Uint8Array([1, 2, 3, 4]));
    await legeArchivAb(knotenDateisystem(), datei, new Uint8Array([9]));
    expect(new Uint8Array(await fsp.readFile(datei))).toEqual(new Uint8Array([9]));
  });
});
