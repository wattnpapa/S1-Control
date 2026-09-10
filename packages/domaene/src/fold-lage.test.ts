/**
 * Dubletten (§5.4.4, §5.6.1), der Schichtplan (§5.7) und die
 * Plausibilisierung fachlicher Zeiten (§2.5, Auflage 12).
 */

import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION, ereignisId } from "./ereignis.js";
import { falte, type EingehendesEreignis } from "./fold.js";
import type { Hlc } from "./hlc.js";
import {
  abschnittAngelegt,
  akteur,
  einheitGemeldet,
  einsatzAngelegt,
  hlc,
  staerke,
} from "./pruefhilfen/ereignisbau.js";
import { ARCHIV_ABSCHNITT_ID } from "./zustand.js";
import type { Staerke } from "./werte.js";

const BEZUG = Date.parse("2026-09-08T08:00:00+02:00");

function bau(
  h: Hlc,
  laufnummer: number,
  typ: string,
  nutzlast: unknown,
  weiteres: Partial<EingehendesEreignis> = {},
): EingehendesEreignis {
  return {
    id: ereignisId(h.clientId, laufnummer),
    hlc: h,
    schemaVersion: SCHEMA_VERSION,
    akteur: akteur(h.clientId),
    wanduhr: new Date(BEZUG + h.millisekunden).toISOString(),
    typ,
    nutzlast,
    ...weiteres,
  };
}

const einsatz = einsatzAngelegt(hlc(1, 0, "aa"), 1, {
  einsatzId: "E",
  name: "Hochwasser",
  art: "EINSATZ",
  fuestName: "FueSt",
  beginn: "2026-09-08T08:00:00+02:00",
  schichtmodell: "ZWEI_SCHICHT",
});

const abschnittA = abschnittAngelegt(hlc(2, 0, "aa"), 2, {
  abschnittId: "A",
  name: "Einsatzort",
  abschnittstyp: "EINSATZORT",
  reihenfolge: 1,
});

function einheit(h: Hlc, laufnummer: number, id: string, schluessel?: string, s?: Staerke) {
  return einheitGemeldet(h, laufnummer, {
    einheitId: id,
    abschnittId: "A",
    bezeichnung: `Einheit ${id}`,
    organisation: "THW",
    ebene: "GRUPPE",
    staerke: s ?? staerke(0, 1, 8),
    personalErfassung: "NUR_STAERKE",
    status: "IM_EINSATZ",
    ...(schluessel === undefined ? {} : { einheitSchluessel: schluessel }),
  });
}

