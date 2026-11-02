/**
 * Eine Versorgungslage zum Prüfen der Oberfläche (S4.1) — die Zahlen der
 * Mockups („Hochwasser Oldenburg", 101443SEP26).
 *
 * Handgeschrieben und nicht aus Ring 2 gerechnet: Die Rechnung prüfen die
 * Tests in `@s1/domaene`; hier geht es darum, was die Oberfläche aus
 * fertigen Zahlen macht.
 */

import type { Kost, Logistikzeile } from "@s1/domaene";

import type { Lagebild, Versorgungsansicht, Versorgungszahlen } from "../../kontrakt/index.js";

/** 10.09.2026 1443 Ortszeit des Prüfrechners. */
export const BEISPIEL_JETZT = new Date(2026, 8, 10, 14, 43).getTime();

function um(tag: number, stunde: number): string {
  return new Date(2026, 8, tag, stunde, 0).toISOString();
}

const k = (portionen: number, vegetarisch: number, vegan: number): Kost => ({ portionen, vegetarisch, vegan });

export const BEISPIEL_ZAHLEN: Versorgungszahlen = {
  naechste: { mahlzeit: "ABEND", zeitpunkt: um(10, 18), portionen: 268, vegetarisch: 31, vegan: 6 },
  mahlzeiten: [
    { mahlzeit: "ABEND", zeitpunkt: um(10, 18), portionen: 292, vegetarisch: 33, vegan: 6, bestand: 268, zugang: 24, abgang: 0 },
    { mahlzeit: "NACHT", zeitpunkt: um(11, 0), portionen: 60, vegetarisch: 8, vegan: 2, bestand: 60, zugang: 0, abgang: 0 },
    { mahlzeit: "FRUEHSTUECK", zeitpunkt: um(11, 6), portionen: 278, vegetarisch: 32, vegan: 6, bestand: 268, zugang: 24, abgang: 14 },
    { mahlzeit: "MITTAG", zeitpunkt: um(11, 12), portionen: 212, vegetarisch: 24, vegan: 4, bestand: 208, zugang: 24, abgang: 20 },
  ],
  anmarsch: 24,
  betten: { m: 118, w: 22, d: 2, gesamt: 142 },
};

function zeile(abschnittId: string, name: string, tag: number, nacht: number, rest: readonly number[]): Logistikzeile {
  const [w = 0, d = 0, veg = 0, vegan = 0, m = 0, uw = 0, ud = 0] = rest;
  return {
    abschnittId,
    name,
    typ: "EINSATZORT",
    jeSchicht: { FRUEH: 0, SPAET: 0, TAG: tag, NACHT: nacht },
    gesamt: tag + nacht,
    maennlich: tag + nacht - w - d,
    weiblich: w,
    divers: d,
    vegetarisch: veg,
    vegan,
    uebernachtung: { m, w: uw, d: ud },
  };
}

const ZEILEN = [
  zeile("FUEST", "Führungsstelle", 8, 4, [2, 0, 2, 0, 6, 2, 0]),
  zeile("LOG", "Logistik", 14, 0, [1, 0, 1, 0, 5, 1, 0]),
  zeile("BR", "Bereitstellungsraum", 38, 0, [3, 0, 4, 1, 0, 0, 0]),
  zeile("EA1", "EA 1 Deich Nord", 64, 32, [12, 1, 12, 3, 61, 12, 1]),
];

const plan = (id: string, bereich: string, f: number, mi: number, a: number, n: number, veg: number, vegan: number) => ({
  abschnittId: id,
  bereich,
  jeMahlzeit: { FRUEHSTUECK: f, MITTAG: mi, ABEND: a, NACHT: n },
  koepfe: Math.max(f, a),
  vegetarisch: veg,
  vegan,
});

