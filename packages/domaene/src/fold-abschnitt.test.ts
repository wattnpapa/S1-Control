/**
 * Die Abschnittsregeln §5.3.1 bis §5.3.3 — Zyklus, Aufloesung, Auffang.
 *
 * Die Pruefall-Nummern sind die aus §11 des Konzepts.
 */

import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION, ereignisId } from "./ereignis.js";
import { falte, materialisiere, falteHinzu, leereFaltung, type EingehendesEreignis } from "./fold.js";
import type { Hlc } from "./hlc.js";
import {
  abschnittAngelegt,
  akteur,
  einheitGemeldet,
  einsatzAngelegt,
  hlc,
  staerke,
} from "./pruefhilfen/ereignisbau.js";
import { AUFFANG_ABSCHNITT_ID } from "./zustand.js";

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
    wanduhr: new Date(Date.parse("2026-09-08T08:00:00+02:00") + h.millisekunden).toISOString(),
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

function abschnitt(h: Hlc, laufnummer: number, id: string, parentId?: string) {
  return abschnittAngelegt(h, laufnummer, {
    abschnittId: id,
    name: `Abschnitt ${id}`,
    abschnittstyp: "EINSATZORT",
    reihenfolge: 1,
    ...(parentId === undefined ? {} : { parentId }),
  });
}

function umgehaengt(h: Hlc, laufnummer: number, id: string, neu: string | null, vorher?: string) {
  return bau(h, laufnummer, "AbschnittUmgehaengt", { abschnittId: id }, {
    neu,
    ...(vorher === undefined ? {} : { vorher }),
  });
}

function aufgeloest(h: Hlc, laufnummer: number, id: string, ziel: string, vorher?: unknown) {
  return bau(h, laufnummer, "AbschnittAufgeloest", { abschnittId: id }, {
    neu: { zielAbschnittId: ziel, aufgeloestAm: "2026-09-08T10:00:00+02:00" },
    ...(vorher === undefined ? {} : { vorher }),
  });
}

function einheitIn(h: Hlc, laufnummer: number, id: string, abschnittId: string) {
  return einheitGemeldet(h, laufnummer, {
    einheitId: id,
    abschnittId,
    bezeichnung: "Bergungsgruppe",
    organisation: "THW",
    ebene: "GRUPPE",
    staerke: staerke(0, 1, 8),
    personalErfassung: "NUR_STAERKE",
    status: "IM_EINSATZ",
  });
}

