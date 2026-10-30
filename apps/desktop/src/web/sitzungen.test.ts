/**
 * Die Sitzungen der Anmeldung gegen eine echte Datei.
 *
 * Geprueft wird, was im Betrieb still falsch sein koennte: dass eine Sitzung
 * gleitend ablaeuft, dass ein Neustart sie behaelt, dass die Datei keinen
 * Schluessel verraet und dass das Aufraeumen nur Abgelaufenes trifft.
 */

import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FORTSCHREIBEN_MS, SITZUNG_FORM, Sitzungen } from "./sitzungen.js";

const STUNDE = 3_600_000;
const wegwerf: string[] = [];
afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

function werkstatt(): { datei: string; uhr: { jetzt: number }; baue(): Sitzungen } {
  const ordner = mkdtempSync(path.join(os.tmpdir(), "s1-sitzungen-"));
  wegwerf.push(ordner);
  const datei = path.join(ordner, "daten", "sitzungen.json");
  const uhr = { jetzt: Date.parse("2026-10-30T08:00:00Z") };
  return {
    datei,
    uhr,
    baue: () => new Sitzungen({ datei, lebensdauerMs: 12 * STUNDE, zeit: () => uhr.jetzt }),
  };
}

describe("Sitzungen", () => {
  it("legt eine Sitzung an, die gilt, und speichert nur den Hash", async () => {
    const w = werkstatt();
    const sitzungen = w.baue();
    await sitzungen.lade();
    const schluessel = await sitzungen.lege();
    expect(schluessel).toMatch(SITZUNG_FORM);
    expect(await sitzungen.gilt(schluessel)).toBe(true);
    const inhalt = readFileSync(w.datei, "utf8");
    expect(inhalt).not.toContain(schluessel);
    expect(Object.keys(JSON.parse(inhalt) as object)).toHaveLength(1);
    // Kein Rest der temporären Datei.
    expect(readdirSync(path.dirname(w.datei))).toEqual(["sitzungen.json"]);
  });

  it("weist unbekannte, fehlende und missgeformte Schlüssel ab", async () => {
    const sitzungen = werkstatt().baue();
    await sitzungen.lade();
    expect(await sitzungen.gilt(undefined)).toBe(false);
    expect(await sitzungen.gilt("x".repeat(32))).toBe(false);
    expect(await sitzungen.gilt("../../etc/passwd")).toBe(false);
  });

  it("läuft gleitend ab der letzten Nutzung ab", async () => {
    const w = werkstatt();
    const sitzungen = w.baue();
    const schluessel = await sitzungen.lege();
    w.uhr.jetzt += 11 * STUNDE;
    expect(await sitzungen.gilt(schluessel)).toBe(true);
    // 11 h nach der letzten Nutzung, 22 h nach dem Anlegen: noch gültig.
    w.uhr.jetzt += 11 * STUNDE;
    expect(await sitzungen.gilt(schluessel)).toBe(true);
    w.uhr.jetzt += 12 * STUNDE + 1;
    expect(await sitzungen.gilt(schluessel)).toBe(false);
    expect(sitzungen.anzahl).toBe(0);
  });

  it("schreibt die letzte Nutzung nicht bei jedem Ruf fort", async () => {
    const w = werkstatt();
    const sitzungen = w.baue();
    const schluessel = await sitzungen.lege();
    const vorher = readFileSync(w.datei, "utf8");
    w.uhr.jetzt += FORTSCHREIBEN_MS - 1;
    await sitzungen.gilt(schluessel);
    expect(readFileSync(w.datei, "utf8")).toBe(vorher);
    w.uhr.jetzt += 2;
    await sitzungen.gilt(schluessel);
    expect(readFileSync(w.datei, "utf8")).not.toBe(vorher);
  });

  it("behält gültige Sitzungen über einen Neustart und räumt dabei Abgelaufenes ab", async () => {
    const w = werkstatt();
    const erste = w.baue();
    const alt = await erste.lege();
    w.uhr.jetzt += 6 * STUNDE;
    const frisch = await erste.lege();

    w.uhr.jetzt += 7 * STUNDE;
    const zweite = w.baue();
    await zweite.lade();
    expect(zweite.anzahl).toBe(1);
    expect(await zweite.gilt(frisch)).toBe(true);
    expect(await zweite.gilt(alt)).toBe(false);
  });

  it("räumt periodisch nur Abgelaufenes auf", async () => {
    const w = werkstatt();
    const sitzungen = w.baue();
    await sitzungen.lege();
    w.uhr.jetzt += 13 * STUNDE;
    const bleibt = await sitzungen.lege();
    expect(await sitzungen.raeumeAuf()).toBe(1);
    expect(await sitzungen.raeumeAuf()).toBe(0);
    expect(await sitzungen.gilt(bleibt)).toBe(true);
  });

  it("entfernt eine Sitzung beim Abmelden", async () => {
    const w = werkstatt();
    const sitzungen = w.baue();
    const schluessel = await sitzungen.lege();
    await sitzungen.entferne(schluessel);
    expect(await sitzungen.gilt(schluessel)).toBe(false);
    const neu = w.baue();
    await neu.lade();
    expect(neu.anzahl).toBe(0);
  });

  it("startet mit einer kaputten Datei leer, statt nicht zu starten", async () => {
    const w = werkstatt();
    await w.baue().lege();
    writeFileSync(w.datei, "{ kaputt");
    const sitzungen = w.baue();
    await sitzungen.lade();
    expect(sitzungen.anzahl).toBe(0);
  });

  it("verliert bei gleichzeitigen Anmeldungen keine Sitzung", async () => {
    const w = werkstatt();
    const sitzungen = w.baue();
    const schluessel = await Promise.all(Array.from({ length: 10 }, () => sitzungen.lege()));
    const neu = w.baue();
    await neu.lade();
    expect(neu.anzahl).toBe(10);
    for (const s of schluessel) expect(await neu.gilt(s)).toBe(true);
  });
});
