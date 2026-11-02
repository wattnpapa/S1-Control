/**
 * Tests zur Vorausschau der Verpflegung (S4.1, KONZEPT-S4.md §5.2).
 *
 * Die Randfälle stehen über handgebauten Lagen, weil sie an einer Minute
 * hängen: Zugang vor und nach der Ausgabezeit, Abgang genau zur Ausgabezeit,
 * eine Einheit ohne Zeit, ein leerer Einsatz, die Mahlzeit über Mitternacht.
 * Der Abgleich mit dem Logistikblatt läuft über die Prüflage.
 */

import { describe, expect, it } from "vitest";

import type { EingehendesEreignis } from "../fold.js";
import { falteHinzu, leereFaltung, materialisiere } from "../fold.js";
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
import { ausgabetermine, versorgungseinheiten, vorausschau } from "./versorgung.js";

const A = "a";
let laufnummer = 0;
function h(): ReturnType<typeof hlc> {
  laufnummer += 1;
  return hlc(laufnummer * 1000, 0, A);
}

/** Ortszeit MESZ (UTC+2) — die Prüflage liegt im September. */
const MESZ = 120;
/** 10. September 1443 Ortszeit. */
const JETZT = "2026-09-10T14:43:00+02:00";

function grundlage(): EingehendesEreignis[] {
  laufnummer = 0;
  return [
    einsatzAngelegt(h(), 1, {
      einsatzId: "X",
      name: "Hochwasser",
      art: "EINSATZ",
      fuestName: "FüSt",
      beginn: "2026-09-08T08:00:00+02:00",
      schichtmodell: "ZWEI_SCHICHT",
    }),
    abschnittAngelegt(h(), 2, { abschnittId: "EA1", name: "EA 1 Deich", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    abschnittAngelegt(h(), 3, { abschnittId: "ANF", name: "Anmarsch", abschnittstyp: "ANGEFORDERT", reihenfolge: 9 }),
  ];
}

let nr = 100;
function einheit(id: string, abschnittId: string, koepfe: number, schicht?: string, status = "IM_EINSATZ"): EingehendesEreignis {
  nr += 1;
  return einheitGemeldet(h(), nr, {
    einheitId: id,
    abschnittId,
    bezeichnung: `Einheit ${id}`,
    organisation: "THW",
    ebene: "GRUPPE",
    staerke: staerke(0, 1, koepfe - 1),
    personalErfassung: "NUR_STAERKE",
    status,
    ...(schicht === undefined ? {} : { schicht }),
  });
}

function zeit(id: string, feld: string, wert: string): EingehendesEreignis {
  nr += 1;
  return feldEreignis(h(), nr, "ZeitpunktGesetzt", { einheitId: id, feld }, null, wert);
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

function schau(z: Zustand, stunden = 24): ReturnType<typeof vorausschau> {
  return vorausschau(z, { jetzt: JETZT, versatzMinuten: MESZ, stunden });
}

describe("Die Zeitfolge der Mahlzeiten", () => {
  it("nennt bei 1443 Abend heute, Nacht 0000, Frühstück und Mittag morgen", () => {
    const termine = ausgabetermine(MAHLZEITENREGEL_VORBELEGUNG, Date.parse(JETZT), MESZ, 24);
    expect(termine.map((t) => `${t.mahlzeit} ${t.uhrzeit} +${String(t.tag)}`)).toEqual([
      "ABEND 1800 +0",
      "NACHT 0000 +1",
      "FRUEHSTUECK 0600 +1",
      "MITTAG 1200 +1",
    ]);
    // Über Mitternacht: Die Nachtverpflegung fällt auf den nächsten Kalendertag.
    expect(termine[1]?.zeitpunkt).toBe("2026-09-10T22:00:00.000Z");
  });

  it("weitet auf 48 Stunden — acht Mahlzeiten", () => {
    expect(ausgabetermine(MAHLZEITENREGEL_VORBELEGUNG, Date.parse(JETZT), MESZ, 48)).toHaveLength(8);
  });

  it("nimmt eine Mahlzeit genau jetzt mit — sie wird gerade ausgegeben", () => {
    const termine = ausgabetermine(MAHLZEITENREGEL_VORBELEGUNG, Date.parse("2026-09-10T18:00:00+02:00"), MESZ, 24);
    expect(termine[0]?.mahlzeit).toBe("ABEND");
    expect(termine).toHaveLength(4);
  });

  it("übergeht eine unlesbare Ausgabezeit statt zu raten", () => {
    const regel = [{ mahlzeit: "ABEND" as const, uhrzeit: "2500", schichten: ["TAG"] }];
    expect(ausgabetermine(regel, Date.parse(JETZT), MESZ, 24)).toEqual([]);
  });
});

describe("Die Vorausschau je Mahlzeit", () => {
  it("ist im leeren Einsatz eine Folge von Nullen, keine Lücke", () => {
    const ergebnis = schau(zustand(grundlage()));
    expect(ergebnis.mahlzeiten).toHaveLength(4);
    for (const m of ergebnis.mahlzeiten) expect(m.vorausschau.portionen).toBe(0);
    expect(ergebnis.bewegungen).toEqual([]);
  });

  it("liefert ohne lesbares jetzt nichts statt einer erfundenen Zeit", () => {
    expect(vorausschau(zustand(grundlage()), { jetzt: "gestern" }).mahlzeiten).toEqual([]);
  });

  it("filtert den Bestand nach Mahlzeitenregel und Schicht", () => {
    const z = zustand([...grundlage(), einheit("T", "EA1", 10, "TAG"), einheit("N", "EA1", 6, "NACHT"), einheit("O", "EA1", 3)]);
    const [abend, nacht, frueh, mittag] = schau(z).mahlzeiten;
    expect(abend?.bestand.portionen).toBe(19);
    expect(nacht?.bestand.portionen).toBe(6);
    expect(frueh?.bestand.portionen).toBe(19);
    // Ohne Schicht isst wie die Tagschicht — Mittag also T und O.
    expect(mittag?.bestand.portionen).toBe(13);
    expect(abend?.jeBereich).toEqual([{ abschnittId: "EA1", bereich: "EA 1 Deich", bestand: { portionen: 19, vegetarisch: 0, vegan: 0 } }]);
  });

  it("zählt einen Zugang ab der Eintreffzeit — vor der Ausgabezeit ja, danach nicht", () => {
    const z = zustand([
      ...grundlage(),
      einheit("Z", "ANF", 24, "TAG", "ANMARSCH"),
      zeit("Z", "eingetroffenAm", "2026-09-10T16:30:00+02:00"),
      einheit("S", "ANF", 8, "TAG", "ANMARSCH"),
      zeit("S", "eingetroffenAm", "2026-09-10T20:00:00+02:00"),
    ]);
    const [abend, , frueh] = schau(z).mahlzeiten;
    expect(abend?.zugang.portionen).toBe(24);
    expect(abend?.vorausschau.portionen).toBe(24);
    expect(frueh?.zugang.portionen).toBe(32);
  });

  it("zählt einen Zugang genau zur Ausgabezeit mit", () => {
    const z = zustand([
      ...grundlage(),
      einheit("Z", "ANF", 5, "TAG", "ANMARSCH"),
      zeit("Z", "eingetroffenAm", "2026-09-10T18:00:00+02:00"),
    ]);
    expect(schau(z).mahlzeiten[0]?.zugang.portionen).toBe(5);
  });

  it("nimmt eine Einheit im Anmarsch mit künftiger Zeit aus dem Bestand, auch im Einsatzbereich", () => {
    const z = zustand([
      ...grundlage(),
      einheit("Z", "EA1", 9, "TAG", "ANMARSCH"),
      zeit("Z", "eingetroffenAm", "2026-09-11T05:00:00+02:00"),
    ]);
    const [abend, , frueh] = schau(z).mahlzeiten;
    expect(abend?.bestand.portionen).toBe(0);
    expect(abend?.zugang.portionen).toBe(0);
    expect(frueh?.zugang.portionen).toBe(9);
  });

  it("zählt einen Abgang genau zur Ausgabezeit als gegangen", () => {
    const z = zustand([
      ...grundlage(),
      einheit("G", "EA1", 14, "TAG"),
      zeit("G", "verfuegbarBis", "2026-09-10T18:00:00+02:00"),
    ]);
    const abend = schau(z).mahlzeiten[0];
    expect(abend?.bestand.portionen).toBe(14);
    expect(abend?.abgang.portionen).toBe(14);
    expect(abend?.vorausschau.portionen).toBe(0);
  });

  it("nimmt das früheste Ende aus verfügbar bis, Einsatzende und Rückführung", () => {
    const z = zustand([
      ...grundlage(),
      einheit("G", "EA1", 6, "TAG"),
      zeit("G", "verfuegbarBis", "2026-09-12T10:00:00+02:00"),
      zeit("G", "einsatzendeAm", "2026-09-11T10:00:00+02:00"),
    ]);
    const ergebnis = schau(z);
    expect(ergebnis.mahlzeiten.map((m) => m.abgang.portionen)).toEqual([0, 0, 0, 6]);
    expect(ergebnis.bewegungen).toEqual([
      expect.objectContaining({ art: "ABGANG", einheitId: "G", koepfe: 6, grund: "Einsatzende" }),
    ]);
  });

  it("führt eine Einheit ohne Zeit als „nicht eingerechnet“ und nicht in der Zahl", () => {
    const z = zustand([...grundlage(), einheit("V", "ANF", 14, "TAG", "ANGEFORDERT")]);
    const ergebnis = schau(z);
    for (const m of ergebnis.mahlzeiten) expect(m.vorausschau.portionen).toBe(0);
    expect(ergebnis.bewegungen).toEqual([
      expect.objectContaining({ art: "OHNE_ZEIT", einheitId: "V", koepfe: 14 }),
    ]);
    expect(ergebnis.bewegungen[0]?.zeitpunkt).toBeUndefined();
  });

  it("ordnet die Bewegungen nach Zeit und stellt die ohne Zeit ans Ende", () => {
    const z = zustand([
      ...grundlage(),
      einheit("V", "ANF", 4, "TAG", "ANGEFORDERT"),
      einheit("G", "EA1", 6, "TAG"),
      zeit("G", "verfuegbarBis", "2026-09-11T06:00:00+02:00"),
      einheit("Z", "ANF", 24, "TAG", "ANMARSCH"),
      zeit("Z", "eingetroffenAm", "2026-09-10T16:30:00+02:00"),
      einheit("F", "EA1", 3, "TAG"),
      zeit("F", "rueckfuehrungAm", "2026-09-13T06:00:00+02:00"),
    ]);
    expect(schau(z).bewegungen.map((b) => `${b.art} ${b.einheitId}`)).toEqual(["ZUGANG Z", "ABGANG G", "OHNE_ZEIT V"]);
    // Erst bei 48 h fällt die Rückführung von F nicht in den Horizont — sie liegt noch weiter.
    expect(schau(z, 48).bewegungen.some((b) => b.einheitId === "F")).toBe(false);
  });
});

describe("Abgleich mit dem Logistikblatt", () => {
  it("rechnet denselben Bestand wie das Blatt „Log“, wenn niemand im Anmarsch ist", () => {
    const z = zustand(prueflageEreignisse());
    const blatt = logistikblatt(z);
    const jetzt = Date.parse("2026-09-08T09:00:00+02:00");
    const bestand = versorgungseinheiten(z, jetzt).filter((e) => e.klasse === "BESTAND");
    const koepfe = bestand.reduce((s, e) => s + e.kost.portionen, 0);
    const vegetarisch = bestand.reduce((s, e) => s + e.kost.vegetarisch, 0);
    expect(koepfe).toBe(blatt.gesamt.gesamt);
    expect(vegetarisch).toBe(blatt.gesamt.vegetarisch);
    const anmarsch = versorgungseinheiten(z, jetzt).filter((e) => e.klasse !== "BESTAND");
    expect(anmarsch.reduce((s, e) => s + e.kost.portionen, 0)).toBe(blatt.angefordert.gesamt);
  });
});