describe("§5.3.1 Die Zyklusregel wirkt auf das abgeleitete Feld (Auflage 10)", () => {
  it("T3: X unter Y, Y unter X — die groessere HLC weicht, in jeder Permutation", () => {
    const x = abschnitt(hlc(10, 0, "aa"), 2, "X");
    const y = abschnitt(hlc(11, 0, "aa"), 3, "Y");
    const xUnterY = umgehaengt(hlc(5, 0, "bb"), 1, "X", "Y");
    const yUnterX = umgehaengt(hlc(7, 0, "cc"), 1, "Y", "X");

    for (const menge of [
      [einsatz, x, y, xUnterY, yUnterX],
      [einsatz, yUnterX, xUnterY, y, x],
      [einsatz, y, yUnterX, x, xUnterY],
    ]) {
      const zustand = falte(menge);
      // Die juengere Handlung weicht; `parentId` behaelt seinen Gewinner.
      expect(zustand.abschnitte["Y"]?.wirksamerParentId).toBeUndefined();
      expect(zustand.abschnitte["Y"]?.parentId?.wert).toBe("X");
      expect(zustand.abschnitte["X"]?.wirksamerParentId).toBe("Y");
      expect(zustand.hinweise.filter((h) => h.art === "zyklusAufgeloest")).toEqual([
        {
          art: "zyklusAufgeloest",
          feldpfad: "abschnitt/Y/parentId",
          ereignis: "cc:1",
          gewuenschterParentId: "X",
        },
      ]);
    }
  });

  it("T4: Dreierzyklus — genau eine Kante weicht, in jeder Permutation dieselbe", () => {
    const anlagen = [
      abschnitt(hlc(10, 0, "aa"), 2, "A"),
      abschnitt(hlc(11, 0, "aa"), 3, "B"),
      abschnitt(hlc(12, 0, "aa"), 4, "C"),
    ];
    const kanten = [
      umgehaengt(hlc(5, 0, "bb"), 1, "A", "B"),
      umgehaengt(hlc(6, 0, "bb"), 2, "B", "C"),
      umgehaengt(hlc(9, 0, "cc"), 1, "C", "A"),
    ];
    for (const menge of [
      [einsatz, ...anlagen, ...kanten],
      [einsatz, ...kanten, ...anlagen].reverse(),
      [einsatz, kanten[2], anlagen[1], kanten[0], anlagen[2], kanten[1], anlagen[0]],
    ] as EingehendesEreignis[][]) {
      const zustand = falte(menge);
      const gefallen = zustand.hinweise.filter((h) => h.art === "zyklusAufgeloest");
      expect(gefallen).toHaveLength(1);
      expect(gefallen[0]).toMatchObject({ feldpfad: "abschnitt/C/parentId", ereignis: "cc:1" });
      expect(zustand.abschnitte["C"]?.wirksamerParentId).toBeUndefined();
      expect(zustand.abschnitte["A"]?.wirksamerParentId).toBe("B");
      expect(zustand.abschnitte["B"]?.wirksamerParentId).toBe("C");
    }
  });

  it("T5: `parentId` gleich der eigenen Id — Wurzel und Hinweis", () => {
    const zustand = falte([
      einsatz,
      abschnitt(hlc(10, 0, "aa"), 2, "X"),
      umgehaengt(hlc(20, 0, "bb"), 1, "X", "X"),
    ]);
    expect(zustand.abschnitte["X"]?.wirksamerParentId).toBeUndefined();
    expect(zustand.hinweise).toContainEqual({
      art: "zyklusAufgeloest",
      feldpfad: "abschnitt/X/parentId",
      ereignis: "bb:1",
      gewuenschterParentId: "X",
    });
  });

  it("T6: nach einem Schnappschuss ergibt eine spaetere Umhaengung denselben Baum", () => {
    const grund = [
      einsatz,
      abschnitt(hlc(10, 0, "aa"), 2, "X"),
      abschnitt(hlc(11, 0, "aa"), 3, "Y"),
      abschnitt(hlc(12, 0, "aa"), 4, "Z"),
      umgehaengt(hlc(5, 0, "bb"), 1, "X", "Y"),
      umgehaengt(hlc(7, 0, "cc"), 1, "Y", "X"),
    ];
    const spaeter = umgehaengt(hlc(60, 0, "dd"), 1, "Y", "Z", "X");
    const ueberSchnitt = materialisiere(falteHinzu(falteHinzu(leereFaltung(), grund), [spaeter]));
    const voll = falte([...grund, spaeter]);
    expect(ueberSchnitt).toEqual(voll);
    expect(voll.abschnitte["Y"]?.wirksamerParentId).toBe("Z");
    expect(voll.hinweise.filter((h) => h.art === "zyklusAufgeloest")).toEqual([]);
  });

  it("laesst einen Abschnitt unter einem unbekannten Elternteil stehen", () => {
    // §5.3.1 spricht nur vom Zyklus; ein unbekanntes Elternteil ist keiner.
    const zustand = falte([einsatz, abschnitt(hlc(10, 0, "aa"), 2, "X", "GIBT_ES_NICHT")]);
    expect(zustand.abschnitte["X"]?.wirksamerParentId).toBe("GIBT_ES_NICHT");
    expect(zustand.hinweise.filter((h) => h.art === "zyklusAufgeloest")).toEqual([]);
  });
});

