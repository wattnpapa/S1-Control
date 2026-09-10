/**
 * Die strukturellen Arten §5.4.2, §5.4.2a und §5.4.3 — Aufteilen und
 * Zusammenfuehren, die vier Wirksamkeitsbedingungen und die Kreisaufloesung.
 *
 * Die Pruefall-Nummern sind die aus §11 des Konzepts.
 */

import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION, ereignisId } from "./ereignis.js";
import {
  falte,
  falteHinzu,
  leereFaltung,
  materialisiere,
  type EingehendesEreignis,
} from "./fold.js";
import type { Hlc } from "./hlc.js";
import {
  abschnittAngelegt,
  akteur,
  einheitGemeldet,
  einsatzAngelegt,
  hlc,
  staerke,
} from "./pruefhilfen/ereignisbau.js";
import type { Staerke } from "./werte.js";

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

const abschnittA = abschnittAngelegt(hlc(2, 0, "aa"), 2, {
  abschnittId: "A",
  name: "Einsatzort",
  abschnittstyp: "EINSATZORT",
  reihenfolge: 1,
});

function einheit(h: Hlc, laufnummer: number, id: string, s: Staerke) {
  return einheitGemeldet(h, laufnummer, {
    einheitId: id,
    abschnittId: "A",
    bezeichnung: `Einheit ${id}`,
    organisation: "THW",
    ebene: "GRUPPE",
    staerke: s,
    personalErfassung: "NUR_STAERKE",
    status: "IM_EINSATZ",
  });
}

/** Die Anlage der abgeteilten Einheit, wie `EinheitAufgeteilt` sie mitfuehrt. */
function neueEinheit(s: Staerke) {
  return {
    abschnittId: "A",
    bezeichnung: "Teileinheit",
    organisation: "THW",
    hierarchie: [],
    ebene: "TRUPP",
    staerke: s,
    personalErfassung: "NUR_STAERKE",
    status: "IM_EINSATZ",
    reihenfolge: 1,
    istFuehrungDesAbschnitts: false,
  };
}

function aufgeteilt(
  h: Hlc,
  laufnummer: number,
  quelle: string,
  neueId: string,
  abgeteilt: Staerke,
  gesehen: Staerke,
  uebernahmen: {
    uebernommeneFahrzeuge?: { fahrzeugId: string; gesehenEinheitId?: string }[];
    uebernommenePersonen?: { personId: string; gesehenEinheitId?: string }[];
  } = {},
) {
  return bau(h, laufnummer, "EinheitAufgeteilt", {
    quellEinheitId: quelle,
    neueEinheitId: neueId,
    neueEinheit: neueEinheit(abgeteilt),
    abgeteilteStaerke: abgeteilt,
    gesehen,
    uebernommeneFahrzeuge: uebernahmen.uebernommeneFahrzeuge ?? [],
    uebernommenePersonen: uebernahmen.uebernommenePersonen ?? [],
  });
}

function zusammengefuehrt(
  h: Hlc,
  laufnummer: number,
  ziel: string,
  quellen: { einheitId: string; gesehen: Staerke }[],
) {
  return bau(h, laufnummer, "EinheitZusammengefuehrt", { zielEinheitId: ziel, quellen });
}

/** Die Bilanzsumme aus §8.1 — ungeklemmt, ueber alles, was zaehlt. */
function bilanz(zustand: ReturnType<typeof falte>): number {
  let summe = 0;
  for (const e of Object.values(zustand.einheiten)) {
    if (e.entfernt?.wert === true || e.wirksamAufgegangen) continue;
    const r = e.wirksameStaerkeRechnerisch;
    summe += r.fuehrer + r.unterfuehrer + r.mannschaft;
  }
  return summe;
}

