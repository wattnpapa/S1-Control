/**
 * Die Kennzahlen K1 bis K30 gegen eine **von Hand gerechnete Referenzlage**.
 *
 * Die DoD von M1.3 verlangt genau das. Die Lage steht deshalb unten
 * ausgeschrieben, mit den Zahlen daneben; jede Erwartung im Test ist aus
 * dieser Tabelle abgelesen und nicht aus dem Code gezogen.
 *
 * ```
 * Abschnitt EO  (EINSATZORT)     U1 0/1/8   U2 1/0/3
 * Abschnitt LOG (LOGISTIK)       U4 0/0/4
 * Abschnitt AN  (ANGEFORDERT)    U3 0/1/5
 * Abschnitt EO                   U5 0/0/6   entfernt
 * ARCHIV                         U6 0/0/2   archiviert
 *
 * E   (Lage ohne ARCHIV)         U1, U2, U3, U4          = 1/2/20, 23 Koepfe
 * E*  (zaehlt in Gesamtstaerke)  U1, U2, U4              = 1/1/15, 17 Koepfe
 * ANGEFORDERT                    U3                      = 0/1/5,   6 Koepfe
 * ```
 */

import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION, ereignisId } from "./ereignis.js";
import { falte, type EingehendesEreignis } from "./fold.js";
import * as K from "./kennzahlen.js";
import {
  abschnittAngelegt,
  akteur,
  einheitGemeldet,
  einsatzAngelegt,
  hlc,
  staerke,
} from "./pruefhilfen/ereignisbau.js";
import { ARCHIV_ABSCHNITT_ID, EINGANG_ABSCHNITT_ID } from "./zustand.js";
import type { Staerke } from "./werte.js";

const BEZUG = Date.parse("2026-09-08T08:00:00+02:00");
let laufnummer = 0;

function bau(
  millisekunden: number,
  typ: string,
  nutzlast: unknown,
  weiteres: Partial<EingehendesEreignis> = {},
): EingehendesEreignis {
  laufnummer += 1;
  const h = hlc(millisekunden, 0, "aa");
  return {
    id: ereignisId("aa", laufnummer),
    hlc: h,
    schemaVersion: SCHEMA_VERSION,
    akteur: akteur("aa"),
    wanduhr: new Date(BEZUG + millisekunden).toISOString(),
    typ,
    nutzlast,
    ...weiteres,
  };
}

function abschnitt(ms: number, id: string, typ: string) {
  laufnummer += 1;
  return abschnittAngelegt(hlc(ms, 0, "aa"), laufnummer, {
    abschnittId: id,
    name: `Abschnitt ${id}`,
    abschnittstyp: typ,
    reihenfolge: ms,
  });
}

function einheit(
  ms: number,
  id: string,
  abschnittId: string,
  s: Staerke,
  organisation: string,
  status: string,
  schicht?: string,
) {
  laufnummer += 1;
  return einheitGemeldet(hlc(ms, 0, "aa"), laufnummer, {
    einheitId: id,
    abschnittId,
    bezeichnung: `Einheit ${id}`,
    organisation,
    ebene: "GRUPPE",
    staerke: s,
    personalErfassung: "VOLLSTAENDIG",
    status,
    ...(schicht === undefined ? {} : { schicht }),
  });
}

function person(ms: number, id: string, einheitId: string, geschlecht: string, ernaehrung: string) {
  return bau(ms, "PersonHinzugefuegt", {
    personId: id,
    einheitId,
    nachname: `Nach${id}`,
    vorname: `Vor${id}`,
    rolle: "MANNSCHAFT",
    funktionen: [],
    fahrerlaubnisse: [],
    geschlecht,
    ernaehrung,
    kontakte: [],
    zusatzqualifikationen: [],
  });
}

function fahrzeug(ms: number, id: string, einheitId: string, typ: string) {
  return bau(ms, "FahrzeugAngelegt", {
    fahrzeugId: id,
    einheitId,
    typ,
    status: "EINSATZBEREIT",
  });
}

