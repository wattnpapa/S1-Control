import { describe, expect, it } from "vitest";

import { knotenDateisystem } from "./knotenDateisystem.js";
import { arbeitsplatz } from "./pruefhilfen/aufbau.js";
import { stoerdateisystem, type Stoerung } from "./pruefhilfen/stoerdateisystem.js";
import { KETTE_ANFANG, kettenPruefsumme } from "./pruefsummen.js";
import { LokalerKettenbruch } from "./schreiberStart.js";
import { liesSchreiberzustand } from "./schreiberzustand.js";
import { liesSegment } from "./segmentlese.js";
import { TYP_SEGMENT_ABGESCHLOSSEN, TYP_SEGMENT_ERSETZT } from "./verwaltungsereignisse.js";
import type { Schreibergebnis } from "./schreiber.js";

const kodierer = new TextEncoder();

function alsGeschrieben(ergebnis: Schreibergebnis) {
  if (ergebnis.art !== "geschrieben") {
    throw new Error(`erwartet: geschrieben, war: ${JSON.stringify(ergebnis)}`);
  }
  return ergebnis.zeile;
}

describe("Schreibweg nach §5.2", () => {
  it("schreibt zuerst lokal und macht das Ereignis damit wirklich (§1.3 Nr. 2)", async () => {
    await using platz = await arbeitsplatz();
    const schreiber = await platz.oeffne("9f3c1a20");
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(5);
      alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    const befund = await liesSegment(
      platz.dateisystem,
      platz.ablage.lokalSegment("9f3c1a20", 0),
      0,
      KETTE_ANFANG,
    );
    expect(befund.abschluss).toEqual({ art: "ende" });
    expect(befund.zeilen.map((z) => z.rahmen.id)).toEqual(["9f3c1a20:1", "9f3c1a20:2", "9f3c1a20:3"]);
    expect(befund.endeOffset).toBe(schreiber.lokalerVollstaendigerOffset);
    // Auf dem Share liegt noch nichts — die Spiegelung ist Schritt 5 und darf
    // beliebig lange dauern (§5.2).
    expect(await platz.dateisystem.listeVerzeichnis(platz.ablage.shareEreignisse)).toEqual([]);
  });

  it("führt die Laufnummer streng monoton und schreibt sie vor der Zeile fort (§3.3)", async () => {
    await using platz = await arbeitsplatz();
    const schreiber = await platz.oeffne("9f3c1a20");
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet" }));
    const nachErstem = await liesSchreiberzustand(platz.dateisystem, platz.ablage.schreiberDatei);
    expect(nachErstem?.laufnummer).toBe(1);
    platz.uhr.weiter(1);
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet" }));
    expect(schreiber.zustand.laufnummer).toBe(2);
  });

  it("trägt den gesehenen Vorher-Wert unverändert mit (§2.5, Auflage 6)", async () => {
    await using platz = await arbeitsplatz();
    const schreiber = await platz.oeffne("9f3c1a20");
    const zeile = alsGeschrieben(
      await schreiber.schreibe({ typ: "StaerkeGeaendert", vorher: { f: 0, u: 3, m: 17 }, neu: { f: 1, u: 3, m: 17 } }),
    );
    expect(zeile.rahmen["vorher"]).toEqual({ f: 0, u: 3, m: 17 });
    expect(zeile.rahmen["neu"]).toEqual({ f: 1, u: 3, m: 17 });
  });
});