describe("§5.3.2 Der aufgeloeste Abschnitt", () => {
  const a = abschnitt(hlc(10, 0, "aa"), 2, "A");
  const b = abschnitt(hlc(11, 0, "aa"), 3, "B");
  const c = abschnitt(hlc(12, 0, "aa"), 4, "C");

  it("T7: Einheit in A, Aufloesung A → B — wirksam ist B", () => {
    const zustand = falte([
      einsatz,
      a,
      b,
      einheitIn(hlc(20, 0, "aa"), 5, "U1", "A"),
      aufgeloest(hlc(30, 0, "bb"), 1, "A", "B"),
    ]);
    expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("B");
    // Der Abschnitt bleibt im Zustand, mit `aufgeloest` und dessen HLC.
    expect(zustand.abschnitte["A"]?.aufgeloest?.hlc.millisekunden).toBe(30);
    expect(zustand.hinweise).toContainEqual({
      art: "abschnittAufgeloest",
      feldpfad: "einheit/U1/abschnittId",
      aufgeloesterAbschnittId: "A",
      zielAbschnittId: "B",
    });
  });

  it("T8: Verschiebung nach A mit hoeherer HLC als die Aufloesung — wirksam bleibt B", () => {
    // Die Verschiebung wird gefaltet, die Wirkung ist der Weiterlauf ins Ziel.
    // Eine Einheit darf nie in einem nicht existierenden Abschnitt haengen.
    const zustand = falte([
      einsatz,
      a,
      b,
      einheitIn(hlc(20, 0, "aa"), 5, "U1", "B"),
      aufgeloest(hlc(50, 0, "bb"), 1, "A", "B"),
      bau(hlc(90, 0, "cc"), 1, "EinheitVerschoben", { einheitId: "U1" }, { vorher: "B", neu: "A" }),
    ]);
    expect(zustand.einheiten["U1"]?.abschnittId.wert).toBe("A");
    expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("B");
  });

  it("T9: A → B, B → C — die Kette endet regulaer in C", () => {
    const zustand = falte([
      einsatz,
      a,
      b,
      c,
      einheitIn(hlc(20, 0, "aa"), 5, "U1", "A"),
      aufgeloest(hlc(30, 0, "bb"), 1, "A", "B"),
      aufgeloest(hlc(31, 0, "bb"), 2, "B", "C"),
    ]);
    expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("C");
    // Immer das **erste** Kettenglied, damit der Hinweis nicht davon abhaengt,
    // wie weit ein Client die Kette schon kennt.
    expect(zustand.hinweise.filter((h) => h.art === "abschnittAufgeloest")).toEqual([
      {
        art: "abschnittAufgeloest",
        feldpfad: "einheit/U1/abschnittId",
        aufgeloesterAbschnittId: "A",
        zielAbschnittId: "B",
      },
    ]);
  });

  it("T10: A → B, B → A, beide bekannt — Auffang und genau ein Hinweis", () => {
    const zustand = falte([
      einsatz,
      a,
      b,
      einheitIn(hlc(20, 0, "aa"), 5, "U1", "A"),
      aufgeloest(hlc(30, 0, "bb"), 1, "A", "B"),
      aufgeloest(hlc(31, 0, "bb"), 2, "B", "A"),
    ]);
    expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe(AUFFANG_ABSCHNITT_ID);
    expect(zustand.einheiten["U1"]?.zaehlt).toBe(true);
    // `abschnittUnbekannt` entsteht nicht — es haette kein Feld zu fuellen.
    expect(zustand.hinweise.filter((h) => h.art === "abschnittUnbekannt")).toEqual([]);
    expect(zustand.hinweise.filter((h) => h.art === "abschnittAufgeloest")).toHaveLength(1);
  });

  it("endet die Kette im Unbekannten, gibt es Auffang und beide Hinweise", () => {
    const zustand = falte([
      einsatz,
      a,
      b,
      einheitIn(hlc(20, 0, "aa"), 5, "U1", "A"),
      aufgeloest(hlc(30, 0, "bb"), 1, "A", "B"),
      aufgeloest(hlc(31, 0, "bb"), 2, "B", "NOCH_NICHT_DA"),
    ]);
    expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe(AUFFANG_ABSCHNITT_ID);
    expect(zustand.hinweise).toContainEqual({
      art: "abschnittAufgeloest",
      feldpfad: "einheit/U1/abschnittId",
      aufgeloesterAbschnittId: "A",
      zielAbschnittId: "B",
    });
    expect(zustand.hinweise).toContainEqual({
      art: "abschnittUnbekannt",
      feldpfad: "einheit/U1/abschnittId",
      gemeldeterAbschnittId: "NOCH_NICHT_DA",
    });
  });

  it("T11: zwei Aufloesungen mit verschiedenem Ziel — die hoehere HLC gilt, mit Hinweis", () => {
    const zustand = falte([
      einsatz,
      a,
      b,
      c,
      einheitIn(hlc(20, 0, "aa"), 5, "U1", "A"),
      aufgeloest(hlc(30, 0, "bb"), 1, "A", "B"),
      aufgeloest(hlc(40, 0, "cc"), 1, "A", "C", null),
    ]);
    expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("C");
    expect(zustand.hinweise).toContainEqual(
      expect.objectContaining({ art: "vorherPasstNicht", feldpfad: "abschnitt/A/aufgeloest" }),
    );
  });

  it("T12: nach einem Schnappschuss ergibt eine spaetere Aufloesung dasselbe", () => {
    const grund = [
      einsatz,
      a,
      b,
      c,
      abschnitt(hlc(13, 0, "aa"), 6, "D"),
      einheitIn(hlc(20, 0, "aa"), 5, "U1", "A"),
      aufgeloest(hlc(30, 0, "bb"), 1, "A", "B"),
      aufgeloest(hlc(31, 0, "bb"), 2, "B", "C"),
    ];
    const spaeter = aufgeloest(hlc(70, 0, "cc"), 1, "C", "D");
    expect(materialisiere(falteHinzu(falteHinzu(leereFaltung(), grund), [spaeter]))).toEqual(
      falte([...grund, spaeter]),
    );
    expect(falte([...grund, spaeter]).einheiten["U1"]?.wirksamerAbschnittId).toBe("D");
  });

  it("holt die Wiederherstellung den Abschnitt zurueck (`neu = null`)", () => {
    const zustand = falte([
      einsatz,
      a,
      b,
      einheitIn(hlc(20, 0, "aa"), 5, "U1", "A"),
      aufgeloest(hlc(30, 0, "bb"), 1, "A", "B"),
      bau(hlc(40, 0, "bb"), 2, "AbschnittWiederhergestellt", { abschnittId: "A" }, { neu: null }),
    ]);
    expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("A");
    expect(zustand.hinweise.filter((h) => h.art === "abschnittAufgeloest")).toEqual([]);
  });
});