/** Die Referenzlage aus dem Kopf dieser Datei, als Ereignismenge. */
function referenzlage(): EingehendesEreignis[] {
  laufnummer = 0;
  return [
    einsatzAngelegt(hlc(1, 0, "aa"), 1000, {
      einsatzId: "E",
      name: "Hochwasser Weser-Ems",
      art: "UEBUNG",
      fuestName: "FueSt Oldenburg",
      beginn: "2026-09-08T08:00:00+02:00",
      schichtmodell: "ZWEI_SCHICHT",
      kosten: {
        psaKostenProSatz: 180,
        vdaProTag: 150,
        ukVerpflegungProTag: 20,
        geplanteEinsatztage: 5,
      },
    }),
    abschnitt(10, "EO", "EINSATZORT"),
    abschnitt(11, "LOG", "LOGISTIK"),
    abschnitt(12, "AN", "ANGEFORDERT"),

    einheit(20, "U1", "EO", staerke(0, 1, 8), "THW", "IM_EINSATZ", "TAG"),
    einheit(21, "U2", "EO", staerke(1, 0, 3), "FEUERWEHR", "RUHE", "NACHT"),
    einheit(22, "U3", "AN", staerke(0, 1, 5), "THW", "ANGEFORDERT"),
    einheit(23, "U4", "LOG", staerke(0, 0, 4), "DRK", "IM_EINSATZ", "TAG"),
    einheit(24, "U5", "EO", staerke(0, 0, 6), "THW", "IM_EINSATZ", "TAG"),
    einheit(25, "U6", "EO", staerke(0, 0, 2), "THW", "IM_EINSATZ", "TAG"),

    // U5 ist entfernt, U6 liegt im Archivabschnitt — beide sind aus der Lage.
    bau(30, "EinheitEntfernt", { einheitId: "U5" }, { neu: true, grund: "Doppelmeldung" }),
    bau(31, "EinheitArchiviert", { einheitId: "U6" }, { neu: ARCHIV_ABSCHNITT_ID, vorher: "EO" }),

    // Drei Personen an U1: eine weiblich und vegetarisch, eine divers und
    // vegan, eine maennlich mit Fleisch.
    person(40, "P1", "U1", "WEIBLICH", "VEGETARISCH"),
    person(41, "P2", "U1", "DIVERS", "VEGAN"),
    person(42, "P3", "U1", "MAENNLICH", "FLEISCH"),

    // Zwei GKW und ein MLW an U1.
    fahrzeug(50, "F1", "U1", "GKW"),
    fahrzeug(51, "F2", "U1", "GKW"),
    fahrzeug(52, "F3", "U1", "MLW"),

    bau(60, "PsaBedarfGesetzt", { einheitId: "U1" }, { neu: 1 }),
    bau(61, "EinheitStammdatenGeaendert", { einheitId: "U1", feld: "teilEtikett" }, {
      neu: "1. Trupp",
    }),
    bau(62, "EinheitStammdatenGeaendert", { einheitId: "U1", feld: "bemerkung" }, {
      neu: "Pumpe defekt",
    }),
    bau(63, "EinheitStammdatenGeaendert", { einheitId: "U1", feld: "hierarchie" }, {
      neu: [{ art: "Ortsverband", name: "Oldenburg", kurz: "OL", telefon: "0441-1", email: "ol@thw" }],
    }),
    bau(64, "ZeitpunktGesetzt", { einheitId: "U1", feld: "verfuegbarBis" }, {
      neu: "2026-09-09T08:00:00+02:00",
    }),

    bau(70, "AuftragErfasst", {
      auftragId: "A1",
      einheitId: "U1",
      von: "2026-09-08T09:00:00+02:00",
      bis: "2026-09-08T12:00:00+02:00",
      abschnittId: "EO",
      text: "Deich sichern",
      quelle: "MANUELL",
    }),

    bau(80, "AnforderungAngelegt", {
      anforderungId: "AN1",
      kennung: "FueSt-2026-17",
      abzuloesendeEinheitId: "U1",
      angefordertAm: "2026-09-08T09:00:00+02:00",
    }),
    bau(81, "AnforderungAngelegt", {
      anforderungId: "AN2",
      abzuloesendeEinheitId: "U1",
      angefordertAm: "2026-09-08T11:00:00+02:00",
    }),

    bau(90, "DienstpostenAngelegt", {
      dienstpostenId: "D1",
      teileinheit: "Zugtrupp",
      funktion: "Zugfuehrer",
      schicht: "TAG",
      reihenfolge: 1,
    }),
    bau(91, "DienstpostenAngelegt", {
      dienstpostenId: "D2",
      teileinheit: "Zugtrupp",
      funktion: "Fernmelder",
      schicht: "TAG",
      reihenfolge: 2,
    }),
    bau(92, "DienstpostenBesetzt", { dienstpostenId: "D1" }, { neu: "Meier" }),
    bau(93, "DienstpostenBesetzt", { dienstpostenId: "D2" }, { neu: "Schulz" }),

    // Zwei Revisionen derselben Reihe: M2 ist juenger nach `stand`, obwohl M1
    // spaeter empfangen wurde.
    bau(100, "EebMeldungEmpfangen", {
      meldungId: "M1",
      einheitSchluessel: "THW-OL-B1",
      stand: "2026-09-08T07:00:00+02:00",
      empfangenAm: "2026-09-08T10:00:00+02:00",
      quelle: "SCAN",
      bogen: {},
    }),
    bau(101, "EebMeldungEmpfangen", {
      meldungId: "M2",
      einheitSchluessel: "THW-OL-B1",
      stand: "2026-09-08T09:00:00+02:00",
      empfangenAm: "2026-09-08T09:30:00+02:00",
      quelle: "SCAN",
      bogen: {},
    }),
  ];
}