describe("§5.4.2 Aufteilen wirkt relativ, und die Wirkung steht an der neuen Einheit", () => {
  const u = einheit(hlc(10, 0, "aa"), 3, "U", staerke(1, 4, 12));

  it("T20: zwei nebenlaeufige Aufteilungen derselben Quelle, jede Permutation", () => {
    const eins = aufgeteilt(hlc(20, 0, "bb"), 1, "U", "V1", staerke(0, 1, 3), staerke(1, 4, 12));
    const zwei = aufgeteilt(hlc(21, 0, "cc"), 1, "U", "V2", staerke(0, 1, 3), staerke(1, 4, 12));
    for (const menge of [
      [einsatz, abschnittA, u, eins, zwei],
      [einsatz, zwei, eins, u, abschnittA],
      [zwei, u, einsatz, eins, abschnittA],
    ]) {
      const zustand = falte(menge);
      expect(zustand.einheiten["U"]?.wirksameStaerke).toEqual(staerke(1, 2, 6));
      expect(zustand.einheiten["V1"]?.wirksameStaerke).toEqual(staerke(0, 1, 3));
      expect(zustand.einheiten["V2"]?.wirksameStaerke).toEqual(staerke(0, 1, 3));
      // Die Gesamtstaerke bleibt: 17 vorher, 9 + 4 + 4 nachher.
      expect(bilanz(zustand)).toBe(17);
      // Der Fehlalarm aus §5.4.3: Jede Vergleichsgroesse nimmt den Abgang der
      // anderen Aufteilung mit. Er bleibt stehen — die Frage „war der fremde
      // Abgang schon da?" liesse sich nur ueber eine HLC beantworten.
      expect(
        zustand.hinweise.filter(
          (h) => h.art === "vorgangSummeWeichtAb" && h.vorgangsart === "AUFTEILUNG",
        ),
      ).toHaveLength(2);
    }
  });

  it("T21/T22: eine Staerkemeldung laesst den Abzug unberuehrt, in beiden Richtungen", () => {
    const teilung = aufgeteilt(hlc(50, 0, "bb"), 1, "U", "V", staerke(0, 0, 3), staerke(1, 4, 12));
    const meldungSpaeter = bau(hlc(90, 0, "cc"), 1, "StaerkeGeaendert", { einheitId: "U" }, {
      vorher: staerke(1, 4, 12),
      neu: staerke(1, 4, 12),
    });
    const meldungFrueher = bau(hlc(5, 0, "cc"), 1, "StaerkeGeaendert", { einheitId: "U" }, {
      vorher: staerke(1, 4, 12),
      neu: staerke(1, 4, 12),
    });
    for (const meldung of [meldungSpaeter, meldungFrueher]) {
      const zustand = falte([einsatz, abschnittA, u, teilung, meldung]);
      // `staerke` traegt die **eigene** Staerke; eine Meldung kann einen
      // Abzug nie „schon enthalten", sie beschreibt ihn nicht.
      expect(zustand.einheiten["U"]?.wirksameStaerke).toEqual(staerke(1, 4, 9));
      expect(bilanz(zustand)).toBe(17);
    }
  });

  it("T23: abgeteilte Staerke groesser als die Quelle — 0/0/0 und `staerkeGeklemmt`", () => {
    const klein = einheit(hlc(10, 0, "aa"), 3, "K", staerke(0, 0, 3));
    const teilung = aufgeteilt(hlc(20, 0, "bb"), 1, "K", "V", staerke(0, 0, 8), staerke(0, 0, 8));
    const zustand = falte([einsatz, abschnittA, klein, teilung]);
    expect(zustand.einheiten["K"]?.wirksameStaerke).toEqual(staerke(0, 0, 0));
    // Der rechnerische Wert bleibt im Zustand: Ohne ihn waere die Klemmung
    // nach einem Schnappschuss nicht mehr nachvollziehbar.
    expect(zustand.einheiten["K"]?.wirksameStaerkeRechnerisch).toEqual(staerke(0, 0, -5));
    expect(zustand.hinweise).toContainEqual({
      art: "staerkeGeklemmt",
      feldpfad: "einheit/K/staerke",
      rechnerisch: staerke(0, 0, -5),
    });
  });

  it("T150: die Vergleichsgroesse rechnet ungeklemmt, sonst waere sie blind", () => {
    // Wer aus 0/0/3 achte abteilt und `gesehen` 0/0/8 eintraegt, kaeme mit der
    // geklemmten Groesse auf Uebereinstimmung und bekaeme keinen Hinweis.
    const klein = einheit(hlc(10, 0, "aa"), 3, "K", staerke(0, 0, 3));
    const teilung = aufgeteilt(hlc(20, 0, "bb"), 1, "K", "V", staerke(0, 0, 8), staerke(0, 0, 8));
    const zustand = falte([einsatz, abschnittA, klein, teilung]);
    expect(zustand.hinweise).toContainEqual({
      art: "vorgangSummeWeichtAb",
      feldpfad: "einheit/K/staerke",
      vorgangsart: "AUFTEILUNG",
      vorgang: "bb:1",
      gesehen: staerke(0, 0, 8),
      berechnet: staerke(0, 0, 3),
    });
  });

  it("T24: nach einem Schnappschuss ergibt eine spaetere Meldung dasselbe", () => {
    const grund = [
      einsatz,
      abschnittA,
      u,
      aufgeteilt(hlc(50, 0, "bb"), 1, "U", "V", staerke(0, 0, 3), staerke(1, 4, 12)),
    ];
    const spaeter = bau(hlc(3, 0, "cc"), 1, "StaerkeGeaendert", { einheitId: "U" }, {
      vorher: staerke(1, 4, 12),
      neu: staerke(1, 4, 12),
    });
    expect(materialisiere(falteHinzu(falteHinzu(leereFaltung(), grund), [spaeter]))).toEqual(
      falte([...grund, spaeter]),
    );
  });

  it("T25: zwei inhaltsgleiche Aufteilungen auf dieselbe neue Einheit — ein Abzug", () => {
    // Idempotent ueber den **Fachvorgang**: Jede Einheit traegt ein
    // `abgeteiltVon`. Eine Liste von Deltas zaehlte je Ereignis, nicht je
    // Vorgang.
    const eins = aufgeteilt(hlc(20, 0, "bb"), 1, "U", "V", staerke(0, 0, 3), staerke(1, 4, 12));
    const zwei = aufgeteilt(hlc(21, 0, "cc"), 1, "U", "V", staerke(0, 0, 3), staerke(1, 4, 12));
    const zustand = falte([einsatz, abschnittA, u, eins, zwei]);
    expect(zustand.einheiten["U"]?.wirksameStaerke).toEqual(staerke(1, 4, 9));
    expect(bilanz(zustand)).toBe(17);
    // Die verdraengte Aufteilung meldet sich (§3.12).
    expect(zustand.hinweise).toContainEqual({
      art: "wirkungslosGegenTerminalzustand",
      feldpfad: "einheit/V/abgeteiltVon",
      ereignis: "cc:1",
      grund: "ZWEITE_AUFTEILUNG",
    });
  });

  it("nimmt Fahrzeuge und Personen mit, mit dem gesehenen Vorher-Wert aus der Nutzlast", () => {
    const fahrzeug = bau(hlc(11, 0, "aa"), 4, "FahrzeugAngelegt", {
      fahrzeugId: "F1",
      einheitId: "U",
      typ: "GKW",
      status: "EINSATZBEREIT",
    });
    const teilung = aufgeteilt(
      hlc(20, 0, "bb"),
      1,
      "U",
      "V",
      staerke(0, 0, 3),
      staerke(1, 4, 12),
      { uebernommeneFahrzeuge: [{ fahrzeugId: "F1", gesehenEinheitId: "U" }] },
    );
    const zustand = falte([einsatz, abschnittA, u, fahrzeug, teilung]);
    expect(zustand.fahrzeuge["F1"]?.einheitId?.wert).toBe("V");
    expect(zustand.fahrzeuge["F1"]?.einheitId?.gesehenerVorher).toEqual({ wert: "U" });
    expect(zustand.hinweise.filter((h) => h.art === "vorherPasstNicht")).toEqual([]);
  });

  it("laesst ein noch unbekanntes Fahrzeug warten (§3.10)", () => {
    const teilung = aufgeteilt(
      hlc(20, 0, "bb"),
      1,
      "U",
      "V",
      staerke(0, 0, 3),
      staerke(1, 4, 12),
      { uebernommeneFahrzeuge: [{ fahrzeugId: "F9" }] },
    );
    const zustand = falte([einsatz, abschnittA, u, teilung]);
    expect(zustand.wartend["fahrzeug/F9"]?.[0]?.feld).toBe("einheitId");
    expect(zustand.fahrzeuge["F9"]).toBeUndefined();
  });
});