describe("§5.3.3 Fahrzeuge gehen nicht in den Auffang", () => {
  function fahrzeug(h: Hlc, laufnummer: number, id: string, abschnittId?: string) {
    return bau(h, laufnummer, "FahrzeugAngelegt", {
      fahrzeugId: id,
      typ: "GKW",
      status: "EINSATZBEREIT",
      ...(abschnittId === undefined ? {} : { abschnittId }),
    });
  }

  it("T15: unmittelbar unbekannter Abschnitt — kein Auffang, `fremdreferenzUnbekannt`", () => {
    const zustand = falte([einsatz, fahrzeug(hlc(20, 0, "aa"), 2, "F1", "GIBT_ES_NICHT")]);
    expect(zustand.fahrzeuge["F1"]?.wirksamerAbschnittId).toBeUndefined();
    expect(zustand.fahrzeuge["F1"]?.abschnittId?.wert).toBe("GIBT_ES_NICHT");
    expect(zustand.hinweise).toContainEqual({
      art: "fremdreferenzUnbekannt",
      feldpfad: "fahrzeug/F1/abschnittId",
      verweistAuf: "GIBT_ES_NICHT",
    });
  });

  it("folgt der Aufloesungskette und behaelt im Kreis den eigenen Abschnitt (T173)", () => {
    const gemeinsam = [
      einsatz,
      abschnitt(hlc(10, 0, "aa"), 2, "A"),
      abschnitt(hlc(11, 0, "aa"), 3, "B"),
      fahrzeug(hlc(20, 0, "aa"), 4, "F1", "A"),
    ];
    const regulaer = falte([...gemeinsam, aufgeloest(hlc(30, 0, "bb"), 1, "A", "B")]);
    expect(regulaer.fahrzeuge["F1"]?.wirksamerAbschnittId).toBe("B");

    const kreis = falte([
      ...gemeinsam,
      aufgeloest(hlc(30, 0, "bb"), 1, "A", "B"),
      aufgeloest(hlc(31, 0, "bb"), 2, "B", "A"),
    ]);
    expect(kreis.fahrzeuge["F1"]?.wirksamerAbschnittId).toBe("A");
    expect(kreis.hinweise).toContainEqual({
      art: "abschnittAufgeloest",
      feldpfad: "fahrzeug/F1/abschnittId",
      aufgeloesterAbschnittId: "A",
      zielAbschnittId: "B",
    });
  });

  it("meldet am unbekannten Kettenende beides und behaelt den eigenen Abschnitt", () => {
    const zustand = falte([
      einsatz,
      abschnitt(hlc(10, 0, "aa"), 2, "A"),
      fahrzeug(hlc(20, 0, "aa"), 3, "F1", "A"),
      aufgeloest(hlc(30, 0, "bb"), 1, "A", "NOCH_NICHT_DA"),
    ]);
    expect(zustand.fahrzeuge["F1"]?.wirksamerAbschnittId).toBe("A");
    expect(zustand.hinweise).toContainEqual({
      art: "fremdreferenzUnbekannt",
      feldpfad: "fahrzeug/F1/abschnittId",
      verweistAuf: "NOCH_NICHT_DA",
    });
  });
});