const zustand = falte(referenzlage());
const u = (id: string) => {
  const einheit = zustand.einheiten[id];
  if (einheit === undefined) throw new Error(`Einheit ${id} fehlt in der Referenzlage`);
  return einheit;
};

describe("Die Referenzlage ist die, die im Kopf steht", () => {
  it("faltet ohne Hinweise auf ungueltige Ereignisse", () => {
    expect(zustand.unbekannt).toEqual([]);
  });

  it("hat sechs Einheiten, davon vier in der Lage und drei in der Gesamtstaerke", () => {
    expect(Object.keys(zustand.einheiten).sort()).toEqual(["U1", "U2", "U3", "U4", "U5", "U6"]);
    expect(K.einheitenDerLage(zustand).map((e) => e.id)).toEqual(["U1", "U2", "U3", "U4"]);
    expect(K.einheitenDerGesamtstaerke(zustand).map((e) => e.id)).toEqual(["U1", "U2", "U4"]);
  });
});

describe("K1 bis K3 — Staerkesummen", () => {
  it("K1: die Gesamtstaerke einer Einheit", () => {
    expect(K.gesamtstaerke(u("U1"))).toBe(9);
    expect(K.gesamtstaerke(u("U2"))).toBe(4);
    expect(K.gesamtstaerke(u("U3"))).toBe(6);
  });

  it("K2: die Staerke eines Abschnitts, je Rolle", () => {
    // EO traegt U1 (0/1/8) und U2 (1/0/3); U5 ist entfernt, U6 im Archiv.
    expect(K.abschnittStaerke(zustand, "EO")).toEqual(staerke(1, 1, 11));
    expect(K.abschnittStaerke(zustand, "LOG")).toEqual(staerke(0, 0, 4));
    expect(K.abschnittStaerke(zustand, "AN")).toEqual(staerke(0, 1, 5));
  });

  it("K3: die Gesamtstaerke des Einsatzes, mit ANGEFORDERT daneben", () => {
    expect(K.einsatzGesamtstaerke(zustand)).toEqual({
      gesamt: staerke(1, 1, 15),
      angefordert: staerke(0, 1, 5),
    });
  });
});