describe("§5.4.2a Wann ein Summand wirkt", () => {
  const u = einheit(hlc(10, 0, "aa"), 3, "U", staerke(0, 0, 10));

  it("T124/(3): ein `abgeteiltVon` an einer fremd angelegten Einheit wirkt nicht", () => {
    // Der Meldekopf meldet V direkt (HLC 5), die Fuehrungsstelle teilt sie
    // danach aus U ab (HLC 100). Wirkte der Abzug, haette die Fuehrungsstelle
    // einer Meldung, die sie nicht geschrieben hat, drei Helfer entnommen.
    const vDirekt = einheit(hlc(5, 0, "cc"), 1, "V", staerke(0, 0, 3));
    const teilung = aufgeteilt(hlc(100, 0, "bb"), 1, "U", "V", staerke(0, 0, 3), staerke(0, 0, 10));
    const zustand = falte([einsatz, abschnittA, u, vDirekt, teilung]);
    expect(zustand.einheiten["U"]?.wirksameStaerke).toEqual(staerke(0, 0, 10));
    // Kein `vorgangSummeWeichtAb`: Wirkt die Kante nicht, unterbleibt der
    // Vergleich. Der Widerspruch ist ueber die Anlagehinweise sichtbar.
    expect(zustand.hinweise.filter((h) => h.art === "vorgangSummeWeichtAb")).toEqual([]);
    expect(zustand.hinweise.some((h) => h.art === "zweiteAnlageVerworfen")).toBe(true);
  });

  it("T133: unbekannte Quelle einer Aufteilung — Hinweis, aber kein Verlust", () => {
    const teilung = aufgeteilt(hlc(20, 0, "bb"), 1, "FEHLT", "V", staerke(0, 0, 3), staerke(0, 0, 9));
    const zustand = falte([einsatz, abschnittA, teilung]);
    expect(zustand.einheiten["V"]?.wirksameStaerke).toEqual(staerke(0, 0, 3));
    expect(zustand.hinweise).toContainEqual({
      art: "fremdreferenzUnbekannt",
      feldpfad: "einheit/V/abgeteiltVon",
      verweistAuf: "FEHLT",
    });
    expect(zustand.hinweise.filter((h) => h.art === "vorgangSummeWeichtAb")).toEqual([]);
  });

  it("das unbekannte Ziel einer Zusammenfuehrung laesst die Quelle eigenstaendig", () => {
    // Ohne diese Regel verschwaenden ihre Kraefte vollstaendig: Sie zaehlte
    // nicht mehr, und ihr Summand faende kein Ziel.
    const zusammen = zusammengefuehrt(hlc(20, 0, "bb"), 1, "FEHLT", [
      { einheitId: "U", gesehen: staerke(0, 0, 10) },
    ]);
    const zustand = falte([einsatz, abschnittA, u, zusammen]);
    expect(zustand.einheiten["U"]?.wirksamAufgegangen).toBe(false);
    expect(zustand.einheiten["U"]?.zaehlt).toBe(true);
    expect(bilanz(zustand)).toBe(10);
    expect(zustand.hinweise).toContainEqual({
      art: "fremdreferenzUnbekannt",
      feldpfad: "einheit/U/aufgegangenIn",
      verweistAuf: "FEHLT",
    });
  });

  it("T140: (3) laeuft vor der Kreissuche", () => {
    // Eine Kante, die (3) fallen laesst, hatte nie eine Wirkung und darf
    // deshalb keine wirksame aus einem Kreis schlagen.
    const uAnlage = einheit(hlc(1000, 0, "aa"), 3, "U", staerke(0, 0, 10));
    const gegen = aufgeteilt(hlc(5, 0, "bb"), 1, "V", "U", staerke(0, 0, 3), staerke(0, 0, 3));
    const hin = aufgeteilt(hlc(9, 0, "cc"), 1, "U", "V", staerke(0, 0, 3), staerke(0, 0, 10));
    const zustand = falte([einsatz, abschnittA, uAnlage, gegen, hin]);
    // `angelegtDurch(U)` ist die Anlage mit HLC 5 (kleinste HLC), also die
    // Aufteilung `V→U` — deren Abzug wirkt. `U→V` legt V an und wirkt
    // ebenfalls; ein Kreis entsteht daraus, und die juengere Kante faellt.
    expect(zustand.hinweise.filter((h) => h.art === "aufteilungKreis")).toHaveLength(1);
    expect(bilanz(zustand)).toBeGreaterThan(0);
  });

  it("T139: zwei getrennte Graphen — Abteilen und Aufgehen bilden keinen Kreis", () => {
    // Der haeufigste zusammengesetzte Vorgang: U wird um V abgeteilt, danach
    // geht der Rest von U in V auf. Im gemeinsamen Graphen waere das ein
    // Kreis; in zwei Graphen rechnet derselbe Fall richtig.
    const teilung = aufgeteilt(hlc(20, 0, "bb"), 1, "U", "V", staerke(0, 0, 4), staerke(0, 0, 10));
    const rest = zusammengefuehrt(hlc(30, 0, "bb"), 2, "V", [
      { einheitId: "U", gesehen: staerke(0, 0, 6) },
    ]);
    const zustand = falte([einsatz, abschnittA, u, teilung, rest]);
    expect(zustand.einheiten["U"]?.wirksameStaerke).toEqual(staerke(0, 0, 6));
    expect(zustand.einheiten["U"]?.wirksamAufgegangen).toBe(true);
    expect(zustand.einheiten["U"]?.zaehlt).toBe(false);
    expect(zustand.einheiten["V"]?.wirksameStaerke).toEqual(staerke(0, 0, 10));
    expect(bilanz(zustand)).toBe(10);
    expect(zustand.hinweise.filter((h) => h.art.endsWith("Kreis"))).toEqual([]);
    expect(zustand.hinweise.filter((h) => h.art === "vorgangSummeWeichtAb")).toEqual([]);
  });

  it("T132: (1) laeuft nach der Kreissuche", () => {
    // Bei A→B, B→A und `EinheitEntfernt(A)` loest die Kreissuche zuerst auf;
    // liefe (1) zuerst, ginge B in die entfernte A auf, und B's Staerke
    // verschwaende ohne Hinweis.
    const a = einheit(hlc(10, 0, "aa"), 3, "A", staerke(0, 0, 5));
    const b = einheit(hlc(11, 0, "aa"), 4, "B", staerke(0, 0, 7));
    const aNachB = zusammengefuehrt(hlc(20, 0, "bb"), 1, "B", [
      { einheitId: "A", gesehen: staerke(0, 0, 5) },
    ]);
    const bNachA = zusammengefuehrt(hlc(30, 0, "cc"), 1, "A", [
      { einheitId: "B", gesehen: staerke(0, 0, 7) },
    ]);
    const entfernt = bau(hlc(40, 0, "dd"), 1, "EinheitEntfernt", { einheitId: "A" }, {
      neu: true,
      grund: "Doppelmeldung",
    });
    const zustand = falte([einsatz, abschnittA, a, b, aNachB, bNachA, entfernt]);
    expect(zustand.hinweise.filter((h) => h.art === "zusammenfuehrungKreis")).toHaveLength(1);
    expect(zustand.einheiten["B"]?.wirksamAufgegangen).toBe(false);
    expect(zustand.einheiten["B"]?.zaehlt).toBe(true);
  });

  it("T141/T152: das Entfernen nennt, was es mitnimmt — in beiden Richtungen", () => {
    const x = einheit(hlc(10, 0, "aa"), 3, "X", staerke(0, 0, 5));
    const y = einheit(hlc(11, 0, "aa"), 4, "Y", staerke(0, 0, 15));
    const z = einheit(hlc(12, 0, "aa"), 5, "Z", staerke(0, 0, 1));
    const xNachY = zusammengefuehrt(hlc(20, 0, "bb"), 1, "Y", [
      { einheitId: "X", gesehen: staerke(0, 0, 5) },
    ]);
    const yNachZ = zusammengefuehrt(hlc(30, 0, "bb"), 2, "Z", [
      { einheitId: "Y", gesehen: staerke(0, 0, 20) },
    ]);
    const entfernt = bau(hlc(40, 0, "cc"), 1, "EinheitEntfernt", { einheitId: "Y" }, {
      neu: true,
      grund: "war nie da",
    });
    const zustand = falte([einsatz, abschnittA, x, y, z, xNachY, yNachZ, entfernt]);
    const hinweis = zustand.hinweise.find((h) => h.art === "entfernungNimmtZugewachsenes");
    expect(hinweis).toEqual({
      art: "entfernungNimmtZugewachsenes",
      feldpfad: "einheit/Y/entfernt",
      entfernt: "cc:1",
      betroffene: [
        // Nach unten: X ist in Y aufgegangen, seine Kraefte fallen mit.
        { einheitId: "X", richtung: "QUELLE", staerke: staerke(0, 0, 5) },
        // Nach oben: Y waere in Z aufgegangen, dessen Zuwachs faellt weg.
        { einheitId: "Z", richtung: "ZIEL", staerke: staerke(0, 0, 20) },
      ],
    });
    // Die Kante bleibt wirksam; `wirksamAufgegangen` bleibt wahr.
    expect(zustand.einheiten["Y"]?.wirksamAufgegangen).toBe(true);
    expect(zustand.einheiten["Z"]?.wirksameStaerke).toEqual(staerke(0, 0, 1));
  });

  it("(2): ein Abgang wirkt weiter, auch wenn die abgeteilte Einheit entfernt ist", () => {
    const teilung = aufgeteilt(hlc(20, 0, "bb"), 1, "U", "V", staerke(0, 0, 3), staerke(0, 0, 10));
    const entfernt = bau(hlc(30, 0, "cc"), 1, "EinheitEntfernt", { einheitId: "V" }, {
      neu: true,
      grund: "abgemeldet",
    });
    const zustand = falte([einsatz, abschnittA, u, teilung, entfernt]);
    // Die drei Abgeteilten sind gegangen; sie kommen nicht dadurch zurueck,
    // dass jemand ihren Eintrag entfernt.
    expect(zustand.einheiten["U"]?.wirksameStaerke).toEqual(staerke(0, 0, 7));
    expect(bilanz(zustand)).toBe(7);
  });
});

