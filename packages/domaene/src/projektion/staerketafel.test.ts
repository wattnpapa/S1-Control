/**
 * Prüffälle zu den Stärketafeln des Sachgebiets 1 (Monitor: Abschnitte,
 * Organisationen). Die Zusage: dieselbe Zählregel wie das Kopfband, die
 * Zeilen ergeben zusammen die Gesamtzeile, Erwartete stehen daneben.
 */

import { describe, expect, it } from "vitest";

import { einsatzGesamtstaerke, staerkeAusserhalbDerGesamtstaerke } from "../kennzahlen.js";
import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { abschnittAngelegt, einheitGemeldet, einheitVerschoben, einsatzAngelegt, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import { staerkePlus, type Staerke } from "../werte.js";
import type { Zustand } from "../zustand.js";
import { OHNE_ORGANISATION, staerketafel } from "./staerketafel.js";

let laufnummer = 100;

function abschnitt(id: string, typ: string, reihenfolge: number, parentId?: string): EingehendesEreignis {
  laufnummer += 1;
  return abschnittAngelegt(hlc(laufnummer, 0, "aa"), laufnummer, {
    abschnittId: id,
    name: `Bereich ${id}`,
    abschnittstyp: typ,
    reihenfolge,
    ...(parentId === undefined ? {} : { parentId }),
  });
}

interface Einheitsangabe {
  readonly id: string;
  readonly abschnittId: string;
  readonly s: Staerke;
  readonly organisation?: string;
  readonly status?: string;
}

function einheit(a: Einheitsangabe): EingehendesEreignis {
  laufnummer += 1;
  return einheitGemeldet(hlc(laufnummer, 0, "aa"), laufnummer, {
    einheitId: a.id,
    abschnittId: a.abschnittId,
    bezeichnung: `Einheit ${a.id}`,
    organisation: a.organisation ?? "THW",
    ebene: "GRUPPE",
    staerke: a.s,
    personalErfassung: "NUR_STAERKE",
    status: a.status ?? "IM_EINSATZ",
  });
}

function lage(): Zustand {
  return materialisiere(
    falteHinzu(leereFaltung(), [
      einsatzAngelegt(hlc(1, 0, "aa"), 1, {
        einsatzId: "E1",
        name: "Ölunfall",
        art: "UEBUNG",
        fuestName: "LG",
        beginn: "2026-11-14T08:00:00+01:00",
        schichtmodell: "ZWEI_SCHICHT",
      }),
      abschnitt("FUEST", "FUEHRUNGSSTELLE", 1),
      abschnitt("ANF", "ANGEFORDERT", 2),
      abschnitt("EA1", "EINSATZORT", 3),
      abschnitt("UA1", "EINSATZORT", 1, "EA1"),
      abschnitt("EA2", "EINSATZORT", 4),
      abschnitt("EA3", "EINSATZORT", 5),
      abschnitt("UA3", "EINSATZORT", 1, "EA3"),
      einheit({ id: "U1", abschnittId: "FUEST", s: staerke(1, 1, 1) }),
      einheit({ id: "U2", abschnittId: "ANF", s: staerke(0, 1, 8), organisation: "DRK", status: "ANMARSCH" }),
      einheit({ id: "U3", abschnittId: "EA1", s: staerke(1, 2, 10), organisation: "FEUERWEHR" }),
      einheit({ id: "U4", abschnittId: "UA1", s: staerke(0, 1, 5) }),
      einheit({ id: "U5", abschnittId: "UA1", s: staerke(0, 0, 4), organisation: "DRK", status: "ANMARSCH" }),
      einheit({ id: "U6", abschnittId: "EA1", s: staerke(0, 1, 2), organisation: "DLRG" }),
      einheitVerschoben(hlc(900, 0, "aa"), 900, "U6", "EA1", "ARCHIV"),
      einheit({ id: "U7", abschnittId: "UA3", s: staerke(0, 0, 3), organisation: "FEUERWEHR" }),
    ]),
  );
}

describe("staerketafel — Abschnitte", () => {
  it("folgt dem Baum mit Tiefe, lässt leere Abschnitte weg und behält Eltern mit Kräften darunter", () => {
    const tafel = staerketafel(lage());
    expect(tafel.abschnitte.map((z) => [z.schluessel, z.tiefe])).toEqual([
      ["FUEST", 0],
      ["EA1", 0],
      ["UA1", 1],
      ["EA3", 0],
      ["UA3", 1],
    ]);
    expect(tafel.abschnitte.find((z) => z.schluessel === "EA3")?.gesamt).toBe(0);
  });

  it("zählt je Zeile die eigene Ist-Stärke, Erwartete daneben", () => {
    const ua1 = staerketafel(lage()).abschnitte.find((z) => z.schluessel === "UA1");
    expect(ua1?.staerke).toEqual(staerke(0, 1, 5));
    expect(ua1?.gesamt).toBe(6);
    expect(ua1?.erwartet).toBe(4);
  });

  it("ergibt mit den Zeilen die Gesamtzeile, und die ist das Kopfband", () => {
    const zustand = lage();
    const tafel = staerketafel(zustand);
    const summe = tafel.abschnitte.reduce<Staerke>((a, z) => staerkePlus(a, z.staerke), staerke(0, 0, 0));
    expect(summe).toEqual(tafel.gesamt.staerke);
    expect(tafel.gesamt.staerke).toEqual(einsatzGesamtstaerke(zustand).gesamt);
    expect(tafel.gesamt.erwartet).toBe(staerkeAusserhalbDerGesamtstaerke(zustand).erwartet);
  });

  it("führt Angefordert / Anmarsch getrennt und ohne Einsatz beendet", () => {
    const tafel = staerketafel(lage());
    expect(tafel.anmarsch.staerke).toEqual(staerke(0, 1, 8));
    expect(tafel.abschnitte.map((z) => z.schluessel)).not.toContain("ANF");
    expect(tafel.abschnitte.map((z) => z.schluessel)).not.toContain("ARCHIV");
  });
});

describe("staerketafel — Organisationen", () => {
  it("ordnet nach dem Katalog und trennt Ist und erwartet", () => {
    const tafel = staerketafel(lage());
    expect(tafel.organisationen.map((z) => [z.name, z.gesamt, z.erwartet])).toEqual([
      ["THW", 9, 0],
      ["Feuerwehr", 16, 0],
      ["DRK", 0, 13],
    ]);
  });

  it("ergibt mit den Zeilen die Gesamtzeile und lässt beendete Einheiten weg", () => {
    const tafel = staerketafel(lage());
    expect(tafel.organisationen.reduce((a, z) => a + z.gesamt, 0)).toBe(tafel.gesamt.gesamt);
    expect(tafel.organisationen.reduce((a, z) => a + z.erwartet, 0)).toBe(tafel.gesamt.erwartet);
    expect(tafel.organisationen.map((z) => z.name)).not.toContain("DLRG");
  });

  it("nennt Einheiten ohne Organisation zuletzt", () => {
    const zustand = lage();
    const u7 = zustand.einheiten["U7"];
    if (u7 === undefined) throw new Error("U7 fehlt");
    const ohne = { ...u7, organisation: { ...u7.organisation, wert: "" } };
    const namen = staerketafel({ ...zustand, einheiten: { ...zustand.einheiten, U7: ohne } }).organisationen.map((z) => z.name);
    expect(namen.at(-1)).toBe(OHNE_ORGANISATION);
  });
});

describe("staerketafel — Abschnitt × Organisation", () => {
  it("zählt je Abschnitt und Organisation die eigenen Ist-Köpfe", () => {
    const tafel = staerketafel(lage());
    expect(tafel.kreuz["EA1"]).toEqual({ FEUERWEHR: 13 });
    expect(tafel.kreuz["UA1"]).toEqual({ THW: 6 });
    expect(tafel.kreuz["ANF"]).toBeUndefined();
  });

  it("ergibt je Organisation die Spalte der Organisationstafel", () => {
    const tafel = staerketafel(lage());
    for (const org of tafel.organisationen) {
      const spalte = tafel.abschnitte.reduce((a, z) => a + (tafel.kreuz[z.schluessel]?.[org.schluessel] ?? 0), 0);
      expect(spalte).toBe(org.gesamt);
    }
  });
});