describe("Segmentwechsel nach Größe (§4.2, §4.3)", () => {
  it("wechselt nur an der Größenschwelle, nie bei einem Programmstart", async () => {
    await using platz = await arbeitsplatz();
    // Sehr kleine Schwelle, damit der Wechsel nach wenigen Zeilen greift.
    let schreiber = await platz.oeffne("9f3c1a20", 400);
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(1);
      alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    expect(schreiber.segment).toBe(0);

    // Ein Neustart beginnt kein neues Segment (§4.2).
    schreiber = await platz.oeffne("9f3c1a20", 400);
    expect(schreiber.segment).toBe(0);

    // Erst die Schwelle tut es.
    while (schreiber.segment === 0) {
      platz.uhr.weiter(1);
      alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { fuellung: "x".repeat(120) } }));
    }
    expect(schreiber.segment).toBe(1);
  });

  it("schließt das alte Segment ab und lässt die Kette durchlaufen (§2.3, §4.3)", async () => {
    await using platz = await arbeitsplatz();
    const schreiber = await platz.oeffne("9f3c1a20", 400);
    while (schreiber.segment === 0) {
      platz.uhr.weiter(1);
      alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { fuellung: "x".repeat(120) } }));
    }
    platz.uhr.weiter(1);
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { erste: true } }));

    const altes = await liesSegment(platz.dateisystem, platz.ablage.lokalSegment("9f3c1a20", 0), 0, KETTE_ANFANG);
    const abschluss = altes.zeilen.at(-1);
    expect(abschluss?.rahmen.typ).toBe(TYP_SEGMENT_ABGESCHLOSSEN);
    expect(abschluss?.rahmen["nutzlast"]).toEqual({ nachfolger: 1 });
    // §4.3: Die Abschlusszeile trägt die Prüfsumme ihres Nachfolgers **nicht** —
    // sie wäre der Hash der eigenen Zeile und damit nicht schreibbar.
    expect(JSON.stringify(abschluss?.rahmen)).not.toContain(kettenPruefsumme(abschluss?.bytes as Uint8Array));

    // Die Kette läuft über den Segmentwechsel hinweg durch.
    const neues = await liesSegment(
      platz.dateisystem,
      platz.ablage.lokalSegment("9f3c1a20", 1),
      0,
      altes.letzteKette,
    );
    expect(neues.abschluss).toEqual({ art: "ende" });
    expect(neues.zeilen[0]?.rahmen["vorgaenger"]).toBe(altes.letzteKette);
  });
});

