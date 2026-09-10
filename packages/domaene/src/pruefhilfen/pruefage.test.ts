/**
 * Prüffälle zur synthetischen Prüflage (M4.0).
 *
 * Sie messen die Lage, nicht die Ausgaben: Bevor ein Goldfile über ihr
 * entsteht, muss feststehen, dass sie **enthält, was sie zu enthalten
 * behauptet** — sonst prüft ein Goldfile über einer Lage ohne
 * Nachtschichteinheiten fröhlich eine leere Zeile.
 *
 * Und sie hält die drei Kontrollsummen fest, die das Blatt „Status" der Excel
 * mit sich führt (`excel-domaenenmodell.md` §4.2). Eine Ausgabe, deren eigene
 * Probe nicht aufgeht, ist schon ohne die Excel falsch.
 */

import { describe, expect, it } from "vitest";

import { PRUEFLAGE_ID, PRUEFLAGE_ZUSICHERUNGEN, prueflageEreignisse } from "./pruefage.js";
import { falteHinzu, leereFaltung, materialisiere } from "../fold.js";
import * as kennzahlen from "../kennzahlen.js";
import type { Zustand } from "../zustand.js";

function lage(): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), prueflageEreignisse()));
}

describe("Die Prüflage", () => {
  it("ist bit-stabil: zweimal gebaut ergibt dieselbe Folge", () => {
    // Ohne diese Eigenschaft wäre jedes Goldfile darüber wertlos — es müsste
    // jeden Morgen neu abgenommen werden.
    expect(JSON.stringify(prueflageEreignisse())).toBe(JSON.stringify(prueflageEreignisse()));
  });

  it("erzeugt keinen einzigen Konflikthinweis", () => {
    // Eine Lage mit Hinweisen macht jede Zahländerung in einem Goldfile zu
    // einer Untersuchung. Hinweise gehören in die Prüffälle des Folds.
    expect(lage().hinweise).toEqual([]);
    expect(lage().unbekannt).toEqual([]);
  });

  it("führt den Einsatz als Übung", () => {
    const zustand = lage();
    expect(zustand.einsatz?.id).toBe(PRUEFLAGE_ID);
    // §5.2: `UEBUNG` ist einer der drei geschlossenen Werte. Eine Prüflage
    // als „EINSATZ" zu führen hiesse, einen Ausdruck zu erzeugen, der von
    // einem echten nicht zu unterscheiden wäre.
    expect(zustand.einsatz?.art.wert).toBe("UEBUNG");
  });

  it("meldet die versprochene Zahl an Einheiten", () => {
    expect(Object.keys(lage().einheiten)).toHaveLength(PRUEFLAGE_ZUSICHERUNGEN.gemeldeteEinheiten);
  });

  it("belegt jeden der neun Statuswerte", () => {
    const matrix = kennzahlen.matrixStatus(lage());
    for (const status of PRUEFLAGE_ZUSICHERUNGEN.statuswerte) {
      expect(Object.keys(matrix), `Status ${status} fehlt in der Prüflage`).toContain(status);
    }
  });

  it("belegt jeden der vier Schichtwerte", () => {
    const matrix = kennzahlen.matrixSchicht(lage());
    for (const schicht of PRUEFLAGE_ZUSICHERUNGEN.schichtwerte) {
      expect(Object.keys(matrix), `Schicht ${schicht} fehlt in der Prüflage`).toContain(schicht);
    }
  });

  it("hält angeforderte Kräfte aus der Gesamtstärke heraus und weist sie getrennt aus", () => {
    const { gesamt, angefordert } = kennzahlen.einsatzGesamtstaerke(lage());
    // §5.3: `ANGEFORDERT` zählt nicht — wer angefordert ist, ist noch nicht da.
    expect(angefordert.fuehrer + angefordert.unterfuehrer + angefordert.mannschaft).toBeGreaterThan(0);
    const summe = gesamt.fuehrer + gesamt.unterfuehrer + gesamt.mannschaft;
    expect(summe).toBeGreaterThan(200);
    expect(kennzahlen.einheitenDerGesamtstaerke(lage()).every((e) => e.wirksamerAbschnittId !== "ANF")).toBe(true);
  });

  it("führt einen Abschnitt ohne jede Einheit", () => {
    const zustand = lage();
    const leer = PRUEFLAGE_ZUSICHERUNGEN.leererAbschnitt;
    expect(zustand.abschnitte[leer]).toBeDefined();
    expect(kennzahlen.einheitenImAbschnitt(zustand, leer)).toHaveLength(0);
    // K7 und §4.1 der Bestandsaufnahme: Das Druckblatt zeigt eine Zeile nur,
    // wenn sie Kräfte trägt — `Worksheet_Activate` blendet die übrigen aus.
    expect(kennzahlen.imDruckSichtbar(zustand, leer)).toBe(false);
    // Ein Einsatzort **mit** Kräften erscheint dagegen.
    expect(kennzahlen.imDruckSichtbar(zustand, "EO1")).toBe(true);
    // Und der angeforderte Bereich nie, auch mit Kräften nicht.
    expect(kennzahlen.imDruckSichtbar(zustand, PRUEFLAGE_ZUSICHERUNGEN.angefordertAbschnitt)).toBe(false);
  });

  it("hält die entfernte Einheit im Zustand und aus jeder Summe", () => {
    const zustand = lage();
    const id = PRUEFLAGE_ZUSICHERUNGEN.entfernteEinheit;
    expect(zustand.einheiten[id]).toBeDefined();
    expect(zustand.einheiten[id]?.entfernt?.wert).toBe(true);
    expect(kennzahlen.einheitenDerLage(zustand).some((e) => e.id === id)).toBe(false);
  });

  it("erhält die Summe über die Aufteilung hinweg (§5.4.2)", () => {
    const zustand = lage();
    // Quelle 0/1/8, davon 0/0/3 abgeteilt: 0/1/5 bleiben, 0/0/3 stehen an der
    // neuen Einheit. Die Summe über beide ist unverändert 9.
    const quelle = zustand.einheiten["E40"];
    const neu = zustand.einheiten["E40-A"];
    expect(quelle?.wirksameStaerke).toEqual({ fuehrer: 0, unterfuehrer: 1, mannschaft: 5 });
    expect(neu?.wirksameStaerke).toEqual({ fuehrer: 0, unterfuehrer: 0, mannschaft: 3 });
  });
});

describe("Die Kontrollsummen des Blatts „Status“", () => {
  it("K21: Σ_Status − Σ_Organisation = 0", () => {
    // `excel-domaenenmodell.md` §4.2, G36: „Einheiten ohne Statusangabe oder
    // Organisation". Weicht die Probe ab, fehlt bei mindestens einer Einheit
    // eines von beiden.
    expect(kennzahlen.konsistenzStatus(lage())).toBe(0);
  });

  it("K23: Σ_Schicht − Σ_Organisation + Σ_ANGEFORDERT = 0", () => {
    // §4.2, G43: Angeforderte Kräfte dürfen ohne Schicht sein — genau
    // deshalb steht ihr Anteil in der Probe.
    expect(kennzahlen.konsistenzSchicht(lage())).toBe(0);
  });

  it("K25: keine Einheit ohne Pflichtangabe", () => {
    expect(kennzahlen.einheitenOhnePflichtangabe(lage())).toEqual([]);
  });

  it("K8: die Plausibilitätsprobe des Druckblatts geht auf", () => {
    // §4.1, Spalte L: `Fü + UFü + He − Gesamt = 0` je Zeile.
    expect(kennzahlen.druckPlausibel(lage())).toBe(true);
  });
});
