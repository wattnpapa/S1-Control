/**
 * Prüffälle zum Abschnittsbaum (M3.1).
 *
 * Sie messen die Projektion, nicht den Fold: Dass die Zyklusregel greift,
 * steht in `fold-abschnitt.test.ts`. Hier steht, dass der Baum den Befund des
 * Folds auch **zeigt** — ein Abschnitt, dessen Kante gefallen ist, darf nicht
 * aus der Anzeige verschwinden.
 */

import { describe, expect, it } from "vitest";

import { abschnittsbaum, aufloesungsziele, baumZeilen, schluesseZyklus } from "./baum.js";
import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import {
  abschnittAngelegt,
  einheitGemeldet,
  einsatzAngelegt,
  feldEreignis,
  hlc,
  staerke,
} from "../pruefhilfen/ereignisbau.js";
import { AUFFANG_ABSCHNITT_ID, ARCHIV_ABSCHNITT_ID } from "../zustand.js";
import type { Zustand } from "../zustand.js";

function falte(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

const EINSATZ = einsatzAngelegt(hlc(1, 0, "a"), 1, {
  einsatzId: "E1",
  name: "Hochwasser",
  art: "EINSATZ",
  fuestName: "FüSt 1",
  beginn: "2026-09-08T08:00:00+02:00",
  schichtmodell: "ZWEI_SCHICHT",
});

function abschnitt(
  ms: number,
  laufnummer: number,
  id: string,
  name: string,
  reihenfolge: number,
  parentId?: string,
  typ = "EINSATZORT",
): EingehendesEreignis {
  return abschnittAngelegt(hlc(ms, 0, "a"), laufnummer, {
    abschnittId: id,
    name,
    abschnittstyp: typ,
    reihenfolge,
    ...(parentId === undefined ? {} : { parentId }),
  });
}

function einheit(
  ms: number,
  laufnummer: number,
  id: string,
  abschnittId: string,
  f: number,
  u: number,
  m: number,
): EingehendesEreignis {
  return einheitGemeldet(hlc(ms, 0, "a"), laufnummer, {
    einheitId: id,
    abschnittId,
    bezeichnung: id,
    organisation: "THW",
    ebene: "ZUG",
    staerke: staerke(f, u, m),
    personalErfassung: "NUR_STAERKE",
    status: "IM_EINSATZ",
  });
}

describe("das frei gewählte Zeichen (§5.3)", () => {
  const GESETZT = feldEreignis(
    hlc(9, 0, "a"),
    9,
    "AbschnittZeichenGesetzt",
    { abschnittId: "EA-NORD" },
    null,
    "Einheiten/Bergungsgruppe",
  );

  it("trägt die gewählte Kennung in den Knoten", () => {
    const zustand = falte([EINSATZ, abschnitt(2, 2, "EA-NORD", "EA Nord", 1), GESETZT]);
    const knoten = abschnittsbaum(zustand, { ohneArchiv: true }).find((k) => k.id === "EA-NORD");
    expect(knoten?.zeichen).toBe("Einheiten/Bergungsgruppe");
  });

  it("lässt das Feld weg, solange niemand gewählt hat", () => {
    const zustand = falte([EINSATZ, abschnitt(2, 2, "EA-NORD", "EA Nord", 1)]);
    const knoten = abschnittsbaum(zustand, { ohneArchiv: true }).find((k) => k.id === "EA-NORD");
    // Weggelassen und nicht als leerer Text: Die Ansicht unterscheidet daran,
    // ob sie das Zeichen aus dem Typ ableiten soll.
    expect(knoten?.zeichen).toBeUndefined();
  });

  it("nimmt die Wahl zurück, wenn `neu` null ist", () => {
    const zurueck = feldEreignis(
      hlc(10, 0, "a"),
      10,
      "AbschnittZeichenGesetzt",
      { abschnittId: "EA-NORD" },
      "Einheiten/Bergungsgruppe",
      null,
    );
    const zustand = falte([EINSATZ, abschnitt(2, 2, "EA-NORD", "EA Nord", 1), GESETZT, zurueck]);
    const knoten = abschnittsbaum(zustand, { ohneArchiv: true }).find((k) => k.id === "EA-NORD");
    expect(knoten?.zeichen).toBeUndefined();
  });

  it("wirkt auf dem Auffang nicht (§5.3.4)", () => {
    const aufDenAuffang = feldEreignis(
      hlc(11, 0, "a"),
      11,
      "AbschnittZeichenGesetzt",
      { abschnittId: AUFFANG_ABSCHNITT_ID },
      null,
      "Einheiten/Bergungsgruppe",
    );
    const zustand = falte([EINSATZ, aufDenAuffang]);
    const auffang = abschnittsbaum(zustand, { ohneArchiv: true }).find(
      (k) => k.id === AUFFANG_ABSCHNITT_ID,
    );
    expect(auffang?.zeichen).toBeUndefined();
  });
});

describe("abschnittsbaum", () => {
  it("hängt Abschnitte unter ihren Elternteil und sortiert nach Reihenfolge, dann Id", () => {
    const zustand = falte([
      EINSATZ,
      abschnitt(2, 2, "FUEST", "FüSt 1", 0, undefined, "FUEHRUNGSSTELLE"),
      abschnitt(3, 3, "EA-SUED", "EA Süd", 5, "FUEST"),
      abschnitt(4, 4, "EA-NORD", "EA Nord", 5, "FUEST"),
      abschnitt(5, 5, "EA-WEST", "EA West", 1, "FUEST"),
    ]);
    const baum = abschnittsbaum(zustand, { ohneArchiv: true });
    const fuest = baum.find((k) => k.id === "FUEST");
    expect(fuest?.kinder.map((k) => k.id)).toEqual(["EA-WEST", "EA-NORD", "EA-SUED"]);
    // Bei gleicher Reihenfolge (5) entscheidet die Id in Codepoint-Ordnung
    // (§5.3, Sekundärsortierung): NORD vor SUED, unabhängig davon, dass SUED
    // zuerst angelegt wurde.
  });

  it("summiert die Stärke des Teilbaums, hält die eigene aber getrennt", () => {
    const zustand = falte([
      EINSATZ,
      abschnitt(2, 2, "FUEST", "FüSt 1", 0, undefined, "FUEHRUNGSSTELLE"),
      abschnitt(3, 3, "EA-NORD", "EA Nord", 1, "FUEST"),
      einheit(4, 4, "U1", "FUEST", 1, 0, 0),
      einheit(5, 5, "U2", "EA-NORD", 0, 1, 8),
    ]);
    const fuest = abschnittsbaum(zustand).find((k) => k.id === "FUEST");
    expect(fuest).toBeDefined();
    expect(fuest?.eigeneStaerke).toEqual({ fuehrer: 1, unterfuehrer: 0, mannschaft: 0 });
    expect(fuest?.summenStaerke).toEqual({ fuehrer: 1, unterfuehrer: 1, mannschaft: 8 });
    expect(fuest?.einheiten).toBe(1);
    expect(fuest?.einheitenSumme).toBe(2);
  });

  it("zeigt einen Abschnitt, dessen Elternkante der Zyklusregel zum Opfer fiel (§5.3.1)", () => {
    // X unter Y (HLC 5), Y unter X (HLC 7) — die größere HLC weicht, Y hängt
    // an der Wurzel. Prüffall T3, hier auf der Anzeigeseite.
    const zustand = falte([
      EINSATZ,
      abschnitt(2, 2, "X", "X", 0),
      abschnitt(3, 3, "Y", "Y", 0),
      {
        ...abschnittAngelegt(hlc(5, 0, "a"), 4, { abschnittId: "Z", name: "Z", abschnittstyp: "EINSATZORT", reihenfolge: 0 }),
        typ: "AbschnittUmgehaengt",
        nutzlast: { abschnittId: "X" },
        vorher: null,
        neu: "Y",
      } as EingehendesEreignis,
      {
        ...abschnittAngelegt(hlc(7, 0, "a"), 5, { abschnittId: "Z", name: "Z", abschnittstyp: "EINSATZORT", reihenfolge: 0 }),
        typ: "AbschnittUmgehaengt",
        nutzlast: { abschnittId: "Y" },
        vorher: null,
        neu: "X",
      } as EingehendesEreignis,
    ]);
    const zeilen = baumZeilen(abschnittsbaum(zustand, { ohneArchiv: true }));
    const y = zeilen.find((k) => k.id === "Y");
    expect(y?.tiefe).toBe(0);
    expect(y?.zyklusGeloest).toBe(true);
    // X hängt unter Y und ist damit nicht mehr Wurzel.
    expect(zeilen.find((k) => k.id === "X")?.tiefe).toBe(1);
  });

  it("hängt einen Abschnitt mit unbekanntem Elternteil an die Wurzel, statt ihn zu verlieren", () => {
    const zustand = falte([EINSATZ, abschnitt(2, 2, "EA-NORD", "EA Nord", 0, "NOCH-NICHT-DA")]);
    const knoten = abschnittsbaum(zustand, { ohneArchiv: true }).find((k) => k.id === "EA-NORD");
    expect(knoten).toBeDefined();
    expect(knoten?.tiefe).toBe(0);
    expect(knoten?.elternUnbekannt).toBe("NOCH-NICHT-DA");
  });

  it("führt die beiden Systemabschnitte und kennzeichnet sie", () => {
    const baum = abschnittsbaum(falte([EINSATZ]));
    const auffang = baum.find((k) => k.id === AUFFANG_ABSCHNITT_ID);
    const archiv = baum.find((k) => k.id === ARCHIV_ABSCHNITT_ID);
    expect(auffang?.systemAbschnitt).toBe(true);
    expect(auffang?.zaehlt).toBe(true);
    expect(archiv?.systemAbschnitt).toBe(true);
    expect(archiv?.zaehlt).toBe(false);
    // §5.3.4: `ARCHIV` steht mit reihenfolge 999999 am Ende jeder Sortierung.
    expect(baum[baum.length - 1]?.id).toBe(ARCHIV_ABSCHNITT_ID);
  });

  it("lässt aufgelöste Abschnitte stehen und nennt ihr Ziel", () => {
    const zustand = falte([
      EINSATZ,
      abschnitt(2, 2, "A", "A", 0),
      abschnitt(3, 3, "B", "B", 1),
      {
        ...abschnittAngelegt(hlc(9, 0, "a"), 4, { abschnittId: "Z", name: "Z", abschnittstyp: "EINSATZORT", reihenfolge: 0 }),
        typ: "AbschnittAufgeloest",
        nutzlast: { abschnittId: "A" },
        vorher: null,
        neu: { zielAbschnittId: "B", aufgeloestAm: "2026-09-08T10:00:00+02:00" },
      } as EingehendesEreignis,
    ]);
    expect(abschnittsbaum(zustand).find((k) => k.id === "A")?.aufgeloestNach).toBe("B");
    expect(abschnittsbaum(zustand, { ohneAufgeloeste: true }).find((k) => k.id === "A")).toBeUndefined();
  });
});

describe("schluesseZyklus", () => {
  const zustand = falte([
    EINSATZ,
    abschnitt(2, 2, "A", "A", 0),
    abschnitt(3, 3, "B", "B", 0, "A"),
    abschnitt(4, 4, "C", "C", 0, "B"),
  ]);

  it("weist den Abschnitt selbst und jeden Nachfahren zurück", () => {
    expect(schluesseZyklus(zustand, "A", "A")).toBe(true);
    expect(schluesseZyklus(zustand, "A", "B")).toBe(true);
    expect(schluesseZyklus(zustand, "A", "C")).toBe(true);
  });

  it("lässt einen Vorfahren und einen Fremden zu", () => {
    expect(schluesseZyklus(zustand, "C", "A")).toBe(false);
    expect(schluesseZyklus(zustand, "C", AUFFANG_ABSCHNITT_ID)).toBe(false);
  });
});

describe("aufloesungsziele", () => {
  it("lässt den Abschnitt selbst und ARCHIV aus", () => {
    const zustand = falte([EINSATZ, abschnitt(2, 2, "A", "A", 0), abschnitt(3, 3, "B", "B", 0)]);
    const ziele = aufloesungsziele(zustand, "A");
    expect(ziele).toContain("B");
    expect(ziele).toContain(AUFFANG_ABSCHNITT_ID);
    expect(ziele).not.toContain("A");
    expect(ziele).not.toContain(ARCHIV_ABSCHNITT_ID);
  });
});
