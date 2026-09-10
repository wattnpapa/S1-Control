/**
 * Undo U1 bis U6 (§6, Auflage 11) und `KorrekturVon` (§5.9.2).
 *
 * Die Pruefall-Nummern sind die aus §11 des Konzepts.
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
  status: "RUFBEREITSCHAFT",
});

const grundmenge = [einsatz, abschnittA, einheitU1];

function status(h: Hlc, n: number, vorher: string, neu: string, undoOf?: string) {
  return bau(h, n, "StatusGesetzt", { einheitId: "U1" }, {
    vorher,
    neu,
    ...(undoOf === undefined ? {} : { undoOf }),
  });
}

describe("§6 U1 Der Fold hat keinen Sonderpfad fuer Undo", () => {
  it("faltet die Kompensation nach der Regel ihrer eigenen Art", () => {
    const gesetzt = status(hlc(5, 0, "aa"), 4, "RUFBEREITSCHAFT", "IM_EINSATZ");
    const zurueck = status(hlc(9, 0, "aa"), 5, "IM_EINSATZ", "RUFBEREITSCHAFT", "aa:4");
    const zustand = falte([...grundmenge, gesetzt, zurueck]);
    expect(zustand.einheiten["U1"]?.status.wert).toBe("RUFBEREITSCHAFT");
    // `undoOf` steht im Zustand, weil der Hinweis aus U6 es braucht.
    expect(zustand.einheiten["U1"]?.status.undoOf).toBe("aa:4");
    expect(zustand.hinweise).toEqual([]);
  });

  it("T61: ohne `undoOf` ergibt sich derselbe Zustand bis auf drei Dinge", () => {
    const gesetzt = status(hlc(5, 0, "aa"), 4, "RUFBEREITSCHAFT", "IM_EINSATZ");
    const mit = status(hlc(9, 0, "aa"), 5, "IM_EINSATZ", "RUFBEREITSCHAFT", "aa:4");
    const ohne = status(hlc(9, 0, "aa"), 5, "IM_EINSATZ", "RUFBEREITSCHAFT");
    const a = falte([...grundmenge, gesetzt, mit]);
    const b = falte([...grundmenge, gesetzt, ohne]);
    expect(a.einheiten["U1"]?.status.wert).toBe(b.einheiten["U1"]?.status.wert);
    expect(a.einheiten["U1"]?.status.hlc).toEqual(b.einheiten["U1"]?.status.hlc);
    expect(a.hinweise).toEqual(b.hinweise);
    // Der Unterschied ist genau das Feld selbst.
    expect(b.einheiten["U1"]?.status.undoOf).toBeUndefined();
  });
});

describe("§6 U6 Undo gegen Fremdaenderung", () => {
  it("T64: die Kompensation gewinnt und meldet die verdraengte Fremdaenderung", () => {
    const a1 = status(hlc(5, 0, "aa"), 4, "RUFBEREITSCHAFT", "IM_EINSATZ");
    const b1 = status(hlc(7, 0, "bb"), 1, "IM_EINSATZ", "RUECKMARSCH");
    const a2 = status(hlc(9, 0, "aa"), 5, "IM_EINSATZ", "RUFBEREITSCHAFT", "aa:4");
    const zustand = falte([...grundmenge, a1, b1, a2]);
    expect(zustand.einheiten["U1"]?.status.wert).toBe("RUFBEREITSCHAFT");
    expect(zustand.hinweise).toEqual([
      {
        art: "undoTrifftFremdenStand",
        feldpfad: "einheit/U1/status",
        undo: "aa:5",
        original: "aa:4",
        verdraengt: "bb:1",
        verdraengterWert: "RUECKMARSCH",
      },
    ]);
    // Und **nicht** `vorherPasstNicht`: Der Bediener hat nicht ein Feld
    // gesetzt, sondern „rueckgaengig" gedrueckt.
    expect(zustand.hinweise.filter((h) => h.art === "vorherPasstNicht")).toEqual([]);
  });

  it("T65: ein viertes Ereignis laesst den Hinweis von selbst wegfallen", () => {
    const a1 = status(hlc(5, 0, "aa"), 4, "RUFBEREITSCHAFT", "IM_EINSATZ");
    const b1 = status(hlc(7, 0, "bb"), 1, "IM_EINSATZ", "RUECKMARSCH");
    const a2 = status(hlc(9, 0, "aa"), 5, "IM_EINSATZ", "RUFBEREITSCHAFT", "aa:4");
    const c1 = status(hlc(11, 0, "cc"), 1, "RUFBEREITSCHAFT", "RUHE");
    const zustand = falte([...grundmenge, a1, b1, a2, c1]);
    expect(zustand.einheiten["U1"]?.status.wert).toBe("RUHE");
    expect(zustand.hinweise.filter((h) => h.art === "undoTrifftFremdenStand")).toEqual([]);
  });

  it("T66: zwei Ruecknahmen desselben Ereignisses mit demselben Wert — kein Hinweis", () => {
    // Geht ueber die Bedienung nicht (U3), wohl aber ueber ein geklontes
    // Profil, das dieselbe `clientId` traegt.
    const a1 = status(hlc(5, 0, "aa"), 4, "RUFBEREITSCHAFT", "IM_EINSATZ");
    const undo1 = status(hlc(9, 0, "aa"), 5, "IM_EINSATZ", "RUFBEREITSCHAFT", "aa:4");
    const undo2 = status(hlc(10, 0, "aa"), 6, "IM_EINSATZ", "RUFBEREITSCHAFT", "aa:4");
    const zustand = falte([...grundmenge, a1, undo1, undo2]);
    expect(zustand.einheiten["U1"]?.status.wert).toBe("RUFBEREITSCHAFT");
    expect(zustand.hinweise).toEqual([]);
  });

  it("T67: dieselben mit verschiedenen Werten — LWW und Hinweis", () => {
    const a1 = status(hlc(5, 0, "aa"), 4, "RUFBEREITSCHAFT", "IM_EINSATZ");
    const undo1 = status(hlc(9, 0, "aa"), 5, "IM_EINSATZ", "RUFBEREITSCHAFT", "aa:4");
    const undo2 = status(hlc(10, 0, "aa"), 6, "IM_EINSATZ", "RUHE", "aa:4");
    const zustand = falte([...grundmenge, a1, undo1, undo2]);
    expect(zustand.einheiten["U1"]?.status.wert).toBe("RUHE");
    expect(zustand.hinweise).toEqual([
      expect.objectContaining({ art: "undoTrifftFremdenStand", undo: "aa:6", original: "aa:4" }),
    ]);
  });

  it("nimmt die Erstwert-Felder von U6 aus (§6 U6, §2.2a)", () => {
    // Der strukturelle Rueckweg verdraengt nichts, er legt einen neuen Vorgang
    // an; was er ueber den alten sagt, sagt `wirkungslosGegenTerminalzustand`.
    const ziel = einheitGemeldet(hlc(4, 0, "aa"), 9, {
      einheitId: "Z",
      abschnittId: "A",
      bezeichnung: "Ziel",
      organisation: "THW",
      ebene: "GRUPPE",
      staerke: staerke(0, 0, 1),
      personalErfassung: "NUR_STAERKE",
      status: "IM_EINSATZ",
    });
    const zusammen = (h: Hlc, n: number, undoOf?: string) =>
      bau(h, n, "EinheitZusammengefuehrt", {
        zielEinheitId: "Z",
        quellen: [{ einheitId: "U1", gesehen: staerke(0, 1, 8) }],
      }, undoOf === undefined ? {} : { undoOf });
    const zustand = falte([
      ...grundmenge,
      ziel,
      zusammen(hlc(20, 0, "bb"), 1),
      zusammen(hlc(30, 0, "cc"), 1, "bb:1"),
    ]);
    expect(zustand.hinweise.filter((h) => h.art === "undoTrifftFremdenStand")).toEqual([]);
    expect(zustand.hinweise).toContainEqual(
      expect.objectContaining({
        art: "wirkungslosGegenTerminalzustand",
        grund: "QUELLE_BEREITS_AUFGEGANGEN",
      }),
    );
  });
});

describe("§5.9.2 `KorrekturVon` gilt nur fuer setzende Arten", () => {
  it("wirkt wie ein Ereignis seines `zielTyp`, mit eigener Id und HLC", () => {
    const falsch = status(hlc(5, 0, "aa"), 4, "RUFBEREITSCHAFT", "IM_EINSATZ");
    const korrektur = bau(hlc(9, 0, "bb"), 1, "KorrekturVon", {
      korrigiertesEreignisId: "aa:4",
      zielTyp: "StatusGesetzt",
      zielNutzlast: { einheitId: "U1" },
    }, { vorher: "IM_EINSATZ", neu: "RUHE", grund: "falscher Einheit zugeordnet" });
    const zustand = falte([...grundmenge, falsch, korrektur]);
    expect(zustand.einheiten["U1"]?.status.wert).toBe("RUHE");
    expect(zustand.einheiten["U1"]?.status.durch).toBe("bb:1");
    expect(zustand.unbekannt).toEqual([]);
    expect(zustand.hinweise).toEqual([]);
  });

  it("braucht seinen eigenen `grund`, auch wenn der `zielTyp` keinen verlangt (§2.4)", () => {
    const ohneGrund = bau(hlc(9, 0, "bb"), 1, "KorrekturVon", {
      korrigiertesEreignisId: "aa:4",
      zielTyp: "StatusGesetzt",
      zielNutzlast: { einheitId: "U1" },
    }, { vorher: "RUFBEREITSCHAFT", neu: "RUHE" });
    expect(falte([...grundmenge, ohneGrund]).unbekannt[0]?.grund).toBe("SCHEMA");
  });

  it("ist auf einer Anlageart ungueltig (§3.7 Punkt 4)", () => {
    // Eine Korrektur truege die groessere HLC und ueberschriebe **alle**
    // Felder ohne einen einzigen Vorher-Wert — der Fall aus §3.11, in dem
    // gemeldete Kraefte aus der Lage fallen.
    const aufAnlage = bau(hlc(9, 0, "bb"), 1, "KorrekturVon", {
      korrigiertesEreignisId: "aa:3",
      zielTyp: "EinheitGemeldet",
      zielNutzlast: { einheitId: "U1" },
    }, { neu: "irgendwas", grund: "falsch" });
    expect(falte([...grundmenge, aufAnlage]).unbekannt[0]?.grund).toBe("SCHEMA");
  });

  it("ist auf den strukturellen und den Archivierungsarten ungueltig", () => {
    for (const zielTyp of [
      "EinheitAufgeteilt",
      "EinheitZusammengefuehrt",
      "EinsatzArchiviert",
      "ArchivierungZurueckgenommen",
    ]) {
      const versuch = bau(hlc(9, 0, "bb"), 1, "KorrekturVon", {
        korrigiertesEreignisId: "aa:3",
        zielTyp,
        zielNutzlast: {},
      }, { neu: null, grund: "falsch" });
      expect(falte([...grundmenge, versuch]).unbekannt[0]?.grund, zielTyp).toBe("SCHEMA");
    }
  });

  it("T165: eine verschachtelte Korrektur ist ungueltig", () => {
    // `zielNutzlast` ist `z.unknown()`; ob eine doppelt verpackte Korrektur
    // „effektiv Form (a)" ist, waere in zwei Umsetzungen zwei Antworten.
    const verschachtelt = bau(hlc(9, 0, "bb"), 1, "KorrekturVon", {
      korrigiertesEreignisId: "aa:4",
      zielTyp: "KorrekturVon",
      zielNutzlast: {
        korrigiertesEreignisId: "aa:4",
        zielTyp: "StatusGesetzt",
        zielNutzlast: { einheitId: "U1" },
      },
    }, { neu: "RUHE", grund: "falsch" });
    expect(falte([...grundmenge, verschachtelt]).unbekannt[0]?.grund).toBe("SCHEMA");
  });

  it("weist eine `zielNutzlast` zurueck, die nicht zum `zielTyp` passt", () => {
    const daneben = bau(hlc(9, 0, "bb"), 1, "KorrekturVon", {
      korrigiertesEreignisId: "aa:4",
      zielTyp: "StatusGesetzt",
      zielNutzlast: { falschesFeld: "U1" },
    }, { neu: "RUHE", grund: "falsch" });
    expect(falte([...grundmenge, daneben]).unbekannt[0]?.grund).toBe("SCHEMA");
  });

  it("laesst das Rahmenfeld `korrekturVon` ohne Foldwirkung (§2.2)", () => {
    // Ohne diesen Satz waere das Verbot ueber den Rahmen formal zu umgehen.
    const anlageMitRahmenfeld: EingehendesEreignis = {
      ...einheitGemeldet(hlc(20, 0, "bb"), 1, {
        einheitId: "U2",
        abschnittId: "A",
        bezeichnung: "Zweite",
        organisation: "THW",
        ebene: "GRUPPE",
        staerke: staerke(0, 0, 4),
        personalErfassung: "NUR_STAERKE",
        status: "IM_EINSATZ",
      }),
      korrekturVon: "aa:3",
    };
    const zustand = falte([...grundmenge, anlageMitRahmenfeld]);
    expect(zustand.einheiten["U2"]?.staerke.wert).toEqual(staerke(0, 0, 4));
    expect(zustand.unbekannt).toEqual([]);
  });
});
