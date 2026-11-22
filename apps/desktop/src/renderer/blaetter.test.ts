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
  it("stellt der Führungsstelle (Vorgabe) S1, Nachrichten, Funkplan, S4 und Exporte ins Band, den Rest unter „Mehr“", () => {
    const zuschnitt = reiterFuer("fuehrungsstelle");
    expect(titel(zuschnitt.imBand)).toEqual(["S1", "Nachrichten", "Funkplan", "S4", "Exporte"]);
    expect(titel(zuschnitt.unterMehr)).toEqual(["Übersicht", "Fachlage", "Eingangskorb", "Führungsstelle", "Kosten", "Einsatztagebuch"]);
    expect(reiterFuer()).toEqual(zuschnitt);
  });

  it("stellt der Fernmeldezentrale Nachrichten und Funkplan voran", () => {
    const zuschnitt = reiterFuer("fernmeldezentrale");
    expect(titel(zuschnitt.imBand)).toEqual(["Nachrichten", "Funkplan", "S1", "Einsatztagebuch"]);
    expect(titel(zuschnitt.unterMehr)).toEqual(["Übersicht", "Fachlage", "Eingangskorb", "Führungsstelle", "S4", "Kosten", "Exporte"]);
  });

  it("stellt der Versorgung (S4) die Versorgung voran", () => {
    const zuschnitt = reiterFuer("versorgung");
    expect(titel(zuschnitt.imBand)).toEqual(["S4", "S1", "Exporte"]);
    expect(titel(zuschnitt.unterMehr)).toEqual(["Übersicht", "Fachlage", "Eingangskorb", "Nachrichten", "Führungsstelle", "Funkplan", "Kosten", "Einsatztagebuch"]);
  });

  it("stellt der Leitung / dem Stab die Übersicht voran, Anforderungen und Tagebuch im Band (Stab-Review)", () => {
    const zuschnitt = reiterFuer("leitung");
    expect(titel(zuschnitt.imBand)).toEqual(["Übersicht", "Fachlage", "Nachrichten", "S1", "Eingangskorb", "Einsatztagebuch", "Exporte"]);
    expect(titel(zuschnitt.unterMehr)).toEqual(["Führungsstelle", "Funkplan", "S4", "Kosten"]);
  });

  it("zeigt bei „Alle Blätter“ jedes Blatt in der bisherigen Reihenfolge und kein „Mehr“", () => {
    const zuschnitt = reiterFuer("alle");
    expect(titel(zuschnitt.imBand)).toEqual([
      "S1",
      "Übersicht",
      "Fachlage",
      "Eingangskorb",
      "Nachrichten",
      "Führungsstelle",
      "Funkplan",
      "S4",
      "Kosten",
      "Exporte",
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

describe("Die Auswahl der Profile", () => {
  it("führt jedes Profil des Kontrakts genau einmal", async () => {
    const { PROFILREIHENFOLGE } = await import("./Profilwahl.js");
    expect([...PROFILREIHENFOLGE].sort()).toEqual([...PROFILE].sort());
  });
});
