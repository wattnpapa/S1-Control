/**
 * Das Handbuch ist mit den Listen im Baum im Gleichstand (M8.2).
 *
 * Vier Abschnitte sind erzeugt, und für jeden gilt derselbe Grund wie bei der
 * Kurzanleitung: Ein Erzeugungsskript ohne Test ist ein Vorschlag. Niemand
 * ruft es auf, wenn im Renderer ein Kürzel dazukommt.
 *
 * Der Test vergleicht **erzeugt gegen eingecheckt**. Schlägt er fehl, ist das
 * Handbuch veraltet und nicht der Quelltext falsch; die Meldung nennt den Weg.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AKUELI, ANSICHTEN, KUERZEL, STOERFAELLE, kuerzelText } from "@s1/domaene";
import {
  akueliMarkdown,
  ansichtenMarkdown,
  mitHandbuchabschnitten,
  tastenkarteMarkdown,
  zwischenMarken,
} from "@s1/ausgaben";

const DATEI = path.resolve(import.meta.dirname, "..", "docs", "v2", "HANDBUCH.md");
const INHALT = readFileSync(DATEI, "utf8");

describe("Handbuch", () => {
  it("trägt den Stand aller vier Listen", () => {
    expect(mitHandbuchabschnitten(INHALT), "npm run doku:handbuch ausführen").toBe(INHALT);
  });

  it("nennt jedes Tastenkürzel in seiner Schreibweise", () => {
    for (const eintrag of KUERZEL) {
      expect(INHALT, eintrag.name).toContain(`| ${kuerzelText(eintrag)} |`);
    }
  });

  it("nennt jede Ansicht und jeden Störfall", () => {
    for (const ansicht of ANSICHTEN) expect(INHALT, ansicht.kennung).toContain(ansicht.wozu);
    for (const fall of STOERFAELLE) expect(INHALT, fall.kennung).toContain(fall.titel);
  });

  it("nennt jede Abkürzung", () => {
    for (const eintrag of AKUELI) {
      expect(INHALT, eintrag.kuerzel).toContain(`| ${eintrag.kuerzel} | ${eintrag.bedeutung} |`);
    }
  });

  it("setzt die Gruppen der Abkürzungsliste als Überschrift und nicht als Schlüssel", () => {
    // „EINHEITEN" als Zwischentitel wäre gebrüllt.
    expect(akueliMarkdown()).toContain("### Fahrzeuge und Geräte");
    expect(akueliMarkdown()).not.toContain("### FAHRZEUGE_UND_GERAETE");
  });

  it("erzeugt Blöcke, die mit genau einem Zeilenumbruch enden", () => {
    for (const block of [tastenkarteMarkdown(), ansichtenMarkdown(), akueliMarkdown()]) {
      expect(block.endsWith("\n")).toBe(true);
      expect(block.endsWith("\n\n")).toBe(false);
    }
  });

  it("weist ein Dokument ohne die passenden Marken zurück", () => {
    expect(() => zwischenMarken("# Ohne\n", "<!-- A -->", "<!-- B -->", "x")).toThrow(/Marken/u);
  });

  it("ist beim zweiten Erneuern unverändert", () => {
    // Der Fehler, den der erste Entwurf hatte: Ein Block mit zwei
    // Zeilenumbrüchen am Ende ließ die Datei bei jedem Lauf um eine Zeile
    // wachsen, und der Gleichstandstest wäre dann nie zweimal grün gewesen.
    const einmal = mitHandbuchabschnitten(INHALT);
    expect(mitHandbuchabschnitten(einmal)).toBe(einmal);
  });
});
