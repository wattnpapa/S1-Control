/**
 * Die Barriere `EinsatzArchiviert` — §7 und Auflage 13.
 *
 * Die Pruefall-Nummern sind die aus §11 des Konzepts.
 */

import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION, ereignisId } from "./ereignis.js";
import { falte, falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import { hlcAlsText, type Hlc } from "./hlc.js";
import {
  abschnittAngelegt,
  akteur,
  einheitGemeldet,
  einsatzAngelegt,
  hlc,
  staerke,
} from "./pruefhilfen/ereignisbau.js";

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

const einheitU1 = einheitGemeldet(hlc(3, 0, "aa"), 3, {
  einheitId: "U1",
  abschnittId: "A",
  bezeichnung: "Bergungsgruppe",
  organisation: "THW",
  ebene: "GRUPPE",
  staerke: staerke(0, 1, 8),
  personalErfassung: "NUR_STAERKE",
  status: "IM_EINSATZ",
});

const grundmenge = [einsatz, abschnittA, einheitU1];

function archiviert(h: Hlc, laufnummer: number, einsatzId = "E") {
  return bau(h, laufnummer, "EinsatzArchiviert", {
    einsatzId,
    zeitpunkt: new Date(BEZUG + h.millisekunden).toISOString(),
    snapshotHash: "a".repeat(64),
  });
}

function zurueckgenommen(h: Hlc, laufnummer: number, benannt: string, erwartete: Hlc) {
  return bau(h, laufnummer, "ArchivierungZurueckgenommen", {
    einsatzId: "E",
    archivierungEreignisId: benannt,
    archivierungHlc: hlcAlsText(erwartete),
  }, { grund: "verfrueht" });
}

describe("§7.1 und §7.2 Die massgebliche Archivierung", () => {
  it("archiviert den Einsatz und legt den Beleg unter der eigenen Id ab", () => {
    const zustand = falte([...grundmenge, archiviert(hlc(100, 0, "bb"), 1)]);
    expect(zustand.einsatz?.status).toBe("ARCHIVIERT");
    expect(zustand.einsatz?.archiviertDurch).toBe("bb:1");
    expect(zustand.archivierungen["bb:1"]).toEqual({
      gilt: true,
      hlc: hlc(100, 0, "bb"),
      wanduhr: expect.any(String),
      zeitpunkt: expect.any(String),
      snapshotHash: "a".repeat(64),
      // Immer vorhanden, im Regelfall leer (T137).
      zurueckgenommenDurch: [],
    });
  });

  it("T183: eine fremde `einsatzId` archiviert diese Akte trotzdem (§7.1)", () => {
    // Der Einsatz ist der der Akte; ein Abgleich waere eine zweite Wahrheit
    // ueber etwas, das der Ordner schon sagt.
    const zustand = falte([...grundmenge, archiviert(hlc(100, 0, "bb"), 1, "EIN_ANDERER")]);
    expect(zustand.einsatz?.status).toBe("ARCHIVIERT");
    expect(zustand.unbekannt).toEqual([]);
  });

  it("T68: zwei Archivierungen — massgeblich ist die kleinere HLC", () => {
    const zustand = falte([
      ...grundmenge,
      archiviert(hlc(5, 0, "bb"), 1),
      archiviert(hlc(9, 0, "cc"), 1),
    ]);
    expect(zustand.einsatz?.archiviertDurch).toBe("bb:1");
    expect(zustand.hinweise).toContainEqual({
      art: "wirkungslosGegenTerminalzustand",
      feldpfad: "archivierungen/cc:1",
      ereignis: "cc:1",
      grund: "ZWEITE_ARCHIVIERUNG",
    });
  });

  it("T72: eine Ruecknahme wirkt auch mit kleinerer eigener HLC", () => {
    // Der Fall der vorlaufenden fremden Uhr, den die Speicherschicht als
    // Normalfall fuehrt. Eine reine HLC-Bedingung haette ihn verworfen, und
    // ein Bedienschritt mit Pflicht-`grund` verpuffte still.
    const a = archiviert(hlc(9, 0, "bb"), 1);
    const zustand = falte([...grundmenge, a, zurueckgenommen(hlc(5, 0, "cc"), 1, "bb:1", a.hlc)]);
    expect(zustand.einsatz?.status).toBe("AKTIV");
    expect(zustand.archivierungen["bb:1"]?.gilt).toBe(false);
  });

  it("T71: der Grabstein — die Ruecknahme trifft vor ihrer Archivierung ein", () => {
    const a = archiviert(hlc(9, 0, "bb"), 1);
    const r = zurueckgenommen(hlc(5, 0, "cc"), 1, "bb:1", a.hlc);
    const vorwaerts = falte([...grundmenge, a, r]);
    const rueckwaerts = falte([...grundmenge, r, a]);
    expect(rueckwaerts).toEqual(vorwaerts);

    // Und allein: Der Eintrag steht als Grabstein da, ohne HLC und ohne
    // Wanduhr — ein erfundener Anfangswert stuende im Hash.
    const nurGrabstein = falte([...grundmenge, r]);
    expect(nurGrabstein.archivierungen["bb:1"]).toEqual({
      gilt: false,
      zurueckgenommenDurch: [
        { ereignisId: "cc:1", erwarteteHlc: hlcAlsText(a.hlc), hlc: hlc(5, 0, "cc") },
      ],
    });
    expect(nurGrabstein.einsatz?.status).toBe("AKTIV");
    // Solange die Archivierung fehlt, entsteht **kein** Hinweis (§3.12).
    expect(nurGrabstein.hinweise.filter((h) => h.art === "wirkungslosGegenTerminalzustand")).toEqual(
      [],
    );
  });

  it("T178: ein Grabstein vor `EinsatzAngelegt` faellt nicht weg", () => {
    // Laege die Abbildung unter `einsatz`, saehe ein Client, der ueber diesen
    // Punkt hinweg aus einem Schnappschuss startet, einen archivierten
    // Einsatz, wo der volle Fold einen offenen sieht — P1 und P7 fielen.
    const a = archiviert(hlc(9, 0, "bb"), 1);
    const r = zurueckgenommen(hlc(5, 0, "cc"), 1, "bb:1", a.hlc);
    const frueh = falteHinzu(leereFaltung(), [r, a]);
    expect(materialisiere(falteHinzu(frueh, grundmenge))).toEqual(falte([...grundmenge, a, r]));
  });

  it("T192: eine Ruecknahme mit unpassender `erwarteteHlc` ist wirkungslos", () => {
    const a = archiviert(hlc(5, 0, "bb"), 1);
    const daneben = zurueckgenommen(hlc(20, 0, "cc"), 1, "bb:1", hlc(7, 0, "bb"));
    const zustand = falte([...grundmenge, a, daneben]);
    expect(zustand.einsatz?.status).toBe("ARCHIVIERT");
    expect(zustand.hinweise).toContainEqual({
      art: "wirkungslosGegenTerminalzustand",
      feldpfad: "archivierungen/bb:1",
      ereignis: "cc:1",
      grund: "RUECKNAHME_OHNE_PASSENDE_ARCHIVIERUNG",
    });
    // Und **kein** zweiter Hinweis am selben Feldpfad fuer dieselbe folgenlose
    // Handlung (§7.3, Bedingung (b)).
    expect(zustand.hinweise.filter((h) => h.art === "nachArchivierungEingegangen")).toEqual([]);
  });

  it("T73: beide Archivierungen zurueckgenommen — der Einsatz ist offen", () => {
    const a1 = archiviert(hlc(5, 0, "bb"), 1);
    const a2 = archiviert(hlc(9, 0, "cc"), 1);
    const zustand = falte([
      ...grundmenge,
      a1,
      a2,
      zurueckgenommen(hlc(30, 0, "dd"), 1, "bb:1", a1.hlc),
      zurueckgenommen(hlc(31, 0, "dd"), 2, "cc:1", a2.hlc),
    ]);
    expect(zustand.einsatz?.status).toBe("AKTIV");
    expect(zustand.hinweise.filter((h) => h.art === "nachArchivierungEingegangen")).toEqual([]);
  });

  it("T74: jede Permutation ergibt denselben Zustand", () => {
    const a1 = archiviert(hlc(5, 0, "bb"), 1);
    const a2 = archiviert(hlc(9, 0, "cc"), 1);
    const r = zurueckgenommen(hlc(30, 0, "dd"), 1, "bb:1", a1.hlc);
    const menge = [...grundmenge, a1, a2, r];
    const voll = falte(menge);
    for (const permutation of [
      [...menge].reverse(),
      [r, a2, ...grundmenge, a1],
      [a2, r, a1, ...grundmenge],
    ]) {
      expect(falte(permutation)).toEqual(voll);
    }
    // Die zweite Archivierung haelt die Barriere aufrecht.
    expect(voll.einsatz?.archiviertDurch).toBe("cc:1");
  });
});

describe("§7.3 Ein Ereignis nach der Archivierung wirkt und wird sichtbar", () => {
  it("T69: eine Statusaenderung nach der Barriere wirkt und traegt den Hinweis", () => {
    const status = bau(hlc(7, 0, "cc"), 1, "StatusGesetzt", { einheitId: "U1" }, {
      vorher: "IM_EINSATZ",
      neu: "RUECKMARSCH",
    });
    const zustand = falte([...grundmenge, archiviert(hlc(5, 0, "bb"), 1), status]);
    expect(zustand.einheiten["U1"]?.status.wert).toBe("RUECKMARSCH");
    expect(zustand.hinweise).toContainEqual({
      art: "nachArchivierungEingegangen",
      feldpfad: "einheit/U1",
      archivierung: "bb:1",
      betroffeneFelder: ["status"],
    });
  });

  it("nennt den Restpfad unter dem Entitaetspfad, nicht den blossen Feldnamen", () => {
    const kosten = bau(hlc(7, 0, "cc"), 1, "KostenParameterGeaendert", {
      einsatzId: "E",
      feld: "vdaProTag",
    }, { vorher: 150, neu: 165 });
    const zustand = falte([...grundmenge, archiviert(hlc(5, 0, "bb"), 1), kosten]);
    expect(zustand.hinweise).toContainEqual({
      art: "nachArchivierungEingegangen",
      feldpfad: "einsatz",
      archivierung: "bb:1",
      betroffeneFelder: ["kosten/vdaProTag"],
    });
  });

  it("T70: die Ruecknahme selbst traegt den Hinweis nur ueber der Schwelle", () => {
    const a1 = archiviert(hlc(5, 0, "bb"), 1);
    const a2 = archiviert(hlc(9, 0, "cc"), 1);
    const frueh = falte([...grundmenge, a1, a2, zurueckgenommen(hlc(4, 0, "dd"), 1, "bb:1", a1.hlc)]);
    // Massgeblich ist jetzt 9; die eigene HLC 4 liegt davor.
    expect(frueh.einsatz?.archiviertDurch).toBe("cc:1");
    expect(frueh.hinweise.filter((h) => h.art === "nachArchivierungEingegangen")).toEqual([]);

    const spaet = falte([
      ...grundmenge,
      a1,
      a2,
      zurueckgenommen(hlc(30, 0, "dd"), 1, "bb:1", a1.hlc),
    ]);
    expect(spaet.hinweise).toContainEqual({
      art: "nachArchivierungEingegangen",
      feldpfad: "archivierungen/bb:1",
      archivierung: "cc:1",
      betroffeneFelder: ["zurueckgenommenDurch/dd:1"],
    });
  });

  it("T191: zwei Ruecknahmen derselben Archivierung — ein Hinweis mit beiden", () => {
    const a1 = archiviert(hlc(5, 0, "bb"), 1);
    const a2 = archiviert(hlc(9, 0, "cc"), 1);
    const zustand = falte([
      ...grundmenge,
      a1,
      a2,
      zurueckgenommen(hlc(20, 0, "dd"), 1, "cc:1", a2.hlc),
      zurueckgenommen(hlc(21, 0, "ee"), 1, "cc:1", a2.hlc),
    ]);
    expect(zustand.hinweise.filter((h) => h.art === "nachArchivierungEingegangen")).toEqual([
      {
        art: "nachArchivierungEingegangen",
        feldpfad: "archivierungen/cc:1",
        archivierung: "bb:1",
        betroffeneFelder: ["zurueckgenommenDurch/dd:1", "zurueckgenommenDurch/ee:1"],
      },
    ]);
  });

  it("T185: eine wartende Beobachtung nach der Barriere traegt den Hinweis", () => {
    const spaet = bau(hlc(7, 0, "cc"), 1, "StaerkeGeaendert", { einheitId: "E7" }, {
      vorher: staerke(0, 0, 0),
      neu: staerke(0, 1, 5),
    });
    const zustand = falte([...grundmenge, archiviert(hlc(5, 0, "bb"), 1), spaet]);
    expect(zustand.hinweise).toContainEqual({
      art: "anlageFehlt",
      feldpfad: "einheit/E7",
      wartende: ["cc:1"],
    });
    expect(zustand.hinweise).toContainEqual({
      art: "nachArchivierungEingegangen",
      feldpfad: "einheit/E7",
      archivierung: "bb:1",
      betroffeneFelder: ["staerke"],
    });
  });

  it("T181: der Schichtplan traegt einen Hinweis je Dienstposten", () => {
    const dienstposten = bau(hlc(3, 0, "aa"), 9, "DienstpostenAngelegt", {
      dienstpostenId: "D1",
      teileinheit: "Zugtrupp",
      funktion: "S1",
      schicht: "TAG",
      reihenfolge: 1,
    });
    const zelle = (h: Hlc, n: number, datum: string) =>
      bau(h, n, "SchichtplanEintragGesetzt", { dienstpostenId: "D1", datum }, { neu: "Meier" });
    const zustand = falte([
      ...grundmenge,
      dienstposten,
      archiviert(hlc(5, 0, "bb"), 1),
      zelle(hlc(7, 0, "cc"), 1, "2026-09-10"),
      zelle(hlc(9, 0, "cc"), 2, "2026-09-11"),
    ]);
    expect(zustand.hinweise).toContainEqual({
      art: "nachArchivierungEingegangen",
      feldpfad: "schichtplan/D1",
      archivierung: "bb:1",
      betroffeneFelder: ["2026-09-10", "2026-09-11"],
    });
    // Der Dienstposten selbst hat sich nicht geaendert.
    expect(
      zustand.hinweise.filter(
        (h) => h.art === "nachArchivierungEingegangen" && h.feldpfad === "dienstposten/D1",
      ),
    ).toEqual([]);
  });

  it("T187: bei einem Erstwert-Feld zaehlt auch die verdraengte Beobachtung", () => {
    // Sonst flackerte der Hinweis: Die Zusammenfuehrung mit HLC 9 verloere
    // nach dem Eintreffen der Anlage gegen den Gewinner mit HLC 3 und
    // verschwaende, obwohl sie unveraendert im Zustand steht.
    const ziel = einheitGemeldet(hlc(4, 0, "aa"), 4, {
      einheitId: "Z",
      abschnittId: "A",
      bezeichnung: "Ziel",
      organisation: "THW",
      ebene: "GRUPPE",
      staerke: staerke(0, 0, 1),
      personalErfassung: "NUR_STAERKE",
      status: "IM_EINSATZ",
    });
    const zusammen = (h: Hlc, n: number) =>
      bau(h, n, "EinheitZusammengefuehrt", {
        zielEinheitId: "Z",
        quellen: [{ einheitId: "U1", gesehen: staerke(0, 1, 8) }],
      });
    const zustand = falte([
      ...grundmenge,
      ziel,
      archiviert(hlc(5, 0, "bb"), 1),
      zusammen(hlc(3, 0, "cc"), 1),
      zusammen(hlc(9, 0, "dd"), 1),
    ]);
    expect(zustand.hinweise).toContainEqual({
      art: "nachArchivierungEingegangen",
      feldpfad: "einheit/U1",
      archivierung: "bb:1",
      betroffeneFelder: ["aufgegangenIn"],
    });
  });

  it("§7.4: die Hinweise verschwinden, sobald keine Barriere mehr gilt", () => {
    const a = archiviert(hlc(5, 0, "bb"), 1);
    const status = bau(hlc(7, 0, "cc"), 1, "StatusGesetzt", { einheitId: "U1" }, {
      vorher: "IM_EINSATZ",
      neu: "RUECKMARSCH",
    });
    const zustand = falte([
      ...grundmenge,
      a,
      status,
      zurueckgenommen(hlc(30, 0, "dd"), 1, "bb:1", a.hlc),
    ]);
    expect(zustand.einsatz?.status).toBe("AKTIV");
    expect(zustand.hinweise.filter((h) => h.art === "nachArchivierungEingegangen")).toEqual([]);
  });

  it("faellt nicht auf `unbekannt` und `verworfeneSchluessel` (§7.3, Nicht-Zusicherung)", () => {
    const fremd = bau(hlc(7, 0, "cc"), 1, "NochNichtErfundeneArt", {});
    const kaperung = bau(hlc(8, 0, "cc"), 2, "AbschnittUmbenannt", { abschnittId: "AUFFANG" }, {
      neu: "Sammelraum",
    });
    const zustand = falte([...grundmenge, archiviert(hlc(5, 0, "bb"), 1), fremd, kaperung]);
    expect(zustand.hinweise.filter((h) => h.art === "nachArchivierungEingegangen")).toEqual([]);
  });
});
