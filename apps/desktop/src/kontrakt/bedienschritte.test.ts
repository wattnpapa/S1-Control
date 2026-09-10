/**
 * Prüffälle zu den Bedienschritten der Einheitentabelle (M3.2).
 *
 * Sie messen die **Regel** und nicht die Maske: welches Ereignis eine
 * Handlung schreibt, mit welcher Nutzlast und mit welchem `vorher`. Dass ein
 * Knopf sie auslöst, prüft `Einheitentabelle.test.tsx`; dass die Wirkung
 * stimmt, prüfen die Szenarien im Worker.
 */

import { describe, expect, it } from "vitest";

import { projektion, type Spalte, type Tabellenzeile } from "@s1/domaene";

import {
  STATUS_VORBELEGUNG,
  anlageAusVorlage,
  aufteilung,
  eingabeAlsWert,
  entfernung,
  inlineEntwurf,
  verschiebung,
  zusammenfuehrung,
} from "./bedienschritte.js";

function spalte(schluessel: string): Spalte {
  const gefunden = projektion.spalte(schluessel);
  expect(gefunden).toBeDefined();
  return gefunden as Spalte;
}

function zeile(id: string, teil: Partial<Tabellenzeile> = {}): Tabellenzeile {
  return {
    einheitId: id,
    abschnittId: "EO",
    reihenfolge: 1,
    anzeige: `Einheit ${id}`,
    staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    gesamt: 9,
    entfernt: false,
    aufgegangen: false,
    hinweise: [],
    zellen: {},
    ...teil,
  };
}

describe("inlineEntwurf", () => {
  it("wählt die Ereignisart nach dem Schreibweg der Spalte, nicht nach ihrem Namen", () => {
    // Die Zuordnung steht in der Spaltentabelle von Ring 2 (§5.4). Eine
    // Fallunterscheidung über Spaltennamen hier wäre dieselbe Tabelle ein
    // zweites Mal — und die zweite veraltet.
    expect(inlineEntwurf(spalte("status"), "U1", "ANMARSCH", "IM_EINSATZ")?.typ).toBe("StatusGesetzt");
    expect(inlineEntwurf(spalte("schicht"), "U1", null, "TAG")?.typ).toBe("SchichtGesetzt");
    expect(inlineEntwurf(spalte("bezeichnung"), "U1", "A", "B")?.typ).toBe("EinheitStammdatenGeaendert");
    expect(inlineEntwurf(spalte("verfuegbarBis"), "U1", null, "2026-09-10T20:00:00+02:00")?.typ).toBe(
      "ZeitpunktGesetzt",
    );
    expect(inlineEntwurf(spalte("weiblich"), "U1", null, 3)?.typ).toBe("LogistikGesetzt");
  });

  it("benennt das Feld in der Nutzlast, wo die Ereignisart es verlangt", () => {
    const stammdaten = inlineEntwurf(spalte("bezeichnung"), "U1", "A", "B");
    expect(stammdaten?.nutzlast).toEqual({ einheitId: "U1", feld: "bezeichnung" });
    const logistik = inlineEntwurf(spalte("vegan"), "U1", null, 2);
    expect(logistik?.nutzlast).toEqual({ einheitId: "U1", feld: "vegan" });
    // Bei fester Feldwahl steht **kein** Feldname in der Nutzlast: Die Art
    // bestimmt das Feld (§5.1, `Feldwahl`).
    expect(inlineEntwurf(spalte("status"), "U1", "A", "B")?.nutzlast).toEqual({ einheitId: "U1" });
  });

  it("trägt den gesehenen Vorher-Wert (§2.2a, Auflage 6)", () => {
    const entwurf = inlineEntwurf(spalte("staerke"), "U1", { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 }, { fuehrer: 0, unterfuehrer: 1, mannschaft: 6 });
    expect(entwurf?.vorher).toEqual({ fuehrer: 0, unterfuehrer: 1, mannschaft: 8 });
    expect(entwurf?.neu).toEqual({ fuehrer: 0, unterfuehrer: 1, mannschaft: 6 });
  });

  it("liefert für eine berechnete Spalte nichts", () => {
    // „Gesamt“ ist in der Excel eine Formel (`=SUM(AJ:AL)`), und hier eine
    // Ableitung. Sie zu schreiben hieße, eine Summe gegen ihre Summanden
    // setzen zu können.
    expect(inlineEntwurf(spalte("gesamt"), "U1", 9, 10)).toBeUndefined();
  });
});

