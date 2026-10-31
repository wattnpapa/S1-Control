/**
 * Prüffälle zur Gliederung der Einheitentabelle nach Bereichen.
 *
 * Gemessen wird die Zusage, die die Kopfzeilen dem Bediener machen: Die Zahl
 * an einem Bereich ist dieselbe wie im Abschnittsbaum, die Zahl am Einsatz
 * dieselbe wie im Kopfband (K3). Zwei Zahlen für dieselbe Sache ohne
 * Erklärung waren der Befund, den diese Gliederung beheben soll.
 */

import { describe, expect, it } from "vitest";

import { einsatzGesamtstaerke } from "../kennzahlen.js";
import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import {
  abschnittAngelegt,
  einheitGemeldet,
  einheitVerschoben,
  einsatzAngelegt,
  hlc,
  staerke,
} from "../pruefhilfen/ereignisbau.js";
import type { Zustand } from "../zustand.js";
import { abschnittsbaum, baumZeilen } from "./baum.js";
import { einheitentabelle } from "./tabelle.js";

function falte(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

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

function einheit(id: string, abschnittId: string, s: ReturnType<typeof staerke>, status = "IM_EINSATZ"): EingehendesEreignis {
  laufnummer += 1;
  return einheitGemeldet(hlc(laufnummer, 0, "aa"), laufnummer, {
    einheitId: id,
    abschnittId,
    bezeichnung: `Einheit ${id}`,
    organisation: "THW",
    ebene: "GRUPPE",
    staerke: s,
    personalErfassung: "NUR_STAERKE",
    status,
  });
}

/**
 * Die Lage: eine Führungsstelle, Angefordert, ein Einsatzort mit
 * Unterabschnitt, ein leerer Einsatzort — und eine beendete Einheit.
 */
function lage(): Zustand {
  return falte([
    einsatzAngelegt(hlc(1, 0, "aa"), 1, {
      einsatzId: "E1",
      name: "Hochwasser",
      art: "EINSATZ",
      fuestName: "FüSt 1",
      beginn: "2026-09-08T08:00:00+02:00",
      schichtmodell: "ZWEI_SCHICHT",
    }),
    abschnitt("FUEST", "FUEHRUNGSSTELLE", 1),
    abschnitt("ANF", "ANGEFORDERT", 2),
    abschnitt("EA1", "EINSATZORT", 3),
    abschnitt("UA1", "EINSATZORT", 1, "EA1"),
    abschnitt("EA2", "EINSATZORT", 4),
    einheit("U1", "FUEST", staerke(1, 1, 1)),
    einheit("U2", "ANF", staerke(0, 1, 8), "ANMARSCH"),
    einheit("U3", "EA1", staerke(1, 2, 10)),
    einheit("U4", "UA1", staerke(0, 1, 5)),
    einheit("U5", "UA1", staerke(0, 0, 4), "BEREITSTELLUNG"),
    einheit("U6", "EA1", staerke(0, 1, 2)),
    einheitVerschoben(hlc(900, 0, "aa"), 900, "U6", "EA1", "ARCHIV"),
  ]);
}

describe("einheitentabelle mit gliederung", () => {
  it("ordnet die Bereiche wie den Abschnittsbaum und die Zeilen darunter", () => {
    const zustand = lage();
    const tabelle = einheitentabelle(zustand, { gliederung: true });
    const bereiche = tabelle.gliederung?.bereiche ?? [];
    const baumordnung = baumZeilen(abschnittsbaum(zustand, { ohneAufgeloeste: true }))
      .map((k) => k.id)
      .filter((id) => id !== "EINGANG");
    expect(bereiche.map((b) => b.abschnittId)).toEqual(baumordnung);
    expect(bereiche.map((b) => b.abschnittId)).toEqual(["FUEST", "ANF", "EA1", "UA1", "EA2", "ARCHIV"]);
    expect(bereiche.find((b) => b.abschnittId === "UA1")?.tiefe).toBe(1);
    expect(tabelle.zeilen.map((z) => z.einheitId)).toEqual(["U1", "U2", "U3", "U4", "U5", "U6"]);
    // `von` zeigt auf die erste Zeile des Bereichs in der Gesamtliste.
    expect(bereiche.map((b) => [b.abschnittId, b.von, b.zeilen])).toEqual([
      ["FUEST", 0, 1],
      ["ANF", 1, 1],
      ["EA1", 2, 1],
      ["UA1", 3, 2],
      ["EA2", 5, 0],
      ["ARCHIV", 5, 1],
    ]);
  });

  it("summiert je Bereich wie der Baum: eigene Stärke und mit Unterabschnitten", () => {
    const zustand = lage();
    const bereiche = einheitentabelle(zustand, { gliederung: true }).gliederung?.bereiche ?? [];
    const baum = baumZeilen(abschnittsbaum(zustand));
    for (const bereich of bereiche.filter((b) => b.abschnittId !== "ARCHIV")) {
      const knoten = baum.find((k) => k.id === bereich.abschnittId);
      expect(bereich.staerke).toEqual(knoten?.eigeneStaerke);
      expect(bereich.summenStaerke).toEqual(knoten?.summenStaerke);
      expect(bereich.einheiten).toBe(knoten?.einheiten);
      expect(bereich.einheitenSumme).toBe(knoten?.einheitenSumme);
    }
    const ea1 = bereiche.find((b) => b.abschnittId === "EA1");
    expect(ea1?.staerke).toEqual(staerke(1, 2, 10));
    expect(ea1?.summenStaerke).toEqual(staerke(1, 3, 19));
    expect(bereiche.find((b) => b.abschnittId === "ANF")?.zaehlt).toBe(false);
  });

  it("führt am Bereich „Einsatz beendet“ die Einheiten darunter, ohne dass ihre Stärke als Ist zählt", () => {
    const archiv = einheitentabelle(lage(), { gliederung: true }).gliederung?.bereiche.find(
      (b) => b.abschnittId === "ARCHIV",
    );
    expect(archiv?.name).toBe("Einsatz beendet");
    expect(archiv?.staerke).toEqual(staerke(0, 0, 0));
    expect(archiv?.einheiten).toBe(1);
    expect(archiv?.zaehlt).toBe(false);
  });

  it("zeigt am Einsatz dieselbe Gesamtstärke wie das Kopfband und Angefordert daneben", () => {
    const zustand = lage();
    const einsatz = einheitentabelle(zustand, { gliederung: true }).gliederung?.einsatz;
    const k3 = einsatzGesamtstaerke(zustand);
    expect(einsatz?.staerke).toEqual(k3.gesamt);
    expect(einsatz?.angefordert).toEqual(k3.angefordert);
    expect(einsatz?.einheiten).toBe(4);
    expect(einsatz?.angefordertEinheiten).toBe(1);
  });

  it("zählt „Alle erfassten Einheiten“ ohne beendet und weist beendet/Rückmarsch ausdrücklich aus", () => {
    const einsatz = einheitentabelle(lage(), { gliederung: true }).gliederung?.einsatz;
    expect(einsatz?.beendetEinheiten).toBeGreaterThan(0);
    // Ist + erwartet + beendet ergeben alle erfassten Einheiten des früheren Zählstands.
    const gesamtKoepfe = (s: { fuehrer: number; unterfuehrer: number; mannschaft: number } | undefined): number =>
      (s?.fuehrer ?? 0) + (s?.unterfuehrer ?? 0) + (s?.mannschaft ?? 0);
    expect(gesamtKoepfe(einsatz?.alle)).toBe(gesamtKoepfe(einsatz?.staerke) + gesamtKoepfe(einsatz?.erwartet));
    expect(einsatz?.alleEinheiten).toBe((einsatz?.einheiten ?? 0) + (einsatz?.erwartetEinheiten ?? 0));
  });

  it("lässt leere Bereiche auf Wunsch weg — und Eingang ohnehin, solange dort nichts wartet", () => {
    const zustand = lage();
    const mit = einheitentabelle(zustand, { gliederung: true }).gliederung?.bereiche ?? [];
    expect(mit.map((b) => b.abschnittId)).not.toContain("EINGANG");
    const ohne = einheitentabelle(zustand, { gliederung: true, ohneLeereBereiche: true }).gliederung?.bereiche ?? [];
    expect(ohne.map((b) => b.abschnittId)).toEqual(["FUEST", "ANF", "EA1", "UA1", "ARCHIV"]);
  });

  it("behält einen Bereich, dessen Unterabschnitt Zeilen hat, auch ohne eigene", () => {
    const zustand = lage();
    const nurUa = einheitentabelle(zustand, { gliederung: true, ohneLeereBereiche: true, suche: "Einheit U4" });
    expect(nurUa.gliederung?.bereiche.map((b) => b.abschnittId)).toEqual(["EA1", "UA1"]);
    expect(nurUa.zeilen.map((z) => z.einheitId)).toEqual(["U4"]);
  });

  it("verträgt sich mit dem Statusfilter: Summen über die gefilterte Menge", () => {
    const tabelle = einheitentabelle(lage(), { gliederung: true, status: ["IM_EINSATZ"] });
    expect(tabelle.zeilen.map((z) => z.einheitId)).toEqual(["U1", "U3", "U4", "U6"]);
    const ua1 = tabelle.gliederung?.bereiche.find((b) => b.abschnittId === "UA1");
    expect(ua1?.zeilen).toBe(1);
    expect(ua1?.staerke).toEqual(staerke(0, 1, 5));
    expect(tabelle.gliederung?.einsatz.staerke).toEqual(staerke(2, 4, 16));
    // Die Statusleiste zählt weiter vor dem Filter.
    expect(tabelle.jeStatus["ANMARSCH"]?.anzahl).toBe(1);
  });

  it("zeigt bei gewähltem Abschnitt nur dessen Kopfzeile", () => {
    const tabelle = einheitentabelle(lage(), { gliederung: true, abschnittId: "UA1" });
    expect(tabelle.gliederung?.bereiche.map((b) => b.abschnittId)).toEqual(["UA1"]);
    expect(tabelle.zeilen.map((z) => z.einheitId)).toEqual(["U4", "U5"]);
  });

  it("schneidet den Ausschnitt aus der gegliederten Reihe; die Kopfzeilen gelten für alle Treffer", () => {
    const tabelle = einheitentabelle(lage(), { gliederung: true, von: 3, anzahl: 2 });
    expect(tabelle.zeilen.map((z) => z.einheitId)).toEqual(["U4", "U5"]);
    expect(tabelle.gesamtzahl).toBe(6);
    expect(tabelle.gliederung?.bereiche).toHaveLength(6);
  });

  it("lässt die flache Ausgabe ohne die Option unverändert", () => {
    const flach = einheitentabelle(lage());
    expect(flach.gliederung).toBeUndefined();
    expect(Object.keys(flach).sort()).toEqual(["gesamtzahl", "jeStatus", "von", "zeilen"]);
  });
});