describe("K4 bis K6 — Logistik", () => {
  it("K4 und K5: gezaehlt ueber die Personen, `maennlich` als Rest", () => {
    expect(K.logistik(zustand, u("U1"))).toEqual({
      weiblich: 1,
      divers: 1,
      // 9 Koepfe minus eine weibliche minus eine diverse Person.
      maennlich: 7,
      vegetarisch: 1,
      vegan: 1,
    });
  });

  it("K4: ohne Personen ist alles null, und `maennlich` ist die ganze Staerke", () => {
    expect(K.logistik(zustand, u("U2"))).toEqual({
      weiblich: 0,
      divers: 0,
      maennlich: 4,
      vegetarisch: 0,
      vegan: 0,
    });
  });

  it("K4: ein Override sticht die Zaehlung", () => {
    const mitOverride = falte([
      ...referenzlage(),
      bau(200, "LogistikGesetzt", { einheitId: "U2", feld: "weiblich" }, { neu: 2 }),
    ]);
    const zahlen = K.logistik(mitOverride, mitOverride.einheiten["U2"] as never);
    expect(zahlen.weiblich).toBe(2);
    expect(zahlen.maennlich).toBe(2);
  });

  it("K6: ohne Sofortbedarf keine Uebernachtung, mit Sofortbedarf die Logistikzahlen", () => {
    expect(K.uebernachtung(zustand, u("U1"))).toEqual({ m: 0, w: 0, d: 0 });

    const mitBedarf = falte([
      ...referenzlage(),
      bau(200, "SofortbedarfGesetzt", { einheitId: "U1" }, {
        neu: {
          verpflegungPersonen: 9,
          dieselLiter: 0,
          benzinLiter: 0,
          gemischLiter: 0,
          unterbringung: true,
          ruhezeitErforderlich: false,
        },
      }),
    ]);
    expect(K.uebernachtung(mitBedarf, mitBedarf.einheiten["U1"] as never)).toEqual({
      m: 7,
      w: 1,
      d: 1,
    });
  });
});

describe("K7 und K8 — Druck", () => {
  it("K7: ein Abschnitt mit Kraeften erscheint, ANGEFORDERT nie", () => {
    expect(K.imDruckSichtbar(zustand, "EO")).toBe(true);
    expect(K.imDruckSichtbar(zustand, "LOG")).toBe(true);
    expect(K.imDruckSichtbar(zustand, "AN")).toBe(false);
    // Der Eingang traegt in dieser Lage niemanden.
    expect(K.imDruckSichtbar(zustand, "EINGANG")).toBe(false);
  });

  it("K7: der Eingang erscheint auch mit Kraeften nicht im Druck", () => {
    // Eine Einheit meldet einen Abschnitt, dessen Anlage noch aussteht: Sie
    // liegt im Eingang (§5.3.3) — sichtbar im Zustand, aber weder im Druck
    // noch in der Gesamtstaerke.
    const mitEingang = falte([
      ...referenzlage(),
      einheit(9000, "U9", "NOCH_NICHT_DA", staerke(1, 1, 1), "THW", "IM_EINSATZ"),
    ]);
    expect(mitEingang.einheiten["U9"]?.wirksamerAbschnittId).toBe(EINGANG_ABSCHNITT_ID);
    expect(mitEingang.einheiten["U9"]?.zaehlt).toBe(false);
    expect(K.imDruckSichtbar(mitEingang, EINGANG_ABSCHNITT_ID)).toBe(false);
    expect(K.einsatzGesamtstaerke(mitEingang).gesamt).toEqual(
      K.einsatzGesamtstaerke(zustand).gesamt,
    );
  });

  it("K8: die Plausibilitaetsprobe geht auf", () => {
    expect(K.druckPlausibel(zustand)).toBe(true);
  });
});