describe("§5.4.4 Die moegliche Dublette", () => {
  it("T33/T34: je Schluessel ein Hinweis mit allen Ids, nicht paarweise", () => {
    const zwei = falte([
      einsatz,
      abschnittA,
      einheit(hlc(10, 0, "aa"), 3, "U2", "THW-OL-B1"),
      einheit(hlc(11, 0, "bb"), 1, "U1", "THW-OL-B1"),
    ]);
    // Beide zaehlen; aufgeloest wird nur von Hand.
    expect(zwei.einheiten["U1"]?.zaehlt).toBe(true);
    expect(zwei.einheiten["U2"]?.zaehlt).toBe(true);
    expect(zwei.hinweise.filter((h) => h.art === "moeglicheDublette")).toEqual([
      {
        art: "moeglicheDublette",
        feldpfad: "einheit/U1/einheitSchluessel",
        schluessel: "THW-OL-B1",
        ids: ["U1", "U2"],
      },
    ]);

    const drei = falte([
      einsatz,
      abschnittA,
      einheit(hlc(10, 0, "aa"), 3, "U2", "THW-OL-B1"),
      einheit(hlc(11, 0, "bb"), 1, "U1", "THW-OL-B1"),
      einheit(hlc(12, 0, "cc"), 1, "U3", "THW-OL-B1"),
    ]);
    expect(drei.hinweise.filter((h) => h.art === "moeglicheDublette")).toEqual([
      expect.objectContaining({ ids: ["U1", "U2", "U3"] }),
    ]);
  });

  it("T35: nach dem Entfernen und nach dem Zusammenfuehren verschwindet er", () => {
    const grund = [
      einsatz,
      abschnittA,
      einheit(hlc(10, 0, "aa"), 3, "U1", "THW-OL-B1"),
      einheit(hlc(11, 0, "bb"), 1, "U2", "THW-OL-B1"),
    ];
    const entfernt = bau(hlc(20, 0, "cc"), 1, "EinheitEntfernt", { einheitId: "U2" }, {
      neu: true,
      grund: "Dublette",
    });
    expect(
      falte([...grund, entfernt]).hinweise.filter((h) => h.art === "moeglicheDublette"),
    ).toEqual([]);

    const zusammen = bau(hlc(20, 0, "cc"), 1, "EinheitZusammengefuehrt", {
      zielEinheitId: "U1",
      quellen: [{ einheitId: "U2", gesehen: staerke(0, 1, 8) }],
    });
    expect(
      falte([...grund, zusammen]).hinweise.filter((h) => h.art === "moeglicheDublette"),
    ).toEqual([]);
  });

  it("T164: eine Einheit im reservierten Abschnitt ARCHIV geht nicht in die Gruppe", () => {
    // Sonst truege derselbe Loeschzug bei jedem Turnus einen Hinweis mehr, und
    // die Liste wuechse ohne Ende.
    const archiviert = bau(hlc(20, 0, "cc"), 1, "EinheitArchiviert", { einheitId: "U2" }, {
      neu: ARCHIV_ABSCHNITT_ID,
      vorher: "A",
    });
    const zustand = falte([
      einsatz,
      abschnittA,
      einheit(hlc(10, 0, "aa"), 3, "U1", "THW-OL-B1"),
      einheit(hlc(11, 0, "bb"), 1, "U2", "THW-OL-B1"),
      archiviert,
    ]);
    expect(zustand.einheiten["U2"]?.wirksamerAbschnittId).toBe(ARCHIV_ABSCHNITT_ID);
    expect(zustand.einheiten["U2"]?.zaehlt).toBe(false);
    expect(zustand.hinweise.filter((h) => h.art === "moeglicheDublette")).toEqual([]);
  });

  it("die Gruppe haengt nicht am Abschnittstyp — das ist der Regelfall", () => {
    // Die am Meldekopf gemeldete Einheit liegt in einem Abschnitt vom Typ
    // `ANGEFORDERT` und zaehlt nicht; sie mit der Meldung der Fuehrungsstelle
    // zusammenzubringen ist der ganze Zweck des Hinweises.
    const angefordert = abschnittAngelegt(hlc(3, 0, "aa"), 9, {
      abschnittId: "AN",
      name: "Angefordert",
      abschnittstyp: "ANGEFORDERT",
      reihenfolge: 9,
    });
    const imAnforderungsraum = einheitGemeldet(hlc(11, 0, "bb"), 1, {
      einheitId: "U2",
      abschnittId: "AN",
      bezeichnung: "Bergungsgruppe",
      organisation: "THW",
      ebene: "GRUPPE",
      staerke: staerke(0, 1, 8),
      personalErfassung: "NUR_STAERKE",
      status: "ANGEFORDERT",
      einheitSchluessel: "THW-OL-B1",
    });
    const zustand = falte([
      einsatz,
      abschnittA,
      angefordert,
      einheit(hlc(10, 0, "aa"), 3, "U1", "THW-OL-B1"),
      imAnforderungsraum,
    ]);
    expect(zustand.einheiten["U2"]?.zaehlt).toBe(false);
    expect(zustand.hinweise.filter((h) => h.art === "moeglicheDublette")).toHaveLength(1);
  });

  it("T36: nach Aenderung des Schluessels verschwindet er", () => {
    const geaendert = bau(hlc(30, 0, "cc"), 1, "EinheitStammdatenGeaendert", {
      einheitId: "U2",
      feld: "einheitSchluessel",
    }, { vorher: "THW-OL-B1", neu: "THW-OL-B2" });
    const zustand = falte([
      einsatz,
      abschnittA,
      einheit(hlc(10, 0, "aa"), 3, "U1", "THW-OL-B1"),
      einheit(hlc(11, 0, "bb"), 1, "U2", "THW-OL-B1"),
      geaendert,
    ]);
    expect(zustand.hinweise.filter((h) => h.art === "moeglicheDublette")).toEqual([]);
  });
});