export const BEISPIEL_ANSICHT: Versorgungsansicht = {
  lageZeiger: 12,
  jetzt: new Date(BEISPIEL_JETZT).toISOString(),
  logistik: {
    zeilen: ZEILEN,
    gesamt: { ...zeile("GESAMT", "Gesamt", 124, 36, [18, 1, 19, 4, 72, 15, 1]), typ: "GESAMT" },
    angefordert: { ...zeile("ANGEFORDERT", "Angefordert / Anmarsch", 0, 0, [4, 0, 2, 0, 18, 4, 0]), gesamt: 24, typ: "ANGEFORDERT" },
  },
  logistikFussnote: "Männl. ist abgeleitet.",
  blatt: {
    regeltext: "Tag → Frühstück, Mittag, Abend · Nacht → Frühstück, Abend, Nacht",
    plan: {
      regel: [
        { mahlzeit: "FRUEHSTUECK", uhrzeit: "0600", schichten: ["TAG", "NACHT"] },
        { mahlzeit: "MITTAG", uhrzeit: "1200", schichten: ["TAG"] },
        { mahlzeit: "ABEND", uhrzeit: "1800", schichten: ["TAG", "NACHT"] },
        { mahlzeit: "NACHT", uhrzeit: "0000", schichten: ["NACHT"] },
      ],
      zeilen: [plan("FUEST", "Führungsstelle", 12, 8, 12, 4, 2, 0), plan("EA1", "EA 1 Deich Nord", 96, 64, 96, 32, 12, 3)],
      summe: plan("GESAMT", "Gesamt", 108, 72, 108, 36, 14, 3),
      anmarsch: plan("ANGEFORDERT", "Angefordert / Anmarsch", 24, 24, 24, 0, 2, 0),
    },
    vorausschau: {
      stunden: 24,
      mahlzeiten: BEISPIEL_ZAHLEN.mahlzeiten.map((m, i) => ({
        mahlzeit: m.mahlzeit as "ABEND",
        uhrzeit: ["1800", "0000", "0600", "1200"][i] ?? "",
        zeitpunkt: m.zeitpunkt,
        tag: i === 0 ? 0 : 1,
        bestand: k(m.bestand, 31, 6),
        zugang: k(m.zugang, 2, 0),
        abgang: k(m.abgang, 1, 0),
        vorausschau: k(m.portionen, m.vegetarisch, m.vegan),
        jeBereich: [
          { abschnittId: "FUEST", bereich: "Führungsstelle", bestand: k(12, 2, 0) },
          { abschnittId: "EA1", bereich: "EA 1 Deich Nord", bestand: k(96, 12, 3) },
        ],
      })),
      bewegungen: [
        { art: "ZUGANG", einheitId: "Z1", einheit: "2. Zug FF Hude", bereich: "Anmarsch", schicht: "TAG", koepfe: 24, zeitpunkt: um(10, 16), grund: "Anmarsch, Eintreffen gemeldet" },
        { art: "ABGANG", einheitId: "G1", einheit: "FGr WP Cloppenburg", bereich: "EA 2 Pumpen Süd", schicht: "TAG", koepfe: 14, zeitpunkt: um(11, 6), grund: "verfügbar bis" },
        { art: "OHNE_ZEIT", einheitId: "V1", einheit: "FGr WP Vechta", bereich: "Anmarsch", schicht: "TAG", koepfe: 14, grund: "Anmarsch ohne Eintreffzeit" },
      ],
    },
    unterbringung: {
      zeilen: [
        { einheitId: "E1", einheit: "2. Zug FF Rastede", bereich: "EA 1 Deich Nord", schicht: "NACHT", m: 14, w: 2, d: 0, ruhezeit: true, anmarsch: false },
        { einheitId: "Z1", einheit: "2. Zug FF Hude", bereich: "Anmarsch", schicht: "TAG", m: 18, w: 4, d: 0, ruhezeit: false, anmarsch: true },
      ],
      summe: { m: 14, w: 2, d: 0, gesamt: 16, einheiten: 1 },
      anmarsch: { m: 18, w: 4, d: 0, gesamt: 22, einheiten: 1 },
    },
    sofortbedarf: {
      zeilen: [
        { einheitId: "E1", einheit: "2. Zug FF Rastede", bereich: "EA 1 Deich Nord", eingetroffenAm: um(10, 14), verpflegungPersonen: 22, dieselLiter: 400, benzinLiter: 60, gemischLiter: 0, unterbringung: true, ruhezeit: true },
      ],
      summe: { verpflegungPersonen: 22, dieselLiter: 400, benzinLiter: 60, gemischLiter: 0, unterbringung: 1, ruhezeit: 1 },
    },
  },
};

/** Ein Lagebild mit der Versorgung — für Monitor und Blatt. */
export const BEISPIEL_LAGEBILD: Lagebild = {
  einsatzId: "E1",
  einsatzName: "Hochwasser Oldenburg",
  einsatzArt: "EINSATZ",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: new Date(BEISPIEL_JETZT - 6000).toISOString(),
  letzterShareKontakt: new Date(BEISPIEL_JETZT - 3000).toISOString(),
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 6,
  einheiten: 42,
  gesamtstaerke: { fuehrer: 24, unterfuehrer: 61, mannschaft: 183 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 12,
  versorgung: BEISPIEL_ZAHLEN,
};