describe("Neustart mitten im Segment (DoD)", () => {
  it("setzt am richtigen Offset auf und schreibt kettenrichtig weiter", async () => {
    await using platz = await arbeitsplatz();
    const erster = await platz.oeffne("9f3c1a20");
    for (let i = 0; i < 4; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await erster.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    const offsetVorher = erster.lokalerVollstaendigerOffset;

    const zweiter = await platz.oeffne("9f3c1a20");
    expect(zweiter.segment).toBe(0);
    expect(zweiter.lokalerVollstaendigerOffset).toBe(offsetVorher);
    expect(zweiter.zustand.laufnummer).toBe(4);
    platz.uhr.weiter(3);
    alsGeschrieben(await zweiter.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 4 } }));

    const befund = await liesSegment(platz.dateisystem, platz.ablage.lokalSegment("9f3c1a20", 0), 0, KETTE_ANFANG);
    expect(befund.abschluss).toEqual({ art: "ende" });
    expect(befund.zeilen).toHaveLength(5);
    expect(befund.zeilen.at(-1)?.rahmen.id).toBe("9f3c1a20:5");
  });

  it("kürzt eine angefangene Zeile beim Start auf die letzte kettenrichtige (§8.1)", async () => {
    await using platz = await arbeitsplatz();
    const erster = await platz.oeffne("9f3c1a20");
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await erster.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    const gesund = erster.lokalerVollstaendigerOffset;
    // Ein „Kill mitten im Append": ein Bruchstück am Dateiende.
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.lokalSegment("9f3c1a20", 0),
      kodierer.encode("523\t1a2b3c4d\t{\"id\":\"9f3c1a20:3\","),
    );

    const zweiter = await platz.oeffne("9f3c1a20");
    expect(zweiter.startbefund.gekuerztAuf).toBe(gesund);
    expect(zweiter.lokalerVollstaendigerOffset).toBe(gesund);
    platz.uhr.weiter(3);
    alsGeschrieben(await zweiter.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 9 } }));
    const befund = await liesSegment(platz.dateisystem, platz.ablage.lokalSegment("9f3c1a20", 0), 0, KETTE_ANFANG);
    expect(befund.abschluss).toEqual({ art: "ende" });
    expect(befund.zeilen).toHaveLength(3);
  });

  it.each([
    // §4.3 legt vier Schritte verbindlich fest: (1) Abschlusszeile, (2) fsync,
    // (3) schreiber.json auf das neue Segment, (4) erste Zeile des neuen
    // Segments. Ein Absturz zwischen je zwei davon muss beim nächsten Start
    // eindeutig aufgelöst werden — und zwar aus dem Dateibestand.
    ["zwischen Schritt 2 und 3 — schreiber.json nennt noch das alte Segment", 0],
    ["zwischen Schritt 3 und 4 — schreiber.json nennt schon das neue", 1],
  ])("löst einen Absturz beim Segmentwechsel eindeutig auf: %s (§4.3)", async (_name, segmentInDatei) => {
    await using platz = await arbeitsplatz();
    const erster = await platz.oeffne("9f3c1a20", 400);
    while (erster.segment === 0) {
      platz.uhr.weiter(1);
      alsGeschrieben(await erster.schreibe({ typ: "EinheitGemeldet", nutzlast: { fuellung: "x".repeat(120) } }));
    }
    // Der Wechsel hat die erste Zeile des neuen Segments bereits mitgeschrieben;
    // für den Absturzfall wird sie wieder entfernt.
    await platz.dateisystem.loesche(platz.ablage.lokalSegment("9f3c1a20", 1));
    const altes = await liesSegment(platz.dateisystem, platz.ablage.lokalSegment("9f3c1a20", 0), 0, KETTE_ANFANG);
    await platz.wiese.schreibe(
      "rechner-1/einsatz/schreiber.json",
      JSON.stringify({
        ...erster.zustand,
        segment: segmentInDatei,
        lokalerOffset: segmentInDatei === 0 ? altes.endeOffset : 0,
        letzteKette: altes.letzteKette,
      }),
    );

    const zweiter = await platz.oeffne("9f3c1a20", 400);
    expect(zweiter.segment).toBe(1);
    expect(zweiter.lokalerVollstaendigerOffset).toBe(0);
    // Die Kette läuft über den Wechsel hinweg durch (§2.3): Die erste Zeile des
    // neuen Segments schließt an die Abschlusszeile an.
    platz.uhr.weiter(1);
    const zeile = alsGeschrieben(await zweiter.schreibe({ typ: "EinheitGemeldet" }));
    expect(zeile.rahmen["vorgaenger"]).toBe(altes.letzteKette);
  });

  it("kommt ohne schreiber.json aus — gelöscht, geleert, verstümmelt (§4.4)", async () => {
    for (const inhalt of [undefined, "", '{"clientId":"9f3c']) {
      await using platz = await arbeitsplatz();
      const erster = await platz.oeffne("9f3c1a20");
      for (let i = 0; i < 3; i += 1) {
        platz.uhr.weiter(3);
        alsGeschrieben(await erster.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
      }
      const offset = erster.lokalerVollstaendigerOffset;

      if (inhalt === undefined) {
        await platz.dateisystem.loesche(platz.ablage.schreiberDatei);
      } else {
        await platz.wiese.schreibe("rechner-1/einsatz/schreiber.json", inhalt);
      }

      const zweiter = await platz.oeffne("9f3c1a20");
      expect(zweiter.startbefund.rekonstruiert).toBe(true);
      expect(zweiter.segment).toBe(0);
      expect(zweiter.lokalerVollstaendigerOffset).toBe(offset);
      // §4.4: „Sie kann eine Lücke erzeugen, die §3.3 ausdrücklich erlaubt,
      // aber niemals einen Rückschritt."
      expect(zweiter.zustand.laufnummer).toBeGreaterThanOrEqual(3);
      platz.uhr.weiter(3);
      const zeile = alsGeschrieben(await zweiter.schreibe({ typ: "EinheitGemeldet" }));
      expect(zeile.rahmen["vorgaenger"]).not.toBe(KETTE_ANFANG);
      const befund = await liesSegment(platz.dateisystem, platz.ablage.lokalSegment("9f3c1a20", 0), 0, KETTE_ANFANG);
      expect(befund.abschluss).toEqual({ art: "ende" });
    }
  });

  it("weist eine zurückgesetzte Laufnummer in schreiber.json ab, statt sie doppelt zu vergeben (§3.3)", async () => {
    await using platz = await arbeitsplatz();
    const erster = await platz.oeffne("9f3c1a20");
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await erster.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await platz.wiese.schreibe(
      "rechner-1/einsatz/schreiber.json",
      JSON.stringify({ ...erster.zustand, laufnummer: 1 }),
    );
    const zweiter = await platz.oeffne("9f3c1a20");
    expect(zweiter.zustand.laufnummer).toBeGreaterThanOrEqual(3);
  });

  it("bricht laut ab, wenn ein nicht-letztes eigenes Segment lokal kettenfalsch ist", async () => {
    await using platz = await arbeitsplatz();
    const erster = await platz.oeffne("9f3c1a20", 400);
    while (erster.segment === 0) {
      platz.uhr.weiter(1);
      alsGeschrieben(await erster.schreibe({ typ: "EinheitGemeldet", nutzlast: { fuellung: "x".repeat(120) } }));
    }
    platz.uhr.weiter(1);
    alsGeschrieben(await erster.schreibe({ typ: "EinheitGemeldet" }));

    const roh = await platz.wiese.lies("rechner-1/einsatz/ereignisse/9f3c1a20.0000.jsonl");
    roh[roh.length - 6] = (roh[roh.length - 6] as number) ^ 0x01;
    await platz.wiese.schreibe("rechner-1/einsatz/ereignisse/9f3c1a20.0000.jsonl", roh);

    await expect(platz.oeffne("9f3c1a20", 400)).rejects.toBeInstanceOf(LokalerKettenbruch);
  });
});