describe("K9 bis K12 — Texte und Verweise", () => {
  it("K9: die Erreichbarkeit faellt auf die oberste Hierarchieebene zurueck", () => {
    expect(K.erreichbarkeit(u("U1"))).toBe("0441-1 / ol@thw");
    expect(K.erreichbarkeit(u("U2"))).toBe("");
  });

  it("K9: die Fuehrungskraft sticht die Hierarchie, ein Override beide", () => {
    const mitKraft = falte([
      ...referenzlage(),
      bau(200, "EinheitStammdatenGeaendert", { einheitId: "U1", feld: "fuehrungskraft" }, {
        neu: {
          name: "GrFue Meier",
          kontakte: [{ art: "MOBIL", dienstlich: true, wert: "0170-2" }],
        },
      }),
    ]);
    expect(K.erreichbarkeit(mitKraft.einheiten["U1"] as never)).toBe("GrFue Meier / 0170-2");

    const mitOverride = falte([
      ...referenzlage(),
      bau(200, "EinheitStammdatenGeaendert", {
        einheitId: "U1",
        feld: "erreichbarkeitOverride",
      }, { neu: "Funk Kanal 31" }),
    ]);
    expect(K.erreichbarkeit(mitOverride.einheiten["U1"] as never)).toBe("Funk Kanal 31");
  });

  it("K10: Fahrzeuge nach Typ gruppiert, mit Stueckzahl ab zwei", () => {
    expect(K.geraeteText(zustand, "U1")).toBe("2× GKW,\nMLW");
    expect(K.geraeteText(zustand, "U2")).toBe("");
  });

  it("K11: die Auftragsspalte", () => {
    expect(K.auftragsText(zustand, "U1")).toBe(
      "2026-09-08T09:00:00+02:00–2026-09-08T12:00:00+02:00; Abschnitt EO; Deich sichern",
    );
  });

  it("K12: die juengste nicht stornierte Anforderung", () => {
    // AN2 ist um 11 Uhr angefordert, AN1 um 9 Uhr.
    expect(K.abloesendeAnforderung(zustand, "U1")?.id).toBe("AN2");

    const mitStorno = falte([
      ...referenzlage(),
      bau(200, "AnforderungStorniert", { anforderungId: "AN2" }, {
        neu: true,
        grund: "doppelt erfasst",
      }),
    ]);
    expect(K.abloesendeAnforderung(mitStorno, "U1")?.id).toBe("AN1");
  });
});

describe("K13 bis K16 — Kosten", () => {
  it("rechnet die vier Zahlen fuer U1", () => {
    // 9 Koepfe, ein PSA-Satz je Tag, 180 je Satz, 150 + 20 VDA/UK, 5 Tage.
    expect(K.kosten(zustand, u("U1"))).toEqual({
      psaProTag: 9 * 1 * 180,
      vdaUkProTag: (150 + 20) * 9,
      personentage: 5 * 9,
      gesamt: (9 * 180 + 170 * 9) * 5,
    });
  });

  it("gibt ohne PSA-Saetze null aus, und bei null Koepfen auch die Gesamtkosten", () => {
    const ohneSaetze = K.kosten(zustand, u("U2"));
    expect(ohneSaetze.psaProTag).toBe(0);
    expect(ohneSaetze.vdaUkProTag).toBe(170 * 4);
    expect(ohneSaetze.gesamt).toBe(170 * 4 * 5);

    const leer = falte([
      ...referenzlage(),
      bau(200, "StaerkeGeaendert", { einheitId: "U2" }, {
        vorher: staerke(1, 0, 3),
        neu: staerke(0, 0, 0),
      }),
    ]);
    expect(K.kosten(leer, leer.einheiten["U2"] as never).gesamt).toBe(0);
  });

  it("ANGEFORDERT und ARCHIV zaehlen nicht in die Kosten", () => {
    expect(K.zaehltInKosten(zustand, "EO")).toBe(true);
    expect(K.zaehltInKosten(zustand, "AN")).toBe(false);
    expect(K.zaehltInKosten(zustand, ARCHIV_ABSCHNITT_ID)).toBe(false);
  });
});

