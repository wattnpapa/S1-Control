/**
 * Tests zum Blatt „Versorgung" und zu den Zahlen des Monitors (S4.1).
 *
 * Geprüft wird über der Prüflage, wo das Logistikblatt die Gegenprobe ist,
 * und über einer kleinen Lage für Sofortbedarf und Regeltext.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere } from "../fold.js";
import type { EingehendesEreignis } from "../fold.js";
import {
  abschnittAngelegt,
  einheitGemeldet,
  einsatzAngelegt,
  feldEreignis,
  hlc,
  staerke,
} from "../pruefhilfen/ereignisbau.js";
import { prueflageEreignisse } from "../pruefhilfen/pruefage.js";
import { MAHLZEITENREGEL_VORBELEGUNG } from "../werte.js";
import type { Zustand } from "../zustand.js";

import { logistikblatt } from "./logistik.js";
import { sofortbedarfsliste } from "./sofortbedarf.js";
import { unterbringungsbedarf } from "./unterkunft.js";
import { versorgungseinheiten } from "./versorgung.js";
import {
  mahlzeitenplan,
  regeltext,
  versorgungsblatt,
  versorgungszahlen,
} from "./versorgung-blatt.js";

const PRUEFJETZT = "2026-09-08T14:43:00+02:00";

function lage(): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), prueflageEreignisse()));
}

function kleineLage(): Zustand {
  let n = 0;
  const h = (): ReturnType<typeof hlc> => hlc(++n * 1000, 0, "a");
  const ereignisse: EingehendesEreignis[] = [
    einsatzAngelegt(h(), 1, { einsatzId: "X", name: "Sturm", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
    abschnittAngelegt(h(), 2, { abschnittId: "EA1", name: "EA 1", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    einheitGemeldet(h(), 3, { einheitId: "E1", abschnittId: "EA1", bezeichnung: "FGr N", organisation: "THW", ebene: "GRUPPE", staerke: staerke(0, 2, 10), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ", schicht: "NACHT" }),
    feldEreignis(h(), 4, "SofortbedarfGesetzt", { einheitId: "E1" }, null, {
      verpflegungPersonen: 12, dieselLiter: 400, benzinLiter: 60, gemischLiter: 0, unterbringung: true, ruhezeitErforderlich: true,
    }),
    feldEreignis(h(), 5, "LogistikGesetzt", { einheitId: "E1", feld: "weiblich" }, null, 2),
  ];
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

describe("Der Mahlzeitenplan (4d)", () => {
  it("summiert je Bereich nach Regel und führt den Anmarsch getrennt", () => {
    const z = lage();
    const blatt = logistikblatt(z);
    const plan = mahlzeitenplan(versorgungseinheiten(z, Date.parse(PRUEFJETZT)));
    expect(plan.summe.koepfe).toBe(blatt.gesamt.gesamt);
    expect(plan.anmarsch.koepfe).toBe(blatt.angefordert.gesamt);
    expect(plan.zeilen.map((z) => z.abschnittId)).toEqual(blatt.zeilen.map((z) => z.abschnittId));
    // Die Summe je Mahlzeit ist die Summe der Zeilen — keine zweite Rechnung.
    const abend = plan.zeilen.reduce((s, z) => s + z.jeMahlzeit.ABEND, 0);
    expect(plan.summe.jeMahlzeit.ABEND).toBe(abend);
  });

  it("schreibt die Regel als einen lesbaren Satz", () => {
    expect(regeltext(MAHLZEITENREGEL_VORBELEGUNG)).toBe(
      "Tag → Frühstück, Mittag, Abend · Nacht → Frühstück, Abend, Nacht · Früh → Frühstück, Mittag · Spät → Mittag, Abend",
    );
  });
});

describe("Unterbringung und Sofortbedarf", () => {
  it("listet den Übernachtungsbedarf nach m/w/d mit Ruhezeit", () => {
    const z = kleineLage();
    const zeilen = unterbringungsbedarf(z, versorgungseinheiten(z, Date.parse(PRUEFJETZT)));
    expect(zeilen).toEqual([
      expect.objectContaining({ einheitId: "E1", m: 10, w: 2, d: 0, ruhezeit: true, anmarsch: false, schicht: "NACHT", zustand: "OHNE_UNTERKUNFT" }),
    ]);
  });

  it("führt die Erstmeldung des Bogens mit Litersummen", () => {
    const z = kleineLage();
    const liste = sofortbedarfsliste(z, versorgungseinheiten(z, Date.parse(PRUEFJETZT)));
    expect(liste.zeilen).toHaveLength(1);
    expect(liste.summe).toEqual({ verpflegungPersonen: 12, dieselLiter: 400, benzinLiter: 60, gemischLiter: 0, unterbringung: 1, ruhezeit: 1 });
  });
});

describe("Die Zahlen des Monitors (Lagebild.versorgung)", () => {
  it("trägt je Mahlzeit sieben Zahlen und die Betten aus K6", () => {
    const z = lage();
    const zahlen = versorgungszahlen(z, { jetzt: PRUEFJETZT, versatzMinuten: 120 });
    expect(zahlen.mahlzeiten).toHaveLength(4);
    expect(zahlen.mahlzeiten[0]?.mahlzeit).toBe("ABEND");
    const un = logistikblatt(z).gesamt.uebernachtung;
    expect(zahlen.betten).toEqual({ ...un, gesamt: un.m + un.w + un.d });
    expect(zahlen.anmarsch).toBe(logistikblatt(z).angefordert.gesamt);
    const erste = zahlen.mahlzeiten[0];
    expect(erste?.portionen).toBe((erste?.bestand ?? 0) + (erste?.zugang ?? 0) - (erste?.abgang ?? 0));
    expect(zahlen.naechste?.portionen).toBe(erste?.bestand);
  });

  it("nennt im leeren Einsatz Nullen und keine nächste Mahlzeit ohne Zeit", () => {
    const leer = materialisiere(leereFaltung());
    expect(versorgungszahlen(leer, { jetzt: "kaputt" })).toEqual({ mahlzeiten: [], anmarsch: 0, betten: { m: 0, w: 0, d: 0, gesamt: 0 }, ohneZuweisung: 0, ohneZuweisungEinheiten: 0 });
  });

  it("baut das Blatt aus derselben Klassifizierung", () => {
    const blatt = versorgungsblatt(lage(), { jetzt: PRUEFJETZT, versatzMinuten: 120, stunden: 48 });
    expect(blatt.vorausschau.mahlzeiten).toHaveLength(8);
    expect(blatt.plan.summe.koepfe).toBe(logistikblatt(lage()).gesamt.gesamt);
    expect(blatt.regeltext).toContain("Nacht →");
    expect(blatt.unterbringung.summe.gesamt).toBe(blatt.unterbringung.zeilen.filter((z) => !z.anmarsch).reduce((s, z) => s + z.m + z.w + z.d, 0));
  });
});
