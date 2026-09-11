/**
 * Die drei Ansichtsrufe und der Lagezeiger (M3.7).
 *
 * Der Zuschnitt aus dem M2-Abschlussbericht steht hier als Pruefsatz: Das
 * geschobene Lagebild waechst **nicht**, geschoben wird ein Zeiger, und Baum,
 * Tabelle und Tagebuch werden geholt. Gemessen wird an einem echten
 * Aktendienst auf einem Wegwerf-Verzeichnis; eine Attrappe wuerde genau die
 * Naht auslassen, um die es geht.
 */

import { afterEach, describe, expect, it } from "vitest";

import { AUSSCHNITT_MAX, lagebildMit, zRuf, type Lagebild } from "../kontrakt/index.js";
import {
  grundlage,
  raeumeAuf,
  werkstattMitEinemPlatz,
  type Platz,
} from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

/** Eine zweite Einheit im selben Abschnitt — fuer Ausschnitt und Sortierung. */
async function zweiteEinheit(a: Platz, id: string, reihenfolge: number): Promise<void> {
  await a.dienst.bediene({
    typ: "EinheitGemeldet",
    nutzlast: {
      einheitId: id,
      abschnittId: "EO",
      bezeichnung: `Fachgruppe ${id}`,
      organisation: "THW",
      ebene: "GRUPPE",
      staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 },
      personalErfassung: "NUR_STAERKE",
      status: "ANMARSCH",
      hierarchie: [],
      reihenfolge,
      istFuehrungDesAbschnitts: false,
    },
  });
}

describe("Der Lagezeiger", () => {
  it("zaehlt jedes gefaltete fachliche Ereignis", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    // Drei Bedienschritte in `grundlage` — und kein Verwaltungsereignis
    // darunter: §2.4 haelt die beiden der Speicherschicht aus der Faltung
    // heraus, und was nicht gefaltet wird, zaehlt hier auch nicht.
    expect(a.dienst.baum({ art: "baumAnfordern", akteId: "akte-1" }).lageZeiger).toBe(3);
  });

  it("steht im geschobenen Lagebild und laeuft ueber den Delta-Weg mit", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const stand = letzterStand(a);
    expect(stand?.lageZeiger).toBe(3);
  });

  /**
   * Der eigentliche Grund, aus dem der Zeiger Ereignisse zaehlt und nicht
   * Aenderungen an der flachen Projektion: Ein Statuswechsel an einer Einheit
   * laesst `einheiten`, `abschnitte` und `gesamtstaerke` unberuehrt — und die
   * Tabelle ist danach trotzdem veraltet.
   */
  it("meldet auch eine Aenderung, die das flache Lagebild nicht sieht", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const vorher = letzterStand(a);
    await a.dienst.bediene({
      typ: "EinheitStammdatenGeaendert",
      nutzlast: { einheitId: "U1", feld: "bemerkung" },
      vorher: null,
      neu: "Ablösung um 20 Uhr",
    });
    const nachher = letzterStand(a);
    expect(nachher?.einheiten).toBe(vorher?.einheiten);
    expect(nachher?.gesamtstaerke).toEqual(vorher?.gesamtstaerke);
    expect(nachher?.lageZeiger).toBe((vorher?.lageZeiger ?? 0) + 1);
  });
});

describe("baumAnfordern", () => {
  it("liefert den Abschnittsbaum mit den Systemabschnitten", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const { baum } = a.dienst.baum({ art: "baumAnfordern", akteId: "akte-1" });
    const ids = baum.map((knoten) => knoten.id);
    expect(ids).toContain("EO");
    expect(ids).toContain("EINGANG");
    expect(ids).toContain("ARCHIV");
    const eo = baum.find((knoten) => knoten.id === "EO");
    expect(eo?.name).toBe("Deich Nord");
    expect(eo?.einheiten).toBe(1);
    expect(eo?.eigeneStaerke).toEqual({ fuehrer: 0, unterfuehrer: 1, mannschaft: 8 });
  });

  it("laesst das Archiv auf Wunsch weg", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const { baum } = a.dienst.baum({ art: "baumAnfordern", akteId: "akte-1", ohneArchiv: true });
    expect(baum.map((knoten) => knoten.id)).not.toContain("ARCHIV");
  });
});

describe("tabelleAnfordern", () => {
  it("schneidet einen Ausschnitt und nennt trotzdem die volle Trefferzahl", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    await zweiteEinheit(a, "U2", 1);
    await zweiteEinheit(a, "U3", 2);

    const ausschnitt = a.dienst.tabelle({
      art: "tabelleAnfordern",
      akteId: "akte-1",
      von: 1,
      anzahl: 1,
    });
    expect(ausschnitt.gesamtzahl).toBe(3);
    expect(ausschnitt.zeilen).toHaveLength(1);
    expect(ausschnitt.zeilen[0]?.einheitId).toBe("U2");
  });

  it("filtert auf den wirksamen Abschnitt und traegt den Zeigerstand mit", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const ausschnitt = a.dienst.tabelle({
      art: "tabelleAnfordern",
      akteId: "akte-1",
      abschnittId: "EO",
    });
    expect(ausschnitt.zeilen.map((zeile) => zeile.einheitId)).toEqual(["U1"]);
    expect(ausschnitt.lageZeiger).toBe(3);
  });
});