describe("§5.6.1 Die Kennung ist ein Etikett, keine Identitaet", () => {
  function anforderung(h: Hlc, laufnummer: number, id: string, kennung?: string) {
    return bau(h, laufnummer, "AnforderungAngelegt", {
      anforderungId: id,
      angefordertAm: "2026-09-08T09:00:00+02:00",
      ...(kennung === undefined ? {} : { kennung }),
    });
  }

  it("T42: zwei mit derselben Kennung — zwei Anforderungen, ein Hinweis", () => {
    const zustand = falte([
      einsatz,
      anforderung(hlc(10, 0, "aa"), 3, "AN1", "FüSt-2026-17"),
      anforderung(hlc(11, 0, "bb"), 1, "AN2", "FüSt-2026-17"),
    ]);
    expect(Object.keys(zustand.anforderungen)).toEqual(["AN1", "AN2"]);
    expect(zustand.hinweise.filter((h) => h.art === "moeglicheDublette")).toEqual([
      {
        art: "moeglicheDublette",
        feldpfad: "anforderung/AN1/kennung",
        schluessel: "FüSt-2026-17",
        ids: ["AN1", "AN2"],
      },
    ]);
  });

  it("T43: eine storniert — kein Hinweis", () => {
    const storno = bau(hlc(20, 0, "cc"), 1, "AnforderungStorniert", { anforderungId: "AN2" }, {
      neu: true,
      grund: "doppelt erfasst",
    });
    const zustand = falte([
      einsatz,
      anforderung(hlc(10, 0, "aa"), 3, "AN1", "FüSt-2026-17"),
      anforderung(hlc(11, 0, "bb"), 1, "AN2", "FüSt-2026-17"),
      storno,
    ]);
    expect(zustand.anforderungen["AN2"]?.zustand).toBe("STORNIERT");
    expect(zustand.hinweise.filter((h) => h.art === "moeglicheDublette")).toEqual([]);
  });
});

describe("§5.7 Der Schichtplan ist eine eigene Wurzel-Datensammlung", () => {
  const dienstposten = bau(hlc(10, 0, "aa"), 3, "DienstpostenAngelegt", {
    dienstpostenId: "D1",
    teileinheit: "Zugtrupp",
    funktion: "S1",
    schicht: "TAG",
    reihenfolge: 1,
  });

  it("legt die Zellen unter `schichtplan/<dienstpostenId>/<datum>` ab", () => {
    const zeile = bau(hlc(20, 0, "bb"), 1, "SchichtplanEintragGesetzt", {
      dienstpostenId: "D1",
      datum: "2026-09-10",
    }, { neu: "Meier" });
    const zustand = falte([einsatz, dienstposten, zeile]);
    expect(zustand.schichtplan["D1"]?.["2026-09-10"]?.wert).toBe("Meier");
    // Nicht als Feld des Dienstpostens: Sonst belegte ein einziger
    // Dienstposten so viele Schluessel, wie jemand Tage beschrieben hat.
    expect((zustand.dienstposten["D1"] as Record<string, unknown>)["schichtplan"]).toBeUndefined();
  });

  it("T182: ein Dienstposten ohne Planzeile traegt keinen Schluessel", () => {
    const zustand = falte([einsatz, dienstposten]);
    expect(Object.keys(zustand.schichtplan)).toEqual([]);
  });

  it("plausibilisiert das `datum` nicht — es ist ein Schluesselbestandteil (§2.5)", () => {
    // Ein Dienstplan fuer uebermorgen ist der Normalfall, ein Eintrag fuer
    // vorgestern eine zulaessige Nachtragung.
    const weitWeg = bau(hlc(20, 0, "bb"), 1, "SchichtplanEintragGesetzt", {
      dienstpostenId: "D1",
      datum: "2027-03-01",
    }, { neu: "Meier" });
    expect(
      falte([einsatz, dienstposten, weitWeg]).hinweise.filter(
        (h) => h.art === "meldezeitUnplausibel",
      ),
    ).toEqual([]);
  });
});