describe("§5.3.3 Der Auffang und sein benannter Preis", () => {
  it("T13/T14: Einheit in einem noch unbekannten Abschnitt, in jeder Permutation", () => {
    const einheit = einheitIn(hlc(20, 0, "aa"), 5, "U1", "Q");
    const ohne = falte([einsatz, einheit]);
    expect(ohne.einheiten["U1"]?.wirksamerAbschnittId).toBe(AUFFANG_ABSCHNITT_ID);
    expect(ohne.einheiten["U1"]?.zaehlt).toBe(true);

    const q = abschnitt(hlc(30, 0, "bb"), 1, "Q");
    for (const menge of [
      [einsatz, einheit, q],
      [einsatz, q, einheit],
    ]) {
      const zustand = falte(menge);
      expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("Q");
      expect(zustand.hinweise).toEqual([]);
    }
  });

  it("der Preis: die Gesamtstaerke springt nach unten, wenn der Abschnitt eintrifft (§8.2)", () => {
    const einheit = einheitIn(hlc(20, 0, "aa"), 5, "U1", "Q");
    expect(falte([einsatz, einheit]).einheiten["U1"]?.zaehlt).toBe(true);

    const angefordert = abschnittAngelegt(hlc(30, 0, "bb"), 1, {
      abschnittId: "Q",
      name: "Angefordert",
      abschnittstyp: "ANGEFORDERT",
      reihenfolge: 9,
    });
    expect(falte([einsatz, einheit, angefordert]).einheiten["U1"]?.zaehlt).toBe(false);
  });
});