describe("eingabeAlsWert", () => {
  it("macht aus einer geleerten Eingabe null und nicht die leere Zeichenkette", () => {
    // §3.2 unterscheidet „nie gesetzt“ (das Feld fehlt) von „ausdrücklich als
    // leer gesetzt" (`null`). Wer ein Feld leert, meint das zweite.
    expect(eingabeAlsWert(spalte("bemerkung"), "   ")).toBeNull();
    expect(eingabeAlsWert(spalte("bemerkung"), "  Ablösung 20 Uhr ")).toBe("Ablösung 20 Uhr");
  });

  it("liest Zahlenspalten als ganze Zahlen", () => {
    expect(eingabeAlsWert(spalte("weiblich"), "3")).toBe(3);
    expect(eingabeAlsWert(spalte("weiblich"), "keine")).toBeNull();
  });
});

describe("anlageAusVorlage", () => {
  const vorlage = {
    id: "thw-bgr",
    katalog: "STAN_THW" as never,
    katalogVersion: "2025",
    organisation: "THW" as never,
    bezeichnung: "Bergungsgruppe",
    ebene: "GRUPPE" as never,
    sollStaerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    fahrzeuge: [],
  };

  it("übernimmt die Soll-Stärke der Vorlage", () => {
    const entwurf = anlageAusVorlage({ einheitId: "E1", abschnittId: "EO", vorlage, reihenfolge: 3 });
    const nutzlast = entwurf.nutzlast as Record<string, unknown>;
    expect(nutzlast["staerke"]).toEqual({ fuehrer: 0, unterfuehrer: 1, mannschaft: 8 });
    expect(nutzlast["vorlageId"]).toBe("thw-bgr");
  });

  it("erfindet keine Stärke, wo die Vorlage keine hergibt", () => {
    // Eine Zahl, die niemand gemeldet hat, ist in einer Stärkeübersicht der
    // gefährlichere Fehler.
    const ohne = { ...vorlage, sollStaerke: undefined };
    const entwurf = anlageAusVorlage({ einheitId: "E1", abschnittId: "EO", vorlage: ohne, reihenfolge: 1 });
    expect((entwurf.nutzlast as Record<string, unknown>)["staerke"]).toEqual({
      fuehrer: 0,
      unterfuehrer: 0,
      mannschaft: 0,
    });
  });

  it("legt mit Status „angefordert“ an, nicht als anwesend", () => {
    // Wer aus dem Vorlagenkatalog anlegt, plant Kräfte — er meldet sie nicht.
    const entwurf = anlageAusVorlage({ einheitId: "E1", abschnittId: "EO", vorlage, reihenfolge: 1 });
    expect((entwurf.nutzlast as Record<string, unknown>)["status"]).toBe(STATUS_VORBELEGUNG);
    expect(STATUS_VORBELEGUNG).toBe("ANGEFORDERT");
  });

  it("trägt die Herkunft als Hierarchiestufe mit den Feldnamen des Schemas", () => {
    const entwurf = anlageAusVorlage({
      einheitId: "E1",
      abschnittId: "EO",
      vorlage,
      reihenfolge: 1,
      herkunft: "THW OV Oldenburg",
    });
    // §5.1: Die Stufe heißt `art` und `name`. Der Aktendienst prüft die
    // Nutzlast gegen dieses Schema, bevor er schreibt.
    expect((entwurf.nutzlast as Record<string, unknown>)["hierarchie"]).toEqual([
      { art: "ORTSVERBAND", name: "THW OV Oldenburg" },
    ]);
  });
});