describe("§2.5 Fachliche Zeiten und ihre drei Klassen (Auflage 12)", () => {
  const u = einheit(hlc(10, 0, "aa"), 3, "U1");

  it("meldet eine Ist-Zeit jenseits der Zwoelfstundenschwelle in beiden Richtungen", () => {
    const spaet = bau(hlc(20, 0, "bb"), 1, "ZeitpunktGesetzt", {
      einheitId: "U1",
      feld: "eingetroffenAm",
    }, { neu: "2026-09-09T23:00:00+02:00" });
    const hinweise = falte([einsatz, abschnittA, u, spaet]).hinweise.filter(
      (h) => h.art === "meldezeitUnplausibel",
    );
    expect(hinweise).toEqual([
      expect.objectContaining({
        feldpfad: "einheit/U1/eingetroffenAm",
        ereignis: "bb:1",
        zeitklasse: "IST",
      }),
    ]);

    const knapp = bau(hlc(20, 0, "bb"), 1, "ZeitpunktGesetzt", {
      einheitId: "U1",
      feld: "eingetroffenAm",
    }, { neu: "2026-09-08T17:00:00+02:00" });
    expect(
      falte([einsatz, abschnittA, u, knapp]).hinweise.filter(
        (h) => h.art === "meldezeitUnplausibel",
      ),
    ).toEqual([]);
  });

  it("laesst einen Planwert weit in der Zukunft zu, aber keinen in der Vergangenheit", () => {
    // Ohne die Trennung erzeugte jede Abloesezusage fuer morgen einen Hinweis.
    const morgen = bau(hlc(20, 0, "bb"), 1, "ZeitpunktGesetzt", {
      einheitId: "U1",
      feld: "verfuegbarBis",
    }, { neu: "2026-10-01T08:00:00+02:00" });
    expect(
      falte([einsatz, abschnittA, u, morgen]).hinweise.filter(
        (h) => h.art === "meldezeitUnplausibel",
      ),
    ).toEqual([]);

    const gestern = bau(hlc(20, 0, "bb"), 1, "ZeitpunktGesetzt", {
      einheitId: "U1",
      feld: "verfuegbarBis",
    }, { neu: "2026-09-01T08:00:00+02:00" });
    expect(
      falte([einsatz, abschnittA, u, gestern]).hinweise.filter(
        (h) => h.art === "meldezeitUnplausibel",
      ),
    ).toEqual([expect.objectContaining({ zeitklasse: "PLAN" })]);
  });

  it("stellt den Hinweis zu `meldezeit` an den Staerkewert (Auflage 12)", () => {
    // `meldezeit` ist kein eigenes Zustandsfeld, sondern datiert die Meldung.
    const meldung = bau(hlc(20, 0, "bb"), 1, "StaerkeGeaendert", {
      einheitId: "U1",
      meldezeit: "2026-09-06T08:00:00+02:00",
    }, { vorher: staerke(0, 1, 8), neu: staerke(0, 1, 9) });
    expect(
      falte([einsatz, abschnittA, u, meldung]).hinweise.filter(
        (h) => h.art === "meldezeitUnplausibel",
      ),
    ).toEqual([
      expect.objectContaining({ feldpfad: "einheit/U1/staerke", zeitklasse: "IST" }),
    ]);
  });

  it("prueft die Fremdzeiten einer EEB-Meldung gar nicht", () => {
    // Sie stammen aus einem fremden Geraet, dessen Uhr diese Fuehrungsstelle
    // nicht verantwortet.
    const meldung = bau(hlc(20, 0, "bb"), 1, "EebMeldungEmpfangen", {
      meldungId: "M1",
      einheitSchluessel: "THW-OL-B1",
      stand: "2025-01-01T07:00:00+01:00",
      empfangenAm: "2025-01-01T07:05:00+01:00",
      quelle: "SCAN",
      bogen: {},
    });
    expect(
      falte([einsatz, meldung]).hinweise.filter((h) => h.art === "meldezeitUnplausibel"),
    ).toEqual([]);
  });

  it("prueft die Zeit in einem Strukturwert an ihrem Schluessel", () => {
    const anlage = bau(hlc(10, 0, "aa"), 4, "AnforderungAngelegt", {
      anforderungId: "AN1",
      angefordertAm: "2026-09-08T09:00:00+02:00",
    });
    const zusage = bau(hlc(20, 0, "bb"), 1, "AbloesungZugesagt", { anforderungId: "AN1" }, {
      neu: { zugesagtFuer: "2026-09-01T08:00:00+02:00", zugesagtVon: "Regionalstelle" },
    });
    expect(
      falte([einsatz, anlage, zusage]).hinweise.filter((h) => h.art === "meldezeitUnplausibel"),
    ).toEqual([
      expect.objectContaining({ feldpfad: "anforderung/AN1/zusage", zeitklasse: "PLAN" }),
    ]);
  });
});