describe("tagebuchAnfordern", () => {
  it("zeigt jede fachliche Aenderung, neueste zuerst", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const { zeilen, gesamtzahl } = a.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1" });
    expect(gesamtzahl).toBe(3);
    // §3.5: geordnet nach HLC — die zuletzt geschriebene Zeile steht oben.
    expect(zeilen[0]?.typ).toBe("EinheitGemeldet");
    expect(zeilen[0]?.satz).toContain("Bergungsgruppe Oldenburg");
    expect(zeilen[2]?.typ).toBe("EinsatzAngelegt");
  });

  it("filtert je Einheit", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    await zweiteEinheit(a, "U2", 1);
    const nurU2 = a.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1", einheitId: "U2" });
    expect(nurU2.gesamtzahl).toBe(1);
    expect(nurU2.zeilen[0]?.einheitId).toBe("U2");
  });

  /**
   * §5.9.1: Das Tagebuch wird aus den Ereignissen gerendert, nicht aus dem
   * Zustand — der haelt je Feld nur zwei Beobachtungen. Drei Aenderungen an
   * **einem** Feld muessen deshalb drei Zeilen ergeben, nicht zwei.
   */
  it("zeigt drei Aenderungen an einem Feld als drei Zeilen", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    for (const status of ["ANMARSCH", "EINSATZBEREIT", "IM_EINSATZ"]) {
      await a.dienst.bediene({
        typ: "StatusGesetzt",
        nutzlast: { einheitId: "U1" },
        vorher: null,
        neu: status,
      });
    }
    const nurStatus = a.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1", einheitId: "U1" })
      .zeilen.filter((zeile) => zeile.typ === "StatusGesetzt");
    expect(nurStatus).toHaveLength(3);
  });

  it("zeigt eine Ruecknahme als eigene Zeile mit Bezug auf das Original (§6 U1)", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const gesetzt = await a.dienst.bediene({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U1" },
      vorher: "IM_EINSATZ",
      neu: "RUHE",
    });
    expect(gesetzt.art).toBe("geschrieben");
    const zurueck = await a.dienst.zurueck();
    expect(zurueck.art).toBe("geschrieben");

    const ruecknahmen = a.dienst.tagebuch({
      art: "tagebuchAnfordern",
      akteId: "akte-1",
      nurRuecknahmen: true,
    });
    expect(ruecknahmen.gesamtzahl).toBe(1);
    expect(ruecknahmen.zeilen[0]?.undoOf).toBe(
      gesetzt.art === "geschrieben" ? gesetzt.ereignisId : undefined,
    );
  });
});

describe("Das Schema der Ansichtsrufe", () => {
  /**
   * Die Schranke steht im Schema und nicht in der Ansicht: Der Main prueft
   * jeden Ruf, bevor er den Worker erreicht. Ein Renderer, den ein fremdes
   * Skript erreicht hat, kann so keine Antwort bestellen, die niemand liest.
   */
  it("weist einen Ausschnitt zurueck, der groesser ist als die Schranke", () => {
    const zuGross = zRuf.safeParse({
      art: "tabelleAnfordern",
      akteId: "akte-1",
      anzahl: AUSSCHNITT_MAX + 1,
    });
    expect(zuGross.success).toBe(false);
    const gerade = zRuf.safeParse({ art: "tabelleAnfordern", akteId: "akte-1", anzahl: AUSSCHNITT_MAX });
    expect(gerade.success).toBe(true);
  });

  it("nimmt einen Ansichtsruf ohne Filter an", () => {
    for (const art of ["baumAnfordern", "tabelleAnfordern", "tagebuchAnfordern"]) {
      expect(zRuf.safeParse({ art, akteId: "akte-1" }).success).toBe(true);
    }
  });
});

/**
 * Das zuletzt geschobene Lagebild — voll oder aus Deltas aufgetragen.
 *
 * Genau so tut es der Renderer auch (`laden.ts`): Das erste Bild kommt voll,
 * alles danach als Delta. Ein Test, der nur das letzte `voll` naehme, misse
 * den Delta-Weg an der Stelle, an der er zaehlt.
 */
function letzterStand(platz: Platz): Lagebild | undefined {
  let bild: Lagebild | undefined;
  for (const mitteilung of platz.mitteilungen) {
    if (mitteilung.art !== "stand") continue;
    if (mitteilung.voll !== undefined) bild = mitteilung.voll;
    else if (bild !== undefined) bild = lagebildMit(bild, mitteilung.geaendert ?? {});
  }
  return bild;
}
