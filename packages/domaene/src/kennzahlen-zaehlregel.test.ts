/**
 * Die eine Zählregel der Stärke (`zaehlklasse`, `zaehlstand`).
 *
 * Regressionstests zu Führung Runde 2, P0-1: Kopf, Tabelle, Baum und
 * Gliederung zählen bei gemischten Status dieselbe Ist-Stärke, und ein
 * Statuswechsel ändert sie sofort.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import * as K from "./kennzahlen.js";
import {
  abschnittAngelegt,
  einheitGemeldet,
  einsatzAngelegt,
  hlc,
  staerke,
  statusGesetzt,
} from "./pruefhilfen/ereignisbau.js";
import { abschnittsbaum, baumZeilen } from "./projektion/baum.js";
import { einheitentabelle } from "./projektion/tabelle.js";
import type { Zustand } from "./zustand.js";

let nr = 0;

function abschnitt(id: string, typ: string): EingehendesEreignis {
  nr += 1;
  return abschnittAngelegt(hlc(nr, 0, "aa"), nr, { abschnittId: id, name: id, abschnittstyp: typ, reihenfolge: nr });
}

function einheit(id: string, abschnittId: string, f: number, u: number, m: number, status: string): EingehendesEreignis {
  nr += 1;
  return einheitGemeldet(hlc(nr, 0, "aa"), nr, {
    einheitId: id,
    abschnittId,
    bezeichnung: id,
    organisation: "THW",
    ebene: "GRUPPE",
    staerke: staerke(f, u, m),
    personalErfassung: "NUR_STAERKE",
    status,
  });
}

function lage(weitere: readonly EingehendesEreignis[] = []): Zustand {
  nr = 0;
  nr += 1;
  const start = einsatzAngelegt(hlc(nr, 0, "aa"), nr, {
    einsatzId: "E1",
    name: "Zählregel",
    art: "EINSATZ",
    fuestName: "FüSt",
    beginn: "2026-09-08T08:00:00+02:00",
    schichtmodell: "ZWEI_SCHICHT",
  });
  const basis = [
    start,
    abschnitt("EO", "EINSATZORT"),
    abschnitt("ANF", "ANGEFORDERT"),
    abschnitt("BR", "BEREITSTELLUNGSRAUM"),
    einheit("IST1", "EO", 0, 1, 8, "IM_EINSATZ"),
    einheit("IST2", "BR", 1, 0, 3, "EINSATZBEREIT"),
    einheit("ANM", "EO", 0, 1, 5, "ANMARSCH"),
    einheit("ANG", "EO", 0, 0, 4, "ANGEFORDERT"),
    einheit("ANGB", "ANF", 0, 1, 2, "EINSATZBEREIT"),
  ];
  return materialisiere(falteHinzu(leereFaltung(), [...basis, ...weitere]));
}

const koepfe = (s: { fuehrer: number; unterfuehrer: number; mannschaft: number }): number =>
  s.fuehrer + s.unterfuehrer + s.mannschaft;

describe("Die Zählklasse einer Einheit", () => {
  it("entscheidet nach Status, nicht allein nach dem Bereich", () => {
    const zustand = lage();
    const klasse = (id: string): K.Zaehlklasse => K.zaehlklasse(zustand, zustand.einheiten[id] as never);
    expect(klasse("IST1")).toBe("ist");
    expect(klasse("IST2")).toBe("ist");
    // Angefordert/Anmarsch im Einsatzbereich: noch nicht vor Ort.
    expect(klasse("ANM")).toBe("erwartet");
    expect(klasse("ANG")).toBe("erwartet");
    // Im Bereich Angefordert zählt auch ein „Einsatzbereit“ nicht als Ist.
    expect(klasse("ANGB")).toBe("erwartet");
  });
});

describe("Kopf = Baum = Gliederung = Tabelle bei gemischten Status", () => {
  it("nennen dieselbe Ist-Stärke und dieselben erwarteten Köpfe", () => {
    const zustand = lage();
    const ist = K.einsatzGesamtstaerke(zustand).gesamt;
    expect(ist).toEqual(staerke(1, 1, 11));
    expect(K.staerkeAusserhalbDerGesamtstaerke(zustand).erwartet).toBe(13);

    const wurzeln = abschnittsbaum(zustand, { ohneArchiv: true, ohneEingang: true });
    const baumSumme = wurzeln.reduce((s, k) => s + koepfe(k.summenStaerke), 0);
    const baumErwartet = wurzeln.reduce((s, k) => s + k.erwartetSumme, 0);
    expect(baumSumme).toBe(koepfe(ist));
    expect(baumErwartet).toBe(13);
    expect(baumZeilen(abschnittsbaum(zustand)).find((k) => k.id === "EO")?.erwartet).toBe(10);

    const t = einheitentabelle(zustand, { gliederung: true });
    expect(t.gliederung?.einsatz.staerke).toEqual(ist);
    expect(koepfe(t.gliederung?.einsatz.erwartet ?? staerke(0, 0, 0))).toBe(13);
    const summeIst = t.zeilen.filter((z) => z.zaehlklasse === "ist").reduce((s, z) => s + z.gesamt, 0);
    expect(summeIst).toBe(koepfe(ist));
    // „Alle erfassten Einheiten“ ist ausdrücklich eine andere, größere Zahl.
    expect(koepfe(t.gliederung?.einsatz.alle ?? staerke(0, 0, 0))).toBe(koepfe(ist) + 13);
  });

  it("ein Statuswechsel auf Einsatzbereit ändert die Ist-Stärke sofort, ohne den Bereich zu wechseln", () => {
    const vorher = lage();
    const nachher = lage([statusGesetzt(hlc(500, 0, "aa"), 500, "ANM", "ANMARSCH", "EINSATZBEREIT")]);
    expect(K.einsatzGesamtstaerke(vorher).gesamt).toEqual(staerke(1, 1, 11));
    expect(K.einsatzGesamtstaerke(nachher).gesamt).toEqual(staerke(1, 2, 16));
    expect(K.staerkeAusserhalbDerGesamtstaerke(nachher).erwartet).toBe(7);
    expect(nachher.einheiten["ANM"]?.wirksamerAbschnittId).toBe("EO");
  });

  it("Rückmarsch und Einsatz beendet zählen weder als Ist noch als erwartet", () => {
    const zustand = lage([statusGesetzt(hlc(500, 0, "aa"), 500, "IST1", "IM_EINSATZ", "RUECKMARSCH")]);
    expect(K.einsatzGesamtstaerke(zustand).gesamt).toEqual(staerke(1, 0, 3));
    expect(K.staerkeAusserhalbDerGesamtstaerke(zustand).beendet).toBe(9);
  });
});

describe("Die Texte der Zählregel", () => {
  it("nennen die Nebenzahl verständlich und lassen sie bei null weg", () => {
    expect(K.erwartetText(4)).toBe("+4 erwartet (angefordert/Anmarsch/Eingang)");
    expect(K.erwartetText(0)).toBe("");
    expect(K.erwartetKurz(4)).toBe("+4 erwartet");
    expect(K.ZAEHLREGEL_TEXT).toContain("Ist-Stärke");
  });
});
