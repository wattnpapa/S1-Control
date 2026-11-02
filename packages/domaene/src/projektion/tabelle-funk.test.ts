/**
 * Prüffälle zur Spaltengruppe FUNK der Einheitentabelle
 * (KONZEPT-FUNKPLAN.md §6, Option 5c).
 *
 * Die Gruppe ist additiv: Sie steht am Ende, ist in der Vorbelegung
 * ausgeblendet, und ihre Auswahlspalte nimmt die Werte aus dem Zustand statt
 * aus einer festen Liste.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, einsatzAngelegt, feldEreignis, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import type { EinheitZustand, Zustand } from "../zustand.js";
import { SICHTBARE_GRUPPEN_VORBELEGUNG, SPALTENGRUPPEN, auswahlwerte, spalte, spaltenDerGruppen, tabellenzeile, type Spalte } from "./tabelle.js";

let n = 0;
function h(): ReturnType<typeof hlc> {
  n += 1;
  return hlc(n * 1000, 0, "a");
}

function grundlage(): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    einheitGemeldet(h(), n, { einheitId: "E1", abschnittId: "EA1", bezeichnung: "B 1", organisation: "THW", ebene: "GRUPPE", staerke: staerke(0, 1, 8), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ" }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R2", betriebsart: "TMO", name: "THW_OL_EA1", reihenfolge: 2 }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_FUE", reihenfolge: 1 }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R3", betriebsart: "DMO", name: "DMO 310" }),
  ];
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

function zeile(z: Zustand): ReturnType<typeof tabellenzeile> {
  return tabellenzeile(z, z.einheiten["E1"] as EinheitZustand);
}

describe("Die Spaltengruppe FUNK", () => {
  it("steht als sechste Gruppe am Ende und ist in der Vorbelegung ausgeblendet", () => {
    expect(SPALTENGRUPPEN).toEqual(["GRUNDDATEN", "STAERKE", "RESSOURCENPLANUNG", "LOGISTIKDATEN", "KOSTENUEBERSICHT", "FUNK"]);
    expect(SICHTBARE_GRUPPEN_VORBELEGUNG).not.toContain("FUNK");
  });

  it("führt Rufgruppe, Funkrufname, Funkhinweis und letzten Kontakt; die Erreichbarkeit bleibt in der Ressourcenplanung", () => {
    expect(spaltenDerGruppen(["FUNK"]).map((sp) => sp.schluessel)).toEqual(["rufgruppe", "funkrufname", "funkhinweis", "letzterKontakt"]);
    expect(spalte("funkhinweis")).toMatchObject({ art: "text", schreibt: { art: "stammdaten", feld: "funkHinweis" }, feldpfad: "funkHinweis" });
    expect(spalte("erreichbarkeit")?.gruppe).toBe("RESSOURCENPLANUNG");
    expect(spalte("rufgruppe")).toMatchObject({
      art: "auswahl",
      werteAus: "rufgruppen",
      schreibt: { art: "festeArt", typ: "EinheitRufgruppeGesetzt" },
      feldpfad: "rufgruppeId",
    });
    expect(spalte("funkrufname")?.art).toBe("berechnet");
  });
});

describe("Die Auswahlwerte einer Spalte", () => {
  it("liefert die nicht aufgelösten Rufgruppen nach Reihenfolge mit Namen", () => {
    const basis = grundlage();
    const aufl = feldEreignis(h(), n, "RufgruppeAufgeloest", { rufgruppeId: "R2" }, null, true, "abgeschaltet");
    const z = zustand([...basis, aufl]);
    expect(auswahlwerte(z, spalte("rufgruppe") as Spalte)).toEqual([
      { wert: "R1", titel: "THW_OL_FUE" },
      { wert: "R3", titel: "DMO 310" },
    ]);
  });

  it("ist ohne Rufgruppen leer und liefert bei festen Listen das Wort der Excel", () => {
    const basis = grundlage();
    const z = zustand(basis.slice(0, 3));
    expect(auswahlwerte(z, spalte("rufgruppe") as Spalte)).toEqual([]);
    expect(auswahlwerte(z, spalte("status") as Spalte)).toContainEqual({ wert: "IM_EINSATZ", titel: "Einsatz" });
  });
});

describe("Die Zellen der Gruppe FUNK", () => {
  it("zeigt den Namen der Rufgruppe und schickt ihre Kennung", () => {
    const basis = grundlage();
    const z = zustand([...basis, feldEreignis(h(), n, "EinheitRufgruppeGesetzt", { einheitId: "E1" }, null, "R1")]);
    expect(zeile(z).zellen["rufgruppe"]).toMatchObject({ text: "THW_OL_FUE", wert: "R1", umstritten: false });
  });

  it("ist leer ohne Rufgruppe und vermerkt eine aufgelöste", () => {
    const basis = grundlage();
    expect(zeile(zustand(basis)).zellen["rufgruppe"]).toMatchObject({ text: "", wert: null });
    const z = zustand([
      ...basis,
      feldEreignis(h(), n, "EinheitRufgruppeGesetzt", { einheitId: "E1" }, null, "R1"),
      feldEreignis(h(), n, "RufgruppeAufgeloest", { rufgruppeId: "R1" }, null, true, "abgeschaltet"),
    ]);
    expect(zeile(z).zellen["rufgruppe"]?.text).toBe("THW_OL_FUE (aufgelöst)");
  });

  it("zeigt den Konflikt an der Zelle der Rufgruppe", () => {
    const basis = grundlage();
    const vonA = feldEreignis(hlc(50_000, 0, "a"), 50, "EinheitRufgruppeGesetzt", { einheitId: "E1" }, null, "R1");
    const vonB = feldEreignis(hlc(60_000, 0, "b"), 1, "EinheitRufgruppeGesetzt", { einheitId: "E1" }, null, "R2");
    expect(zeile(zustand([...basis, vonA, vonB])).zellen["rufgruppe"]).toMatchObject({ text: "THW_OL_EA1", umstritten: true });
  });

  it("zeigt den Funkhinweis als Text und schickt ihn als Wert", () => {
    const basis = grundlage();
    expect(zeile(zustand(basis)).zellen["funkhinweis"]).toMatchObject({ text: "", wert: null });
    const z = zustand([...basis, feldEreignis(h(), n, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "funkHinweis" }, null, "auch 2 m K 55")]);
    expect(zeile(z).zellen["funkhinweis"]).toMatchObject({ text: "auch 2 m K 55", wert: "auch 2 m K 55", umstritten: false });
  });

  it("berechnet den Funkrufnamen (K31)", () => {
    const basis = grundlage();
    const z = zustand([...basis, feldEreignis(h(), n, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "funkrufnameOverride" }, null, "Heros Oldenburg 21/10")]);
    expect(zeile(z).zellen["funkrufname"]).toMatchObject({ text: "Heros Oldenburg 21/10", wert: undefined });
  });
});