describe("§5.4.3 Zusammenfuehren — je Quelle, und einmalig", () => {
  const z = einheit(hlc(10, 0, "aa"), 3, "Z", staerke(0, 0, 1));
  const x = einheit(hlc(11, 0, "aa"), 4, "X", staerke(0, 1, 3));
  const y = einheit(hlc(12, 0, "aa"), 5, "Y", staerke(0, 2, 6));

  it("T26: zwei Quellen — das Ziel waechst, die Gesamtstaerke bleibt", () => {
    const zusammen = zusammengefuehrt(hlc(20, 0, "bb"), 1, "Z", [
      { einheitId: "X", gesehen: staerke(0, 1, 3) },
      { einheitId: "Y", gesehen: staerke(0, 2, 6) },
    ]);
    const zustand = falte([einsatz, abschnittA, z, x, y, zusammen]);
    expect(zustand.einheiten["Z"]?.wirksameStaerke).toEqual(staerke(0, 3, 10));
    expect(zustand.einheiten["X"]?.zaehlt).toBe(false);
    expect(zustand.einheiten["Y"]?.zaehlt).toBe(false);
    expect(bilanz(zustand)).toBe(13);
    expect(zustand.hinweise).toEqual([]);
  });

  it("T27: eine Quelle meldet nebenlaeufig anders — `vorgangSummeWeichtAb`", () => {
    const zusammen = zusammengefuehrt(hlc(20, 0, "bb"), 1, "Z", [
      { einheitId: "X", gesehen: staerke(0, 1, 3) },
    ]);
    const anders = bau(hlc(30, 0, "cc"), 1, "StaerkeGeaendert", { einheitId: "X" }, {
      vorher: staerke(0, 1, 3),
      neu: staerke(0, 1, 5),
    });
    const zustand = falte([einsatz, abschnittA, z, x, zusammen, anders]);
    expect(zustand.hinweise).toContainEqual({
      art: "vorgangSummeWeichtAb",
      feldpfad: "einheit/X/staerke",
      vorgangsart: "ZUSAMMENFUEHRUNG",
      vorgang: "bb:1",
      gesehen: staerke(0, 1, 3),
      berechnet: staerke(0, 1, 5),
    });
  });

  it("T28: dieselbe Zusammenfuehrung zweimal — ein Summand", () => {
    const eins = zusammengefuehrt(hlc(20, 0, "bb"), 1, "Z", [
      { einheitId: "X", gesehen: staerke(0, 1, 3) },
    ]);
    const zwei = zusammengefuehrt(hlc(21, 0, "cc"), 1, "Z", [
      { einheitId: "X", gesehen: staerke(0, 1, 3) },
    ]);
    const zustand = falte([einsatz, abschnittA, z, x, eins, zwei]);
    expect(zustand.einheiten["Z"]?.wirksameStaerke).toEqual(staerke(0, 1, 4));
    expect(zustand.hinweise).toContainEqual({
      art: "wirkungslosGegenTerminalzustand",
      feldpfad: "einheit/X/aufgegangenIn",
      ereignis: "cc:1",
      grund: "QUELLE_BEREITS_AUFGEGANGEN",
    });
  });

  it("T29: ueberlappende Quellmengen — Y zaehlt genau einmal", () => {
    const z2 = einheit(hlc(13, 0, "aa"), 6, "Z2", staerke(0, 0, 2));
    const nachZ = zusammengefuehrt(hlc(20, 0, "bb"), 1, "Z", [
      { einheitId: "X", gesehen: staerke(0, 1, 3) },
      { einheitId: "Y", gesehen: staerke(0, 2, 6) },
    ]);
    const nachZ2 = zusammengefuehrt(hlc(30, 0, "cc"), 1, "Z2", [
      { einheitId: "Y", gesehen: staerke(0, 2, 6) },
    ]);
    const zustand = falte([einsatz, abschnittA, z, z2, x, y, nachZ, nachZ2]);
    // Die kleinere HLC gewinnt: Y geht nach Z.
    expect(zustand.einheiten["Z"]?.wirksameStaerke).toEqual(staerke(0, 3, 10));
    expect(zustand.einheiten["Z2"]?.wirksameStaerke).toEqual(staerke(0, 0, 2));
    expect(bilanz(zustand)).toBe(15);
    expect(zustand.hinweise).toContainEqual(
      expect.objectContaining({
        art: "wirkungslosGegenTerminalzustand",
        ereignis: "cc:1",
        grund: "QUELLE_BEREITS_AUFGEGANGEN",
      }),
    );
  });

  it("T30: A→B und B→A — eine Einheit bleibt eigenstaendig, kein Verlust", () => {
    const a = einheit(hlc(10, 0, "aa"), 7, "A2", staerke(0, 0, 5));
    const b = einheit(hlc(11, 0, "aa"), 8, "B2", staerke(0, 0, 7));
    const hin = zusammengefuehrt(hlc(20, 0, "bb"), 1, "B2", [
      { einheitId: "A2", gesehen: staerke(0, 0, 5) },
    ]);
    const zurueck = zusammengefuehrt(hlc(30, 0, "cc"), 1, "A2", [
      { einheitId: "B2", gesehen: staerke(0, 0, 12) },
    ]);
    for (const menge of [
      [einsatz, abschnittA, a, b, hin, zurueck],
      [einsatz, zurueck, hin, b, a, abschnittA],
    ]) {
      const zustand = falte(menge);
      expect(zustand.hinweise.filter((h) => h.art === "zusammenfuehrungKreis")).toEqual([
        {
          art: "zusammenfuehrungKreis",
          feldpfad: "einheit/B2/aufgegangenIn",
          kanten: ["bb:1", "cc:1"],
          unwirksam: "cc:1",
        },
      ]);
      expect(zustand.einheiten["B2"]?.zaehlt).toBe(true);
      expect(zustand.einheiten["A2"]?.zaehlt).toBe(false);
      expect(bilanz(zustand)).toBe(12);
    }
  });

  it("T168: die verlierende Kreiskante erzeugt kein `vorgangSummeWeichtAb`", () => {
    // Andernfalls uebersprunge P4 nach §8.1 Bedingung (i) jeden Vorgang
    // derselben Menge.
    const a = einheit(hlc(10, 0, "aa"), 7, "A3", staerke(0, 0, 5));
    const b = einheit(hlc(11, 0, "aa"), 8, "B3", staerke(0, 0, 7));
    const hin = zusammengefuehrt(hlc(20, 0, "bb"), 1, "B3", [
      { einheitId: "A3", gesehen: staerke(0, 0, 5) },
    ]);
    const zurueck = zusammengefuehrt(hlc(30, 0, "cc"), 1, "A3", [
      { einheitId: "B3", gesehen: staerke(0, 0, 999) },
    ]);
    const zustand = falte([einsatz, abschnittA, a, b, hin, zurueck]);
    expect(
      zustand.hinweise.filter(
        (h) => h.art === "vorgangSummeWeichtAb" && h.vorgangsart === "ZUSAMMENFUEHRUNG",
      ),
    ).toEqual([]);
  });

  it("T31: `zielEinheitId` unter den eigenen Quellen — ungueltige Nutzlast", () => {
    // Nicht dieselbe Behandlung wie der mehrschrittige Kreis: Das ist kein
    // Vorgang, sondern ein Tippfehler.
    const falsch = zusammengefuehrt(hlc(20, 0, "bb"), 1, "Z", [
      { einheitId: "Z", gesehen: staerke(0, 0, 1) },
    ]);
    const zustand = falte([einsatz, abschnittA, z, falsch]);
    expect(zustand.unbekannt).toEqual([expect.objectContaining({ id: "bb:1", grund: "SCHEMA" })]);
    expect(zustand.einheiten["Z"]?.aufgegangenIn).toBeUndefined();
  });

  it("T32: keine Umlenkung — was aufgegangen ist, bleibt, wo es aufging", () => {
    const z2 = einheit(hlc(13, 0, "aa"), 6, "Z2", staerke(0, 0, 2));
    const nachZ = zusammengefuehrt(hlc(9, 0, "bb"), 1, "Z", [
      { einheitId: "X", gesehen: staerke(0, 1, 3) },
    ]);
    const meldungZ = bau(hlc(12, 0, "bb"), 2, "StaerkeGeaendert", { einheitId: "Z" }, {
      vorher: staerke(0, 0, 1),
      neu: staerke(0, 0, 1),
    });
    const nachZ2 = zusammengefuehrt(hlc(15, 0, "cc"), 1, "Z2", [
      { einheitId: "X", gesehen: staerke(0, 1, 3) },
    ]);
    const zustand = falte([einsatz, abschnittA, z, z2, x, nachZ, meldungZ, nachZ2]);
    expect(zustand.einheiten["Z"]?.wirksameStaerke).toEqual(staerke(0, 1, 4));
    expect(zustand.einheiten["Z2"]?.wirksameStaerke).toEqual(staerke(0, 0, 2));
    // Ohne die Monotonie zaehlte X zweimal.
    expect(bilanz(zustand)).toBe(7);
    expect(zustand.hinweise).toContainEqual(
      expect.objectContaining({ art: "wirkungslosGegenTerminalzustand", ereignis: "cc:1" }),
    );
  });

  it("T126: die fuenfte Bedingung ist unnoetig — der Fall wird sichtbar", () => {
    // U geht in Z auf, danach wird U aufgeteilt. Die Vergleichsgroesse ist die
    // wirksame Staerke der Quelle und passt nicht mehr zu `gesehen`.
    const u = einheit(hlc(10, 0, "aa"), 9, "U9", staerke(0, 0, 10));
    const nachZ = zusammengefuehrt(hlc(20, 0, "bb"), 1, "Z", [
      { einheitId: "U9", gesehen: staerke(0, 0, 10) },
    ]);
    const teilung = aufgeteilt(hlc(30, 0, "cc"), 1, "U9", "V9", staerke(0, 0, 4), staerke(0, 0, 10));
    const zustand = falte([einsatz, abschnittA, z, u, nachZ, teilung]);
    expect(zustand.hinweise).toContainEqual({
      art: "vorgangSummeWeichtAb",
      feldpfad: "einheit/U9/staerke",
      vorgangsart: "ZUSAMMENFUEHRUNG",
      vorgang: "bb:1",
      gesehen: staerke(0, 0, 10),
      berechnet: staerke(0, 0, 6),
    });
  });
});