describe("K17 und K18 — Fuehrungsstelle und Verfuegbarkeit", () => {
  it("K17: je Teileinheit und Schicht eine Zeile aus den besetzten Dienstposten", () => {
    const rolle = (funktion: string): keyof Staerke =>
      funktion === "Zugfuehrer" ? "fuehrer" : "mannschaft";
    expect(K.fuestProjektion(zustand, rolle)).toEqual([
      { teileinheit: "Zugtrupp", schicht: "TAG", staerke: staerke(1, 0, 1) },
    ]);
  });

  it("K17: ein unbesetzter Dienstposten zaehlt nicht", () => {
    const ohneBesetzung = falte(referenzlage().filter((e) => e.typ !== "DienstpostenBesetzt"));
    expect(K.fuestProjektion(ohneBesetzung, () => "fuehrer")).toEqual([]);
  });

  it("K18: die Warnung greift einen Tag vorher, nicht frueher", () => {
    expect(K.verfuegbarkeitLaeuftAb(u("U1"), "2026-09-08T07:00:00+02:00")).toBe(false);
    expect(K.verfuegbarkeitLaeuftAb(u("U1"), "2026-09-08T09:00:00+02:00")).toBe(true);
    // Ohne `verfuegbarBis` gibt es nichts zu warnen.
    expect(K.verfuegbarkeitLaeuftAb(u("U2"), "2026-09-08T09:00:00+02:00")).toBe(false);
  });
});

describe("K19 bis K25 — die Matrizen des Statusblatts", () => {
  it("K19: Organisation × Kennzahl, ueber die Lage einschliesslich ANGEFORDERT", () => {
    const matrix = K.matrixOrganisation(zustand);
    expect(Object.keys(matrix)).toEqual(["DRK", "FEUERWEHR", "THW"]);
    // THW traegt U1 (9) und U3 (6).
    expect(matrix["THW"]?.gesamt).toBe(15);
    expect(matrix["THW"]?.staerke).toEqual(staerke(0, 2, 13));
    expect(matrix["THW"]?.weiblich).toBe(1);
    expect(matrix["FEUERWEHR"]?.gesamt).toBe(4);
    expect(matrix["DRK"]?.gesamt).toBe(4);
  });

  it("K20: Status × Kennzahl", () => {
    const matrix = K.matrixStatus(zustand);
    expect(Object.keys(matrix)).toEqual(["ANGEFORDERT", "IM_EINSATZ", "RUHE"]);
    expect(matrix["IM_EINSATZ"]?.gesamt).toBe(13);
    expect(matrix["RUHE"]?.gesamt).toBe(4);
    expect(matrix["ANGEFORDERT"]?.gesamt).toBe(6);
  });

  it("K22: Schicht × Kennzahl — die angeforderte Einheit fehlt hier", () => {
    const matrix = K.matrixSchicht(zustand);
    expect(Object.keys(matrix)).toEqual(["NACHT", "TAG"]);
    expect(matrix["TAG"]?.gesamt).toBe(13);
    expect(matrix["NACHT"]?.gesamt).toBe(4);
  });

  it("K24: Abschnitt × Schicht", () => {
    const matrix = K.matrixAbschnittSchicht(zustand, "EO");
    expect(matrix["TAG"]?.staerke).toEqual(staerke(0, 1, 8));
    expect(matrix["NACHT"]?.staerke).toEqual(staerke(1, 0, 3));
  });

  it("K21 und K23: beide Konsistenzproben gehen auf", () => {
    // 23 − 23 = 0 und 17 − 23 + 6 = 0. Genau diese Arithmetik zeigt, dass die
    // Matrizen ueber `E` laufen muessen und nicht ueber `E*` (Befund K-B1).
    expect(K.konsistenzStatus(zustand)).toBe(0);
    expect(K.konsistenzSchicht(zustand)).toBe(0);
  });

  it("K21: eine Einheit ohne Organisation bricht die Statusprobe", () => {
    const ohneOrg = falte([
      ...referenzlage(),
      bau(200, "EinheitStammdatenGeaendert", { einheitId: "U2", feld: "organisation" }, {
        neu: "",
      }),
    ]);
    expect(K.konsistenzStatus(ohneOrg)).toBe(4);
    expect(K.einheitenOhnePflichtangabe(ohneOrg).map((e) => e.id)).toEqual(["U2"]);
  });

  it("K25: die angeforderte Einheit ohne Schicht ist keine Luecke", () => {
    // Bei `ANGEFORDERT` ist die Schicht keine Pflicht (ZDM §2.4) — sonst
    // stuende U3 hier, und die Liste waere in jedem Einsatz voll.
    expect(K.einheitenOhnePflichtangabe(zustand)).toEqual([]);

    const ohneSchicht = falte([
      ...referenzlage(),
      bau(200, "SchichtGesetzt", { einheitId: "U4" }, { vorher: "TAG", neu: null }),
    ]);
    expect(K.einheitenOhnePflichtangabe(ohneSchicht).map((e) => e.id)).toEqual(["U4"]);
  });
});

