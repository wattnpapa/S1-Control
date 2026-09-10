/**
 * Tests zum Logistikblatt (M5.1).
 *
 * Die **Zahlen** prüfen die Goldfiles unter `bau/ausgaben/` gegen die
 * Prüflage. Hier stehen die Aussagen, die ein Goldfile nicht macht: dass die
 * getrennte Zeile getrennt bleibt, dass die Rechnung hinter „Männl.“ im Blatt
 * genannt wird, und dass die Wertekopie eine lesbare Tabelle ist.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere } from "../../domaene/src/fold.js";
import { prueflageEreignisse } from "../../domaene/src/pruefhilfen/pruefage.js";
import type { Zustand } from "../../domaene/src/zustand.js";

import { LOG_FUSSNOTE, logAlsHtml } from "./log.js";
import { logFreiAlsXlsx } from "./xlsx.js";
import { liesZip } from "./zip.js";

const KOPF = { datum: "2026-09-08", einsatzName: "Übung Weser-Ems", stand: "Stand: 08.09.2026, 08:00" };

function lage(): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), prueflageEreignisse()));
}

function blatt(bytes: Uint8Array): string {
  const eintrag = liesZip(bytes).find((e) => e.pfad === "xl/worksheets/sheet1.xml");
  if (eintrag === undefined) throw new Error("kein Blatt");
  return new TextDecoder().decode(eintrag.bytes);
}

describe("Das Blatt Log als HTML", () => {
  it("hält die angeforderten Kräfte aus der Summenzeile heraus", () => {
    const html = logAlsHtml(lage(), KOPF);
    const summe = html.indexOf("summenzeile");
    const getrennt = html.indexOf("Angefordert / Anmarsch");
    // Die getrennte Zeile steht **unter** der Summe: Wer für angeforderte
    // Kräfte mitkocht, hat am Abend zu viel Essen (§4.3, Z. 36 und 38).
    expect(summe).toBeGreaterThan(0);
    expect(getrennt).toBeGreaterThan(summe);
  });

  it("nennt die Rechnung hinter „Männl.“ im Blatt", () => {
    const html = logAlsHtml(lage(), KOPF);
    expect(html).toContain("Gesamt − weiblich − divers");
    expect(LOG_FUSSNOTE).toContain("noch nicht entschieden");
  });

  it("blendet Bereiche ohne Kräfte aus und führt sie auf Verlangen mit", () => {
    expect(logAlsHtml(lage(), KOPF)).not.toContain("EA Reserve");
    expect(logAlsHtml(lage(), KOPF, { mitLeeren: true })).toContain("EA Reserve");
  });

  it("druckt quer — vierzehn Spalten passen hoch nicht lesbar nebeneinander", () => {
    expect(logAlsHtml(lage(), KOPF)).toContain("size: A4 landscape");
  });
});

describe("LogFrei als XLSX", () => {
  it("enthält genau die fünf Teile, die das Format verlangt", () => {
    expect(liesZip(logFreiAlsXlsx(lage())).map((e) => e.pfad)).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/worksheets/sheet1.xml",
    ]);
  });

  it("schreibt Zahlen als Zahlen — die Kopie ist zum Weiterrechnen da", () => {
    const xml = blatt(logFreiAlsXlsx(lage()));
    // Eine Zahl steht ohne `t="inlineStr"` und mit `<v>`; eine Textzahl ließe
    // sich in Excel nicht summieren, und genau dafür ist dieses Blatt da.
    expect(xml).toMatch(/<c r="F\d+"><v>\d+<\/v><\/c>/);
  });

  it("trägt die Formel hinter „Männl.“ als letzte Zeile mit", () => {
    expect(blatt(logFreiAlsXlsx(lage()))).toContain("Gesamt − weiblich − divers");
  });

  it("heißt am Reiter LogFrei", () => {
    const mappe = liesZip(logFreiAlsXlsx(lage())).find((e) => e.pfad === "xl/workbook.xml");
    expect(new TextDecoder().decode((mappe as { bytes: Uint8Array }).bytes)).toContain(
      'name="LogFrei"',
    );
  });

  it("bleibt bei gleichem Zeitpunkt bitgleich", () => {
    const zeitpunkt = new Date(Date.UTC(2026, 8, 8, 6));
    const eins = logFreiAlsXlsx(lage(), { zeitpunkt });
    const zwei = logFreiAlsXlsx(lage(), { zeitpunkt });
    expect(Array.from(zwei)).toEqual(Array.from(eins));
  });
});