describe("Die strukturellen Arten sind rebase-fest (P7)", () => {
  it("ergibt ueber jeden Schnitt denselben Zustand wie der volle Fold", () => {
    const u = einheit(hlc(10, 0, "aa"), 3, "U", staerke(0, 2, 12));
    const z = einheit(hlc(11, 0, "aa"), 4, "Z", staerke(0, 0, 1));
    const menge = [
      einsatz,
      abschnittA,
      u,
      z,
      aufgeteilt(hlc(20, 0, "bb"), 1, "U", "V", staerke(0, 1, 3), staerke(0, 2, 12)),
      zusammengefuehrt(hlc(40, 0, "cc"), 1, "Z", [
        { einheitId: "V", gesehen: staerke(0, 1, 3) },
      ]),
      bau(hlc(50, 0, "dd"), 1, "StaerkeGeaendert", { einheitId: "U" }, {
        vorher: staerke(0, 2, 12),
        neu: staerke(0, 2, 12),
      }),
    ];
    const voll = falte(menge);
    for (let schnitt = 1; schnitt < menge.length; schnitt += 1) {
      const teil = falteHinzu(leereFaltung(), menge.slice(0, schnitt));
      expect(materialisiere(falteHinzu(teil, menge.slice(schnitt)))).toEqual(voll);
    }
    // U 0/2/12 und Z 0/0/1 sind 15; Abteilen und Aufgehen verschieben nur.
    expect(bilanz(voll)).toBe(15);
  });
});
