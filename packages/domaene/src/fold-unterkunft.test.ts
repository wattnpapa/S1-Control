/**
 * Unterkunft und Zuweisung im Fold (S4.2, KONZEPT-S4.md §5.3 und §6).
 *
 * Die Zuweisung hängt als Feld `unterkunftId` an der Einheit. Geprüft wird,
 * was daraus folgen soll: Überbelegung wird gezeigt und nicht verweigert,
 * Verschieben behält die Zuweisung, Entfernen gibt das Bett frei, Undo
 * nimmt Anlage, Zuweisung, Aufhebung und Auflösung zurück, und das Tagebuch
 * nennt Namen statt Kennungen.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import { anlageEreignis, abschnittAngelegt, einheitGemeldet, einheitVerschoben, einsatzAngelegt, feldEreignis, hlc, staerke } from "./pruefhilfen/ereignisbau.js";
import { belegung } from "./projektion/unterkunft.js";
import { tagebuchzeile } from "./projektion/tagebuch.js";
import { versorgungseinheiten } from "./projektion/versorgung.js";
import { kompensationFuer } from "./undo.js";
import type { Zustand } from "./zustand.js";

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
    abschnittAngelegt(h(), n, { abschnittId: "EA2", name: "EA 2", abschnittstyp: "EINSATZORT", reihenfolge: 2 }),
    einheitGemeldet(h(), n, { einheitId: "E1", abschnittId: "EA1", bezeichnung: "B 1", organisation: "THW", ebene: "GRUPPE", staerke: staerke(1, 2, 9), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ" }),
    einheitGemeldet(h(), n, { einheitId: "E2", abschnittId: "EA1", bezeichnung: "FGr N", organisation: "THW", ebene: "GRUPPE", staerke: staerke(0, 1, 7), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ" }),
    feldEreignis(h(), n, "SofortbedarfGesetzt", { einheitId: "E1" }, null, { verpflegungPersonen: 12, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0, unterbringung: true, ruhezeitErforderlich: false }),
    feldEreignis(h(), n, "SofortbedarfGesetzt", { einheitId: "E2" }, null, { verpflegungPersonen: 8, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0, unterbringung: true, ruhezeitErforderlich: false }),
    anlageEreignis(h(), n, "UnterkunftAngelegt", { unterkunftId: "U1", name: "Gerätehaus", ort: "Rastede", kapazitaet: 12 }),
  ];
}

function untergebracht(einheitId: string, unterkunftId: string, vorher: string | null = null): EingehendesEreignis {
  return feldEreignis(h(), n, "EinheitUntergebracht", { einheitId }, vorher, unterkunftId);
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

function belegungVon(z: Zustand): ReturnType<typeof belegung> {
  return belegung(z, versorgungseinheiten(z, Date.parse("2026-09-08T12:00:00+02:00")));
}

describe("Die Unterkunft im Fold", () => {
  it("legt eine Unterkunft mit Rahmenfeldern an und führt die Sammlung nur, wenn es eine gibt", () => {
    const ohne = zustand(grundlage().slice(0, -1));
    expect(ohne.unterkuenfte).toBeUndefined();
    const z = zustand(grundlage());
    expect(z.unterkuenfte?.["U1"]?.name.wert).toBe("Gerätehaus");
    expect(z.unterkuenfte?.["U1"]?.kapazitaet.wert).toBe(12);
    expect(z.unterkuenfte?.["U1"]?.verworfeneAnlagen).toEqual([]);
  });

  it("zeigt Überbelegung, statt sie zu verweigern", () => {
    const z = zustand([...grundlage(), untergebracht("E1", "U1"), untergebracht("E2", "U1")]);
    const karte = belegungVon(z).unterkuenfte[0];
    expect(karte?.belegt.gesamt).toBe(20);
    expect(karte?.frei).toBe(-8);
    expect(karte?.ueberbelegt).toBe(true);
    // Frei in der Summe ist je Halle nicht unter null.
    expect(belegungVon(z).frei).toBe(0);
    expect(belegungVon(z).ohneZuweisung).toEqual({ koepfe: 0, einheiten: 0 });
  });

  it("zählt Einheiten mit Bedarf und ohne geltende Unterkunft als „ohne Zuweisung“", () => {
    const z = zustand([...grundlage(), untergebracht("E1", "U1")]);
    expect(belegungVon(z).ohneZuweisung).toEqual({ koepfe: 8, einheiten: 1 });
  });

  it("behält die Zuweisung, wenn die Einheit verschoben wird", () => {
    const z = zustand([...grundlage(), untergebracht("E1", "U1"), einheitVerschoben(h(), n, "E1", "EA1", "EA2")]);
    expect(z.einheiten["E1"]?.wirksamerAbschnittId).toBe("EA2");
    expect(belegungVon(z).unterkuenfte[0]?.einheiten.map((e) => e.einheitId)).toEqual(["E1"]);
  });

  it("gibt das Bett frei, wenn die Einheit entfernt wird, und belegt es wieder bei Wiederherstellung", () => {
    const zugewiesen = [...grundlage(), untergebracht("E1", "U1")];
    const entfernt = [...zugewiesen, feldEreignis(h(), n, "EinheitEntfernt", { einheitId: "E1" }, false, true, "Doppelt erfasst")];
    expect(belegungVon(zustand(entfernt)).unterkuenfte[0]?.belegt.gesamt).toBe(0);
    const zurueck = [...entfernt, feldEreignis(h(), n, "EinheitWiederhergestellt", { einheitId: "E1" }, true, false)];
    expect(belegungVon(zustand(zurueck)).unterkuenfte[0]?.belegt.gesamt).toBe(12);
  });

  it("nimmt eine aufgelöste Unterkunft aus der Rechnung; ihre Einheiten sind wieder ohne Bett", () => {
    const z = zustand([...grundlage(), untergebracht("E1", "U1"), feldEreignis(h(), n, "UnterkunftAufgeloest", { unterkunftId: "U1" }, null, true, "Halle gesperrt")]);
    expect(belegungVon(z).kapazitaet).toBe(0);
    expect(belegungVon(z).ohneZuweisung.einheiten).toBe(2);
  });

  it("verwirft eine Auflösung ohne Grund (§2.4)", () => {
    const z = zustand([...grundlage(), feldEreignis(h(), n, "UnterkunftAufgeloest", { unterkunftId: "U1" }, null, true)]);
    expect(z.unterkuenfte?.["U1"]?.aufgeloest).toBeUndefined();
    expect(z.unbekannt.some((u) => u.typ === "UnterkunftAufgeloest")).toBe(true);
  });

  it("meldet eine Zuweisung auf eine unbekannte Unterkunft als Fremdreferenz", () => {
    const z = zustand([...grundlage(), untergebracht("E1", "U9")]);
    expect(z.hinweise).toContainEqual({ art: "fremdreferenzUnbekannt", feldpfad: "einheit/E1/unterkunftId", verweistAuf: "U9" });
    const bekannt = zustand([...grundlage(), untergebracht("E1", "U1")]);
    expect(bekannt.hinweise.some((x) => x.art === "fremdreferenzUnbekannt")).toBe(false);
  });
});

describe("Undo der Unterbringung (§6)", () => {
  it("nimmt eine Umbelegung auf die vorige Unterkunft zurück", () => {
    const ereignisse = [...grundlage(), anlageEreignis(h(), n, "UnterkunftAngelegt", { unterkunftId: "U2", name: "Halle", kapazitaet: 50 }), untergebracht("E1", "U1")];
    const um = untergebracht("E1", "U2", "U1");
    const k = kompensationFuer(um, zustand([...ereignisse, um]));
    expect(k).toMatchObject({ art: "entwurf", entwurf: { typ: "EinheitUntergebracht", neu: "U1", vorher: "U2" } });
  });

  it("bringt die Einheit nach Rücknahme einer Aufhebung dorthin zurück, wo sie war", () => {
    const ereignisse = [...grundlage(), untergebracht("E1", "U1")];
    const auf = feldEreignis(h(), n, "UnterbringungAufgehoben", { einheitId: "E1" }, "U1", null);
    const z = zustand([...ereignisse, auf]);
    expect(z.einheiten["E1"]?.unterkunftId?.wert).toBeNull();
    const k = kompensationFuer(auf, z);
    expect(k).toMatchObject({ art: "entwurf", entwurf: { typ: "EinheitUntergebracht", neu: "U1", vorher: null } });
  });

  it("verlangt für die Rücknahme einer Anlage einen Grund und stellt eine Auflösung wieder her", () => {
    const anlage = grundlage().at(-1) as EingehendesEreignis;
    expect(kompensationFuer(anlage, zustand(grundlage()))).toEqual({ art: "brauchtGrund", zielArt: "UnterkunftAufgeloest" });
    const aufl = feldEreignis(h(), n, "UnterkunftAufgeloest", { unterkunftId: "U1" }, null, true, "Halle gesperrt");
    const k = kompensationFuer(aufl, zustand([...grundlage(), aufl]));
    expect(k).toMatchObject({ art: "entwurf", entwurf: { typ: "UnterkunftWiederhergestellt", neu: false } });
  });
});

describe("Die Unterbringung im Tagebuch", () => {
  it("nennt Unterkunft und Einheit beim Namen", () => {
    const um = untergebracht("E1", "U1");
    const z = zustand([...grundlage(), um]);
    expect(tagebuchzeile(z, um).satz).toContain("Gerätehaus");
    expect(tagebuchzeile(z, um).satz).toContain("B 1");
    const anlage = grundlage().at(-1) as EingehendesEreignis;
    expect(tagebuchzeile(z, anlage).satz).toContain("12 Plätze, Rastede");
    const auf = feldEreignis(h(), n, "UnterbringungAufgehoben", { einheitId: "E1" }, "U1", null);
    expect(tagebuchzeile(zustand([...grundlage(), um, auf]), auf).satz).toContain("war Gerätehaus");
  });
});
