/**
 * Reiter je Profil (Entwurf „Entlastung", 3.2, Schnitt E3).
 *
 * Geprüft wird die Tabelle des Konzepts und die Zusage dahinter: Das Profil
 * ist ein Zuschnitt und kein Recht — jedes Blatt ist in jedem Profil genau
 * einmal erreichbar, im Band oder unter „Mehr", die Diagnose im Fenstermenü.
 */

import { describe, expect, it } from "vitest";

import { PROFILE } from "../kontrakt/index.js";
import { BLAETTER, reiterFuer } from "./blaetter.js";

const titel = (liste: readonly { readonly titel: string }[]): string[] => liste.map((eintrag) => eintrag.titel);

describe("Reiter je Profil", () => {
  it("stellt der Führungsstelle (Vorgabe) Lage, Eingang, Führungsstelle, Ausgaben und Tagebuch ins Band", () => {
    const zuschnitt = reiterFuer("fuehrungsstelle");
    expect(titel(zuschnitt.imBand)).toEqual(["Lage", "Eingang", "Führungsstelle", "Ausgaben", "Einsatztagebuch"]);
    expect(titel(zuschnitt.unterMehr)).toEqual(["Funkplan", "Versorgung", "Kosten"]);
    expect(reiterFuer()).toEqual(zuschnitt);
  });

  it("stellt der Vermeldezentrale den Funkplan voran", () => {
    const zuschnitt = reiterFuer("vermeldezentrale");
    expect(titel(zuschnitt.imBand)).toEqual(["Funkplan", "Lage", "Einsatztagebuch"]);
    expect(titel(zuschnitt.unterMehr)).toEqual(["Eingang", "Führungsstelle", "Versorgung", "Kosten", "Ausgaben"]);
  });

  it("stellt der Versorgung (S4) die Versorgung voran", () => {
    const zuschnitt = reiterFuer("versorgung");
    expect(titel(zuschnitt.imBand)).toEqual(["Versorgung", "Lage", "Ausgaben"]);
    expect(titel(zuschnitt.unterMehr)).toEqual(["Eingang", "Führungsstelle", "Funkplan", "Kosten", "Einsatztagebuch"]);
  });

  it("zeigt bei „Alle Blätter“ jedes Blatt in der bisherigen Reihenfolge und kein „Mehr“", () => {
    const zuschnitt = reiterFuer("alle");
    expect(titel(zuschnitt.imBand)).toEqual([
      "Lage",
      "Eingang",
      "Führungsstelle",
      "Funkplan",
      "Versorgung",
      "Kosten",
      "Ausgaben",
      "Einsatztagebuch",
    ]);
    expect(zuschnitt.unterMehr).toEqual([]);
  });

  it.each(PROFILE)("macht im Profil „%s“ jedes Blatt genau einmal erreichbar, die Diagnose über das Fenstermenü", (profil) => {
    const { imBand, unterMehr } = reiterFuer(profil);
    const erreichbar = [...imBand, ...unterMehr].map((eintrag) => eintrag.schluessel);
    expect(new Set(erreichbar).size).toBe(erreichbar.length);
    const imFenstermenue = BLAETTER.filter((eintrag) => eintrag.imFenstermenue === true).map((eintrag) => eintrag.schluessel);
    expect(imFenstermenue).toEqual(["diagnose"]);
    expect([...erreichbar, ...imFenstermenue].sort()).toEqual(BLAETTER.map((eintrag) => eintrag.schluessel).sort());
  });
});