describe("Lokale Schreibstörung nach §8.8", () => {
  it("weist den Bedienschritt sichtbar ab und übernimmt ihn nicht", async () => {
    const stoerungen: Stoerung[] = [
      { aufruf: "haengeAnUndSynchronisiere", code: "ENOSPC", malen: Infinity, pfadEnthaelt: "ereignisse" },
    ];
    await using platz = await arbeitsplatz(stoerdateisystem(knotenDateisystem(), stoerungen));
    const schreiber = await platz.oeffne("9f3c1a20");
    const ergebnis = await schreiber.schreibe({ typ: "EinheitGemeldet" });
    expect(ergebnis.art).toBe("abgewiesen");
    if (ergebnis.art !== "abgewiesen") throw new Error("unerreichbar");
    expect(ergebnis.meldung).toContain("kein Speicherplatz mehr frei");
    expect(ergebnis.dauerhafterHinweis).toBe(true);
    // §8.8 Punkt 2: Die bereits erhöhte Laufnummer bleibt vergeben.
    expect(schreiber.zustand.laufnummer).toBe(1);
    expect(schreiber.lokalerVollstaendigerOffset).toBe(0);
  });

  it("wiederholt EBUSY genau einmal und schreibt dann durch", async () => {
    const stoerungen: Stoerung[] = [
      { aufruf: "haengeAnUndSynchronisiere", code: "EBUSY", malen: 1, pfadEnthaelt: "ereignisse" },
    ];
    await using platz = await arbeitsplatz(stoerdateisystem(knotenDateisystem(), stoerungen));
    const schreiber = await platz.oeffne("9f3c1a20");
    const zeile = alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet" }));
    expect(zeile.rahmen.id).toBe("9f3c1a20:1");
  });

  it("gibt nach dem einen Wiederholversuch auf", async () => {
    const stoerungen: Stoerung[] = [
      { aufruf: "haengeAnUndSynchronisiere", code: "EBUSY", malen: 2, pfadEnthaelt: "ereignisse" },
    ];
    await using platz = await arbeitsplatz(stoerdateisystem(knotenDateisystem(), stoerungen));
    const schreiber = await platz.oeffne("9f3c1a20");
    expect((await schreiber.schreibe({ typ: "EinheitGemeldet" })).art).toBe("abgewiesen");
  });
});

describe("Ersatzsegment nach §4.6", () => {
  it("schließt die Kette an der letzten unbeschädigten Zeile an und wiederholt ab dort", async () => {
    await using platz = await arbeitsplatz();
    const schreiber = await platz.oeffne("9f3c1a20");
    const zeilen = [];
    for (let i = 0; i < 4; i += 1) {
      platz.uhr.weiter(3);
      zeilen.push(alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } })));
    }
    const abOffset = (zeilen[2] as { offset: number }).offset;

    alsGeschrieben(await schreiber.schreibeErsatzsegment(0, abOffset));
    expect(schreiber.segment).toBe(1);

    const ersatz = await liesSegment(
      platz.dateisystem,
      platz.ablage.lokalSegment("9f3c1a20", 1),
      0,
      (zeilen[1] as { kette: string }).kette,
    );
    expect(ersatz.abschluss).toEqual({ art: "ende" });
    expect(ersatz.zeilen[0]?.rahmen.typ).toBe(TYP_SEGMENT_ERSETZT);
    expect(ersatz.zeilen[0]?.rahmen["nutzlast"]).toEqual({ ersetztesSegment: 0, abOffset });
    // §4.6 Schritt 4: dieselben Ereignisse, unveränderte Identitäten und HLC.
    expect(ersatz.zeilen.slice(1).map((z) => z.rahmen.id)).toEqual(["9f3c1a20:3", "9f3c1a20:4"]);
    expect(ersatz.zeilen[1]?.rahmen["hlc"]).toEqual(zeilen[2]?.rahmen["hlc"]);
    // Byteweise verschieden, inhaltlich gleich — genau der Fall aus §4.6.
    expect(ersatz.zeilen[1]?.bytes).not.toEqual(zeilen[2]?.bytes);

    // §4.6, „Die lokale Seite" Schritt 4: Das alte lokale Segment bleibt
    // unverändert liegen und ist damit länger als seine Share-Entsprechung.
    const altes = await liesSegment(platz.dateisystem, platz.ablage.lokalSegment("9f3c1a20", 0), 0, KETTE_ANFANG);
    expect(altes.zeilen).toHaveLength(4);
  });
});
