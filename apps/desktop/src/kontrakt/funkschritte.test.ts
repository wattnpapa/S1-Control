/**
 * Die Bedienschritte des Funkplans als reine Funktionen.
 *
 * Gemessen wird der Entwurf: welche Art, welcher Vorwert, ob geprüft wird —
 * und dass die Zelle im Blatt „Funkplan" denselben Entwurf baut wie die Zelle
 * der Einheitentabelle.
 */

import { describe, expect, it } from "vitest";

import { projektion, type Spalte } from "@s1/domaene";

import { inlineEntwurf } from "./bedienschritte.js";
import {
  erreichbarkeitUeberschreiben,
  funkhinweisDerEinheit,
  funkrufnameUeberschreiben,
  rufgruppeAnlegen,
  rufgruppeAufgeloest,
  rufgruppeDerEinheit,
  rufgruppeGeaendert,
  rufgruppeWiederhergestellt,
  rufgruppenwahl,
  weitereRufgruppenDerEinheit,
} from "./funkschritte.js";
import { zEntwurf } from "./index.js";

describe("Die Bedienschritte des Funkplans", () => {
  it("legt eine Rufgruppe mit den angegebenen Feldern an", () => {
    const entwurf = rufgruppeAnlegen({ rufgruppeId: "RG-1", betriebsart: "DMO", name: "DMO 310", gateway: "Heros Varel 25/10" });
    expect(entwurf).toEqual({ typ: "RufgruppeAngelegt", nutzlast: { rufgruppeId: "RG-1", betriebsart: "DMO", name: "DMO 310", gateway: "Heros Varel 25/10" } });
    expect(zEntwurf.safeParse(entwurf).success).toBe(true);
  });

  it("ändert ein Feld mit gesehenem Vorwert und Prüfung", () => {
    expect(rufgruppeGeaendert("RG-1", "zweck", null, "Führung")).toEqual({
      typ: "RufgruppeGeaendert",
      nutzlast: { rufgruppeId: "RG-1", feld: "zweck" },
      vorher: null,
      neu: "Führung",
      vorwertPruefen: true,
    });
  });

  it("löst mit Grund auf und stellt wieder her", () => {
    expect(rufgruppeAufgeloest("RG-1", "Netz wieder da")).toMatchObject({ typ: "RufgruppeAufgeloest", neu: true, grund: "Netz wieder da" });
    expect(rufgruppeWiederhergestellt("RG-1")).toMatchObject({ typ: "RufgruppeWiederhergestellt", vorher: true, neu: false });
  });

  it("baut für die Rufgruppe der Einheit denselben Entwurf wie die Zelle der Einheitentabelle", () => {
    const spalte = projektion.spalte("rufgruppe");
    if (spalte === undefined) throw new Error("Spalte Rufgruppe fehlt");
    expect(rufgruppeDerEinheit("E1", "RG-1", "RG-2")).toEqual({ ...inlineEntwurf(spalte, "E1", "RG-1", "RG-2"), vorwertPruefen: true });
    expect(rufgruppeDerEinheit("E1", "RG-1", null)).toMatchObject({ typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: "E1" }, neu: null });
  });

  it("macht aus einer Zellwahl Setzen, Leeren oder nichts", () => {
    expect(rufgruppenwahl("E1", undefined, "RG-1")).toMatchObject({ vorher: null, neu: "RG-1" });
    expect(rufgruppenwahl("E1", "RG-1", "")).toMatchObject({ vorher: "RG-1", neu: null });
    expect(rufgruppenwahl("E1", "RG-1", "RG-1")).toBeUndefined();
    expect(rufgruppenwahl("E1", undefined, "")).toBeUndefined();
  });
});

describe("Die Bedienschritte des Funkplans an der Einheit (F2)", () => {
  const spalte = (schluessel: string): Spalte => {
    const gefunden = projektion.spalte(schluessel);
    if (gefunden === undefined) throw new Error(`Spalte ${schluessel} fehlt`);
    return gefunden;
  };

  it("schreibt den Funkhinweis wie die Zelle der Einheitentabelle; leer wird null, unverändert nichts", () => {
    expect(funkhinweisDerEinheit("E1", undefined, " nachts nur Telefon ")).toEqual({ ...inlineEntwurf(spalte("funkhinweis"), "E1", null, "nachts nur Telefon"), vorwertPruefen: true });
    expect(funkhinweisDerEinheit("E1", "alt", "")).toMatchObject({ typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: "E1", feld: "funkHinweis" }, vorher: "alt", neu: null });
    expect(funkhinweisDerEinheit("E1", "alt", "alt ")).toBeUndefined();
    expect(funkhinweisDerEinheit("E1", undefined, "  ")).toBeUndefined();
  });

  it("überschreibt die Erreichbarkeit über die Spalte und nimmt den Override mit leer zurück", () => {
    expect(erreichbarkeitUeberschreiben("E1", undefined, "Funk Kanal 31")).toEqual({ ...inlineEntwurf(spalte("erreichbarkeit"), "E1", null, "Funk Kanal 31"), vorwertPruefen: true });
    expect(erreichbarkeitUeberschreiben("E1", "Funk Kanal 31", "")).toMatchObject({ nutzlast: { feld: "erreichbarkeitOverride" }, vorher: "Funk Kanal 31", neu: null });
  });

  it("überschreibt den Funkrufnamen als Stammdatum; leer heißt wieder Ableitung", () => {
    const entwurf = funkrufnameUeberschreiben("E1", undefined, "Heros Oldenburg 21/10");
    expect(entwurf).toEqual({ typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: "E1", feld: "funkrufnameOverride" }, vorher: null, neu: "Heros Oldenburg 21/10", vorwertPruefen: true });
    expect(zEntwurf.safeParse(entwurf).success).toBe(true);
    expect(funkrufnameUeberschreiben("E1", "Heros Oldenburg 21/10", "")).toMatchObject({ vorher: "Heros Oldenburg 21/10", neu: null });
    expect(funkrufnameUeberschreiben("E1", undefined, "")).toBeUndefined();
  });

  it("schreibt die weiteren Rufgruppen als ganze Liste, ohne Doppelte; leer wird null", () => {
    const entwurf = weitereRufgruppenDerEinheit("E1", [], ["R1", "R2", "R1"]);
    expect(entwurf).toEqual({ typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: "E1", feld: "weitereRufgruppenIds" }, vorher: null, neu: ["R1", "R2"], vorwertPruefen: true });
    expect(zEntwurf.safeParse(entwurf).success).toBe(true);
    expect(weitereRufgruppenDerEinheit("E1", ["R1", "R2"], [])).toMatchObject({ vorher: ["R1", "R2"], neu: null });
    expect(weitereRufgruppenDerEinheit("E1", ["R1", "R2"], ["R1", "R2"])).toBeUndefined();
    // Eine andere Reihenfolge ist eine andere Liste.
    expect(weitereRufgruppenDerEinheit("E1", ["R1", "R2"], ["R2", "R1"])).toMatchObject({ neu: ["R2", "R1"] });
  });
});