describe("K26 und K27 — der Meldekopf", () => {
  it("K26: der Revisionskopf folgt `stand`, nicht der HLC und nicht `empfangenAm`", () => {
    // M1 wurde spaeter empfangen und traegt die hoehere HLC, M2 hat den
    // juengeren Stand. Nach HLC geordnet gaelte M1 — und die Lage zeigte den
    // Stand von 07 Uhr statt den von 09 Uhr.
    expect(K.revisionskoepfe(zustand).map((m) => m.id)).toEqual(["M2"]);
  });

  it("K27: der Eingangskorb enthaelt beide, nach `empfangenAm` geordnet", () => {
    expect(K.meldekopfEingang(zustand).map((m) => m.id)).toEqual(["M2", "M1"]);
  });

  it("K27: eine uebernommene Meldung verlaesst den Korb, eine abgelehnte auch", () => {
    const bearbeitet = falte([
      ...referenzlage(),
      bau(200, "EebMeldungUebernommen", {
        meldungId: "M2",
        einheitId: "U1",
        uebernommeneFelder: ["staerke"],
      }, { neu: { einheitId: "U1", uebernommeneFelder: ["staerke"] } }),
      bau(201, "EebMeldungAbgelehnt", { meldungId: "M1" }, {
        neu: true,
        grund: "unleserlich",
      }),
    ]);
    expect(K.meldekopfEingang(bearbeitet)).toEqual([]);
    expect(bearbeitet.meldungen["M2"]?.uebernahmeZustand).toBe("UEBERNOMMEN");
    expect(bearbeitet.meldungen["M1"]?.uebernahmeZustand).toBe("ABGELEHNT");
  });
});

describe("K28 bis K30 — die Textspalten", () => {
  it("K28: der Anzeigename traegt das Teiletikett in Klammern", () => {
    expect(K.anzeigename(u("U1"))).toBe("Einheit U1 (1. Trupp)");
    expect(K.anzeigename(u("U2"))).toBe("Einheit U2");
  });

  it("K29: die Herkunft aus der obersten Hierarchieebene", () => {
    expect(K.herkunftText(u("U1"))).toBe("Ortsverband Oldenburg (OL)");
    expect(K.herkunftText(u("U2"))).toBe("");
  });

  it("K30: bei einer Uebung steht ÜBUNG vor der Bemerkung", () => {
    expect(K.bemerkungText(zustand, u("U1"))).toBe("ÜBUNG — Pumpe defekt");
    expect(K.bemerkungText(zustand, u("U2"))).toBe("ÜBUNG");
  });

  it("K30: bei einem echten Einsatz steht nur die Bemerkung", () => {
    const echt = falte(
      referenzlage().map((e) =>
        e.typ === "EinsatzAngelegt"
          ? {
              ...e,
              nutzlast: { ...(e.nutzlast as Record<string, unknown>), art: "EINSATZ" },
            }
          : e,
      ),
    );
    expect(K.bemerkungText(echt, echt.einheiten["U1"] as never)).toBe("Pumpe defekt");
  });
});
