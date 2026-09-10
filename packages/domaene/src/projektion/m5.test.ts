/**
 * Tests zu den vier Projektionen von M5.0.
 *
 * Geprüft wird über der Prüflage und nicht über handgebauten Zuständen: Die
 * Lage trägt seit M5 je eine Anforderung in jedem Zustand aus §5.6.2,
 * Dienstposten in allen fünf Teilbereichen, Logistikwerte und PSA-Sätze. Ein
 * Test gegen einen selbst zusammengesetzten Zustand prüfte die Testhilfe.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere } from "../fold.js";
import * as kennzahlen from "../kennzahlen.js";
import { PRUEFLAGE_ZUSICHERUNGEN, prueflageEreignisse } from "../pruefhilfen/pruefage.js";
import type { Zustand } from "../zustand.js";

import {
  ANFORDERUNG_ZUSTAENDE,
  anforderungZurEinheit,
  anforderungsliste,
} from "./anforderung.js";
import { TEILBEREICHE, dienstpostenblatt, fuestStaerke, rolleDerFunktion, schichtplanblatt } from "./fuest.js";
import { kostenblatt } from "./kosten.js";
import { LOG_SCHICHTEN, logistikblatt, logistikzeile } from "./logistik.js";

function lage(): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), prueflageEreignisse()));
}

describe("Die Anforderungsliste (§5.6)", () => {
  it("zeigt jede Anforderung in dem Zustand, den §5.6.2 ableitet", () => {
    const liste = anforderungsliste(lage());
    expect(liste.gesamtzahl).toBe(PRUEFLAGE_ZUSICHERUNGEN.anforderungen);
    expect(liste.zeilen.map((z) => z.zustand)).toEqual([
      "OFFEN",
      "ZUGESAGT",
      "EINGETROFFEN",
      "STORNIERT",
    ]);
    // Offen zuerst: Das ist die Arbeitsliste der Führungsstelle.
    expect(liste.zeilen[0]?.kennung).toBe("ANF-2026-001");
    for (const wert of ANFORDERUNG_ZUSTAENDE) expect(liste.jeZustand[wert]).toBe(1);
  });

  it("liest die Zusage unter dem Schlüssel, den der Fold plausibilisiert", () => {
    const zugesagt = anforderungsliste(lage(), { zustaende: ["ZUGESAGT"] }).zeilen[0];
    // §2.5: `zugesagtFuer` ist die Planzeit; `zustand.ts` beschreibt das Feld
    // abweichend, und das ist ein Befund, kein Grund für einen zweiten Pfad.
    expect(zugesagt?.zugesagtFuer).toBe("2026-09-08T16:00:00+02:00");
    expect(zugesagt?.zugesagtVon).toBe("THW RB Oldenburg");
    expect(zugesagt?.storniert).toBe(false);
  });

  it("zeigt beim Storno nur, dass storniert wurde — der Katalog trägt dort `true`", () => {
    const storniert = anforderungsliste(lage(), { zustaende: ["STORNIERT"] }).zeilen[0];
    expect(storniert?.storniert).toBe(true);
    expect(storniert?.erledigtAm).toBeUndefined();
  });

  it("filtert über den Volltext und schneidet einen Ausschnitt heraus", () => {
    const gesucht = anforderungsliste(lage(), { suche: "pumpwerk" });
    expect(gesucht.zeilen).toHaveLength(1);
    expect(gesucht.zeilen[0]?.kennung).toBe("ANF-2026-002");

    const ausschnitt = anforderungsliste(lage(), { von: 1, anzahl: 2 });
    expect(ausschnitt.zeilen).toHaveLength(2);
    expect(ausschnitt.gesamtzahl).toBe(PRUEFLAGE_ZUSICHERUNGEN.anforderungen);
    expect(ausschnitt.von).toBe(1);
  });

  it("findet die Anforderung, die an einer Einheitenzeile steht", () => {
    const zustand = lage();
    expect(anforderungZurEinheit(zustand, "E12")?.kennung).toBe("ANF-2026-001");
    // Eine stornierte zählt nicht als Ablösung dieser Einheit (K12).
    expect(anforderungZurEinheit(zustand, "E01")).toBeUndefined();
  });

  it("nennt den Namen der abzulösenden Einheit und nicht ihre Kennung", () => {
    const offen = anforderungsliste(lage(), { zustaende: ["OFFEN"] }).zeilen[0];
    expect(offen?.abzuloesendeEinheitId).toBe("E12");
    expect(offen?.abzuloesendeEinheit).toContain("BGr");
  });
});

describe("Das Blatt der Führungsstelle (§5.7)", () => {
  it("ordnet die Posten in die fünf Teilbereiche der Vorlage", () => {
    const blatt = dienstpostenblatt(lage());
    expect(blatt.map((block) => block.teileinheit)).toEqual(
      TEILBEREICHE.filter((name) => PRUEFLAGE_ZUSICHERUNGEN.teilbereiche.includes(name)),
    );
    const gesamt = blatt.reduce((summe, block) => summe + block.zeilen.length, 0);
    expect(gesamt).toBe(PRUEFLAGE_ZUSICHERUNGEN.dienstposten);
  });

  it("summiert je Schicht nur die besetzten Posten", () => {
    const stab = dienstpostenblatt(lage()).find((block) => block.teileinheit === "Stab");
    // D01 (Ltr FüSt, Tag, besetzt) ist Führer, D03 und D05 (SGL) Unterführer,
    // D06 (FüGeh) ebenfalls; D04 ist unbesetzt und zählt nicht.
    expect(stab?.summeJeSchicht["TAG"]).toEqual({ fuehrer: 1, unterfuehrer: 3, mannschaft: 0 });
    expect(stab?.summeJeSchicht["NACHT"]).toEqual({ fuehrer: 1, unterfuehrer: 0, mannschaft: 0 });
  });

  it("ordnet Funktionen nach der Vorbelegung einer Rolle zu", () => {
    expect(rolleDerFunktion("Ltr FüSt")).toBe("fuehrer");
    expect(rolleDerFunktion("SGL 3")).toBe("unterfuehrer");
    expect(rolleDerFunktion("GrFü K")).toBe("unterfuehrer");
    expect(rolleDerFunktion("SprFu/Kf")).toBe("mannschaft");
    // Eine Funktion, die die Vorbelegung nicht kennt, ist Helfer und kein
    // Fehler (§3.7 sinngemäß).
    expect(rolleDerFunktion("Sichter Drohne")).toBe("mannschaft");
  });

  it("liefert K17 mit derselben Zuordnung — je Teileinheit und Schicht eine Zeile", () => {
    const zeilen = fuestStaerke(lage());
    const besetzte = zeilen.reduce(
      (summe, z) => summe + z.staerke.fuehrer + z.staerke.unterfuehrer + z.staerke.mannschaft,
      0,
    );
    expect(besetzte).toBe(PRUEFLAGE_ZUSICHERUNGEN.besetzteDienstposten);
  });

  it("baut die Spalten des Schichtplans aus den Daten, nicht aus einem Kalender", () => {
    const plan = schichtplanblatt(lage());
    expect(plan.tage).toEqual(PRUEFLAGE_ZUSICHERUNGEN.schichtplanTage);
    // Jeder Dienstposten bekommt eine Zeile — auch der ohne Eintrag. Das ist
    // die Zeile, in die jemand den ersten schreibt (§5.7).
    expect(plan.zeilen).toHaveLength(PRUEFLAGE_ZUSICHERUNGEN.dienstposten);
    const ltr = plan.zeilen.find((z) => z.dienstpostenId === "D01");
    expect(Object.keys(ltr?.tage ?? {})).toEqual(["2026-09-08", "2026-09-09"]);
  });

  it("schneidet den Plan auf ein Fenster zu", () => {
    const plan = schichtplanblatt(lage(), { von: "2026-09-09" });
    expect(plan.tage).toEqual(["2026-09-09"]);
    expect(plan.zeilen.find((z) => z.dienstpostenId === "D02")?.tage).toEqual({});
  });
});

describe("Das Blatt „Log“ (§4.3)", () => {
  it("führt eine Zeile je Bereich und blendet leere aus", () => {
    const blatt = logistikblatt(lage());
    const namen = blatt.zeilen.map((z) => z.name);
    expect(namen).toContain("FüSt Oldenburg");
    // Der leere Einsatzort fällt heraus — die Vorlage blendet ihn per Makro
    // aus (`t_log`).
    expect(namen).not.toContain("EA Reserve");
    // Der angeforderte Bereich steht getrennt und nicht zwischen den anderen.
    expect(namen).not.toContain("Angefordert / Anmarsch");
    expect(blatt.angefordert.gesamt).toBeGreaterThan(0);
  });

  it("rechnet männlich als Rest — die Lesart des Log-Blatts", () => {
    const zeile = logistikzeile(lage(), "LOG");
    // E05 meldet 2 weiblich und 1 divers, E06 fünf weiblich.
    expect(zeile.weiblich).toBe(7);
    expect(zeile.divers).toBe(1);
    expect(zeile.maennlich).toBe(zeile.gesamt - zeile.weiblich - zeile.divers);
  });

  it("verteilt die Stärke auf die vier Schichtspalten der Vorlage", () => {
    const zeile = logistikzeile(lage(), "FUEST");
    const summe = LOG_SCHICHTEN.reduce((s, schicht) => s + (zeile.jeSchicht[schicht] ?? 0), 0);
    // Jede Einheit der Führungsstelle trägt eine der vier Schichten, also geht
    // die Summe der Spalten D bis G hier genau auf Spalte H auf.
    expect(summe).toBe(zeile.gesamt);
  });

  it("hält die Gesamtzeile getrennt von den angeforderten Kräften", () => {
    const zustand = lage();
    const blatt = logistikblatt(zustand);
    const ausZeilen = blatt.zeilen.reduce((s, z) => s + z.gesamt, 0);
    expect(blatt.gesamt.gesamt).toBe(ausZeilen);
    // Dieselbe Zahl, die K3 als Gesamtstärke der Lage führt.
    const k3 = kennzahlen.einsatzGesamtstaerke(zustand).gesamt;
    expect(blatt.gesamt.gesamt).toBe(k3.fuehrer + k3.unterfuehrer + k3.mannschaft);
  });

  it("führt leere Bereiche mit, wenn man es verlangt", () => {
    const mitLeeren = logistikblatt(lage(), { mitLeeren: true });
    expect(mitLeeren.zeilen.map((z) => z.name)).toContain("EA Reserve");
  });
});

describe("Die Kostenübersicht (AN bis AW)", () => {
  it("nennt die vier Parameter des Einsatzes einmal und nicht je Zeile", () => {
    const blatt = kostenblatt(lage());
    expect(blatt.parameter).toEqual({
      psaKostenProSatz: 180,
      vdaProTag: 150,
      ukVerpflegungProTag: 20,
      geplanteEinsatztage: 5,
    });
  });

  it("rechnet je Einheit mit K13 bis K16 und nicht selbst nach", () => {
    const zustand = lage();
    const blatt = kostenblatt(zustand);
    const zeile = blatt.zeilen.find((z) => z.einheitId === "E20");
    const einheit = zustand.einheiten["E20"];
    expect(zeile).toBeDefined();
    expect(einheit).toBeDefined();
    const erwartet = kennzahlen.kosten(zustand, einheit as never);
    expect(zeile?.psaProTag).toBe(erwartet.psaProTag);
    expect(zeile?.vdaUkProTag).toBe(erwartet.vdaUkProTag);
    expect(zeile?.personentage).toBe(erwartet.personentage);
    expect(zeile?.gesamt).toBe(erwartet.gesamt);
    expect(zeile?.psaSaetzeProTag).toBe(2);
  });

  it("lässt angeforderte Kräfte heraus und sagt, wie viele es waren", () => {
    const blatt = kostenblatt(lage());
    expect(blatt.zeilen.some((z) => z.abschnittId === "ANF")).toBe(false);
    // Drei angeforderte Einheiten stehen in der Prüflage.
    expect(blatt.ausgenommen).toBe(3);
  });

  it("summiert über alle Zeilen", () => {
    const blatt = kostenblatt(lage());
    const ausZeilen = blatt.zeilen.reduce((s, z) => s + z.gesamt, 0);
    expect(blatt.summe.gesamt).toBe(ausZeilen);
    expect(blatt.summe.gesamt).toBeGreaterThan(0);
  });
});
