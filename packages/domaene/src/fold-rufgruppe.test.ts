/**
 * Rufgruppe und Hauptrufgruppe der Einheit im Fold (Funkplan F1,
 * KONZEPT-FUNKPLAN.md §3 und §8).
 *
 * Die Hauptrufgruppe hängt als Feld `rufgruppeId` an der Einheit. Geprüft
 * wird, was daraus folgen soll: Anlage mit Rahmenfeldern und offener
 * Betriebsart, Änderung je Feld mit Konflikthinweis, Auflösen mit Pflicht-
 * grund und Wiederherstellen, zwei Anlagen derselben Id, Setzen und Löschen
 * der Hauptrufgruppe, Verschieben ohne Gruppenwechsel, Undo je Art und das
 * Tagebuch mit Namen statt Kennungen.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, einheitVerschoben, einsatzAngelegt, feldEreignis, hlc, staerke } from "./pruefhilfen/ereignisbau.js";
import { tagebuchzeile } from "./projektion/tagebuch.js";
import { kompensationFuer } from "./undo.js";
import type { Zustand } from "./zustand.js";

let n = 0;
function h(client = "a"): ReturnType<typeof hlc> {
  n += 1;
  return hlc(n * 1000, 0, client);
}

const ANLAGE_FUE = { rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_FUE", zweck: "Führung", hoert: "FmZ Platz 1", reihenfolge: 1 };

function grundlage(): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    abschnittAngelegt(h(), n, { abschnittId: "EA2", name: "EA 2", abschnittstyp: "EINSATZORT", reihenfolge: 2 }),
    einheitGemeldet(h(), n, { einheitId: "E1", abschnittId: "EA1", bezeichnung: "B 1", organisation: "THW", ebene: "GRUPPE", staerke: staerke(1, 2, 9), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ" }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", ANLAGE_FUE),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R2", betriebsart: "TMO", name: "THW_OL_EA1", abschnittId: "EA1", reihenfolge: 2 }),
  ];
}

function gesetzt(rufgruppeId: string | null, vorher: string | null = null, grund?: string): EingehendesEreignis {
  return feldEreignis(h(), n, "EinheitRufgruppeGesetzt", { einheitId: "E1" }, vorher, rufgruppeId, grund);
}

function aufgeloest(id = "R1", grund: string | null = "Gruppe abgeschaltet"): EingehendesEreignis {
  return feldEreignis(h(), n, "RufgruppeAufgeloest", { rufgruppeId: id }, null, true, grund ?? undefined);
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

describe("Die Rufgruppe im Fold", () => {
  it("legt eine Rufgruppe mit Rahmenfeldern an und führt die Sammlung nur, wenn es eine gibt", () => {
    const basis = grundlage();
    expect(zustand(basis.slice(0, 4)).rufgruppen).toBeUndefined();
    const z = zustand(basis);
    const r1 = z.rufgruppen?.["R1"];
    expect(r1?.name.wert).toBe("THW_OL_FUE");
    expect(r1?.betriebsart.wert).toBe("TMO");
    expect(r1?.hoert?.wert).toBe("FmZ Platz 1");
    expect(r1?.angelegtMitArt).toBe("RufgruppeAngelegt");
    expect(r1?.verworfeneAnlagen).toEqual([]);
    expect(z.rufgruppen?.["R2"]?.abschnittId?.wert).toBe("EA1");
    expect(z.hinweise).toEqual([]);
  });

  it("faltet eine unbekannte Betriebsart und meldet sie als unbekannten Wert (§3.7)", () => {
    const basis = grundlage();
    const z = zustand([...basis, anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R3", betriebsart: "SATELLIT", name: "Sat 1" })]);
    expect(z.rufgruppen?.["R3"]?.betriebsart.wert).toBe("SATELLIT");
    expect(z.hinweise).toContainEqual({ art: "unbekannterWert", feldpfad: "rufgruppe/R3/betriebsart", wert: "SATELLIT" });
  });

  it("ändert je Feld (LWW) und lässt die übrigen Felder stehen", () => {
    const basis = grundlage();
    const z = zustand([
      ...basis,
      feldEreignis(h(), n, "RufgruppeGeaendert", { rufgruppeId: "R1", feld: "betriebsart" }, "TMO", "DMO"),
      feldEreignis(h(), n, "RufgruppeGeaendert", { rufgruppeId: "R1", feld: "gateway" }, null, "Heros Varel 25/10"),
    ]);
    expect(z.rufgruppen?.["R1"]?.betriebsart.wert).toBe("DMO");
    expect(z.rufgruppen?.["R1"]?.gateway?.wert).toBe("Heros Varel 25/10");
    expect(z.rufgruppen?.["R1"]?.name.wert).toBe("THW_OL_FUE");
  });

  it("zeigt den Konflikthinweis, wenn zwei Arbeitsplätze dasselbe Feld aus demselben Stand ändern (§2.2a)", () => {
    const basis = grundlage();
    const vonA = feldEreignis(hlc(50_000, 0, "a"), 50, "RufgruppeGeaendert", { rufgruppeId: "R1", feld: "hoert" }, "FmZ Platz 1", "FmZ Platz 2");
    const vonB = feldEreignis(hlc(60_000, 0, "b"), 1, "RufgruppeGeaendert", { rufgruppeId: "R1", feld: "hoert" }, "FmZ Platz 1", "Abschnittsleitung");
    const z = zustand([...basis, vonA, vonB]);
    expect(z.rufgruppen?.["R1"]?.hoert?.wert).toBe("Abschnittsleitung");
    expect(z.hinweise).toContainEqual(expect.objectContaining({ art: "vorherPasstNicht", feldpfad: "rufgruppe/R1/hoert", verdraengterWert: "FmZ Platz 2" }));
  });

  it("führt eine zweite Anlage derselben Id als verworfen und weist sie aus (§3.11)", () => {
    const basis = grundlage();
    // Wie bei jeder Entität: `angelegtDurch` bleibt bei der kleinsten HLC,
    // die Feldwerte folgen der gewöhnlichen Auswahl — doppelt ausgewiesen.
    const zweite = anlageEreignis(hlc(70_000, 0, "b"), 2, "RufgruppeAngelegt", { rufgruppeId: "R1", betriebsart: "DMO", name: "DMO 310" });
    const z = zustand([...basis, zweite]);
    expect(z.rufgruppen?.["R1"]?.angelegtDurch).toBe("a:5");
    expect(z.rufgruppen?.["R1"]?.verworfeneAnlagen).toHaveLength(1);
    expect(z.rufgruppen?.["R1"]?.zweck?.wert).toBe("Führung");
    expect(z.hinweise).toContainEqual(expect.objectContaining({ art: "zweiteAnlageVerworfen", feldpfad: "rufgruppe/R1", verworfen: "b:2", gilt: "a:5" }));
    expect(z.hinweise).toContainEqual(expect.objectContaining({ art: "ohneVorherWertVerdraengt", feldpfad: "rufgruppe/R1/name" }));
  });

  it("löst mit Grund auf, verwirft die Auflösung ohne Grund und stellt wieder her", () => {
    const basis = grundlage();
    const ohneGrund = zustand([...basis, aufgeloest("R1", null)]);
    expect(ohneGrund.rufgruppen?.["R1"]?.aufgeloest).toBeUndefined();
    expect(ohneGrund.unbekannt.some((u) => u.typ === "RufgruppeAufgeloest")).toBe(true);
    const mit = [...basis, aufgeloest()];
    const z = zustand(mit);
    expect(z.rufgruppen?.["R1"]?.aufgeloest?.wert).toBe(true);
    expect(typeof z.rufgruppen?.["R1"]?.aufgeloest?.wanduhr).toBe("string");
    const zurueck = zustand([...mit, feldEreignis(h(), n, "RufgruppeWiederhergestellt", { rufgruppeId: "R1" }, true, false)]);
    expect(zurueck.rufgruppen?.["R1"]?.aufgeloest?.wert).toBe(false);
  });

  it("verweist mit dem Bereichsbezug auf einen Abschnitt und meldet einen unbekannten", () => {
    const basis = grundlage();
    const z = zustand([...basis, feldEreignis(h(), n, "RufgruppeGeaendert", { rufgruppeId: "R2", feld: "abschnittId" }, "EA1", "EA9")]);
    expect(z.hinweise).toContainEqual({ art: "fremdreferenzUnbekannt", feldpfad: "rufgruppe/R2/abschnittId", verweistAuf: "EA9" });
  });
});

describe("Die Hauptrufgruppe der Einheit", () => {
  it("setzt die Rufgruppe und nimmt sie mit null wieder weg", () => {
    const basis = grundlage();
    const setzen = [...basis, gesetzt("R1")];
    expect(zustand(setzen).einheiten["E1"]?.rufgruppeId?.wert).toBe("R1");
    const weg = zustand([...setzen, gesetzt(null, "R1", "Einheit abgerückt")]);
    expect(weg.einheiten["E1"]?.rufgruppeId?.wert).toBeNull();
    expect(weg.hinweise.some((x) => x.art === "fremdreferenzUnbekannt")).toBe(false);
  });

  it("lässt die Rufgruppe stehen, wenn die Einheit verschoben wird (bewusste Nicht-Regel)", () => {
    const basis = grundlage();
    const z = zustand([...basis, gesetzt("R2"), einheitVerschoben(h(), n, "E1", "EA1", "EA2")]);
    expect(z.einheiten["E1"]?.wirksamerAbschnittId).toBe("EA2");
    expect(z.einheiten["E1"]?.rufgruppeId?.wert).toBe("R2");
  });

  it("setzt nichts um, wenn die Rufgruppe aufgelöst wird", () => {
    const basis = grundlage();
    const z = zustand([...basis, gesetzt("R1"), aufgeloest()]);
    expect(z.einheiten["E1"]?.rufgruppeId?.wert).toBe("R1");
  });

  it("meldet eine Zuordnung auf eine unbekannte Rufgruppe als Fremdreferenz", () => {
    const basis = grundlage();
    const z = zustand([...basis, gesetzt("R9")]);
    expect(z.hinweise).toContainEqual({ art: "fremdreferenzUnbekannt", feldpfad: "einheit/E1/rufgruppeId", verweistAuf: "R9" });
  });

  it("führt den Funkrufnamen der Einheit als Stammdatum", () => {
    const basis = grundlage();
    const z = zustand([...basis, feldEreignis(h(), n, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "funkrufnameOverride" }, null, "Heros Oldenburg 21/10")]);
    expect(z.einheiten["E1"]?.funkrufnameOverride?.wert).toBe("Heros Oldenburg 21/10");
  });
});

describe("Undo des Funkplans (§6)", () => {
  it("verlangt für die Rücknahme einer Anlage einen Grund und löst dann auf", () => {
    const basis = grundlage();
    const anlage = basis[4] as EingehendesEreignis;
    expect(kompensationFuer(anlage, zustand(basis))).toEqual({ art: "brauchtGrund", zielArt: "RufgruppeAufgeloest" });
    expect(kompensationFuer(anlage, zustand(basis), "falsch angelegt")).toMatchObject({ art: "entwurf", entwurf: { typ: "RufgruppeAufgeloest", neu: true, grund: "falsch angelegt" } });
  });

  it("nimmt eine Änderung auf den vorigen Wert zurück", () => {
    const basis = grundlage();
    const aenderung = feldEreignis(h(), n, "RufgruppeGeaendert", { rufgruppeId: "R1", feld: "zweck" }, "Führung", "Führung und Logistik");
    const k = kompensationFuer(aenderung, zustand([...basis, aenderung]));
    expect(k).toMatchObject({ art: "entwurf", entwurf: { typ: "RufgruppeGeaendert", nutzlast: { rufgruppeId: "R1", feld: "zweck" }, neu: "Führung", vorher: "Führung und Logistik" } });
  });

  it("stellt eine Auflösung wieder her und löst eine Wiederherstellung mit Grund wieder auf", () => {
    const basis = grundlage();
    const aufl = aufgeloest();
    const z = zustand([...basis, aufl]);
    expect(kompensationFuer(aufl, z)).toMatchObject({ art: "entwurf", entwurf: { typ: "RufgruppeWiederhergestellt", neu: false, vorher: true } });
    const wieder = feldEreignis(h(), n, "RufgruppeWiederhergestellt", { rufgruppeId: "R1" }, true, false);
    const z2 = zustand([...basis, aufl, wieder]);
    expect(kompensationFuer(wieder, z2)).toEqual({ art: "brauchtGrund", zielArt: "RufgruppeAufgeloest" });
    expect(kompensationFuer(wieder, z2, "doch nicht")).toMatchObject({ art: "entwurf", entwurf: { typ: "RufgruppeAufgeloest", neu: true } });
  });

  it("setzt die Einheit auf die vorige Rufgruppe zurück, auch auf „keine“", () => {
    const basis = grundlage();
    const erst = gesetzt("R1");
    const um = gesetzt("R2", "R1");
    const z = zustand([...basis, erst, um]);
    expect(kompensationFuer(um, z)).toMatchObject({ art: "entwurf", entwurf: { typ: "EinheitRufgruppeGesetzt", neu: "R1", vorher: "R2" } });
    expect(kompensationFuer(erst, zustand([...basis, erst]))).toMatchObject({ art: "entwurf", entwurf: { typ: "EinheitRufgruppeGesetzt", neu: null } });
  });
});

describe("Der Funkplan im Tagebuch", () => {
  it("nennt Rufgruppen beim Namen", () => {
    const basis = grundlage();
    const erst = gesetzt("R1");
    const um = gesetzt("R2", "R1", "Abschnitt EA 1 gebildet");
    const z = zustand([...basis, erst, um]);
    expect(tagebuchzeile(z, um).satz).toBe("B 1: Rufgruppe gesetzt: THW_OL_FUE → THW_OL_EA1");
    expect(tagebuchzeile(z, um).grund).toBe("Abschnitt EA 1 gebildet");
    expect(tagebuchzeile(z, erst).satz).toBe("B 1: Rufgruppe gesetzt: THW_OL_FUE");
    const weg = gesetzt(null, "R2");
    expect(tagebuchzeile(zustand([...basis, erst, um, weg]), weg).satz).toBe("B 1: Rufgruppe gesetzt: THW_OL_EA1 → keine Rufgruppe");
    const anlage = basis[4] as EingehendesEreignis;
    expect(tagebuchzeile(z, anlage).satz).toBe("THW_OL_FUE: Rufgruppe angelegt (TMO, Führung, hört FmZ Platz 1)");
  });

  it("nennt Bereich und Betriebsart als Wort und die Auflösung ohne Werte", () => {
    const basis = grundlage();
    const bereich = feldEreignis(h(), n, "RufgruppeGeaendert", { rufgruppeId: "R2", feld: "abschnittId" }, "EA1", "EA2");
    const art = feldEreignis(h(), n, "RufgruppeGeaendert", { rufgruppeId: "R2", feld: "betriebsart" }, "TMO", "ANALOG");
    const aufl = aufgeloest("R2");
    const z = zustand([...basis, bereich, art, aufl]);
    expect(tagebuchzeile(z, bereich).satz).toBe("THW_OL_EA1: Rufgruppe geändert (Bereich): EA 1 → EA 2");
    expect(tagebuchzeile(z, art).satz).toBe("THW_OL_EA1: Rufgruppe geändert (Betriebsart): TMO → Analog");
    expect(tagebuchzeile(z, aufl).satz).toBe("THW_OL_EA1: Rufgruppe aufgelöst");
    const zweck = feldEreignis(h(), n, "RufgruppeGeaendert", { rufgruppeId: "R2", feld: "zweck" }, null, "Deich Nord");
    expect(tagebuchzeile(zustand([...basis, zweck]), zweck).satz).toBe("THW_OL_EA1: Rufgruppe geändert (Zweck): (leer) → Deich Nord");
  });
});