describe("verschiebung", () => {
  it("trägt den Abschnitt, aus dem verschoben wird, als Vorher-Wert", () => {
    const entwurf = verschiebung("U1", "EO", "EA-NORD");
    expect(entwurf.typ).toBe("EinheitVerschoben");
    expect(entwurf.vorher).toBe("EO");
    expect(entwurf.neu).toBe("EA-NORD");
  });
});

describe("aufteilung", () => {
  it("führt die abgeteilte Stärke zweimal — als Abzug und als Stärke der neuen Einheit", () => {
    // §5.4.2 verlangt beides gleich; das Schema lehnt eine Abweichung ab.
    const entwurf = aufteilung({
      quelle: zeile("U1"),
      neueEinheitId: "U1-A",
      bezeichnung: "Teil 1",
      abgeteilteStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 4 },
      abschnittId: "EO",
      reihenfolge: 2,
      organisation: "THW",
      ebene: "TRUPP",
    });
    const nutzlast = entwurf.nutzlast as Record<string, unknown>;
    const neueEinheit = nutzlast["neueEinheit"] as Record<string, unknown>;
    expect(nutzlast["abgeteilteStaerke"]).toEqual(neueEinheit["staerke"]);
  });

  it("führt die gesehene Quellstärke mit (§5.4.3)", () => {
    const entwurf = aufteilung({
      quelle: zeile("U1"),
      neueEinheitId: "U1-A",
      bezeichnung: "Teil 1",
      abgeteilteStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 4 },
      abschnittId: "EO",
      reihenfolge: 2,
      organisation: "THW",
      ebene: "TRUPP",
    });
    // Ohne sie könnte der Fold `vorgangSummeWeichtAb` nicht bilden.
    expect((entwurf.nutzlast as Record<string, unknown>)["gesehen"]).toEqual({
      fuehrer: 0,
      unterfuehrer: 1,
      mannschaft: 8,
    });
  });

  it("nimmt Fahrzeuge und Personen in denselben Vorgang", () => {
    // §5.9.2: Sonst zeigt alles, was auf die Quelle zeigte, weiter dorthin.
    const entwurf = aufteilung({
      quelle: zeile("U1"),
      neueEinheitId: "U1-A",
      bezeichnung: "Teil 1",
      abgeteilteStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 4 },
      abschnittId: "EO",
      reihenfolge: 2,
      organisation: "THW",
      ebene: "TRUPP",
      fahrzeugIds: ["F1"],
      personIds: ["P1", "P2"],
    });
    const nutzlast = entwurf.nutzlast as Record<string, unknown>;
    expect(nutzlast["uebernommeneFahrzeuge"]).toEqual([{ fahrzeugId: "F1", gesehenEinheitId: "U1" }]);
    expect(nutzlast["uebernommenePersonen"]).toHaveLength(2);
  });
});

describe("zusammenfuehrung", () => {
  it("führt je Quelle die gesehene Stärke", () => {
    const entwurf = zusammenfuehrung("U1", [zeile("U2"), zeile("U3", { staerke: { fuehrer: 1, unterfuehrer: 0, mannschaft: 0 } })]);
    expect((entwurf.nutzlast as Record<string, unknown>)["quellen"]).toEqual([
      { einheitId: "U2", gesehen: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 } },
      { einheitId: "U3", gesehen: { fuehrer: 1, unterfuehrer: 0, mannschaft: 0 } },
    ]);
  });
});

describe("entfernung", () => {
  it("trägt den Pflichtgrund und setzt den festen Wert des Katalogs", () => {
    // §2.4: Grund Pflicht. §5.4.5: Entfernen ist kein Löschen — `neu` ist
    // `true` und nicht das Verschwinden der Entität.
    const entwurf = entfernung("U1", "Doppelt gemeldet");
    expect(entwurf.grund).toBe("Doppelt gemeldet");
    expect(entwurf.neu).toBe(true);
  });
});
