import { describe, expect, it } from "vitest";

import { Identitaetenbuch } from "./identitaeten.js";
import { pruefeBeimOeffnen } from "./oeffnungspruefung.js";
import { arbeitsplatz, legeEinsatzAn, spiegelungFuer } from "./pruefhilfen/aufbau.js";
import { KETTE_ANFANG } from "./pruefsummen.js";
import { baueZeile, leseAbschnitt } from "./zeile.js";
import type { Arbeitsplatz } from "./pruefhilfen/aufbau.js";
import type { Schreiber, Schreibergebnis } from "./schreiber.js";

const EINSATZ = "2026-09-08_hochwasser-sued_ab12cd";
const ICH = "9f3c1a20";

function alsGeschrieben(ergebnis: Schreibergebnis) {
  if (ergebnis.art !== "geschrieben") throw new Error(JSON.stringify(ergebnis));
  return ergebnis.zeile;
}

async function eigenerStand(platz: Arbeitsplatz, anzahl: number, segmentgroesse?: number) {
  const schreiber = await platz.oeffne(ICH, segmentgroesse);
  for (let i = 0; i < anzahl; i += 1) {
    platz.uhr.weiter(3);
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
  }
  const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
  await spiegelung.lauf();
  return { schreiber, spiegelung };
}

function pruefe(platz: Arbeitsplatz, schreiber: Schreiber) {
  return pruefeBeimOeffnen({
    dateisystem: platz.dateisystem,
    ablage: platz.ablage,
    clientId: schreiber.clientId,
    identitaeten: schreiber.identitaeten,
  });
}

describe("Prüfung beim Öffnen (§4.5 Fall 2, §4.6.1 Auslöser 1)", () => {
  it("meldet nichts, wenn die Share-Dateien ein Präfix der lokalen sind", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber } = await eigenerStand(platz, 4);
    const befund = await pruefe(platz, schreiber);
    expect(befund).toEqual({ art: "inOrdnung" });
  });

  it("findet eine Beschädigung in der **Mitte** der Datei, die §5.4.3 nie sähe (§4.6.1)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber } = await eigenerStand(platz, 5);

    // Die Beschädigung liegt weit vor `shareOffset` — der Vergleich aus §5.4.3
    // setzt dort an und fände sie nie.
    const roh = await platz.wiese.lies(`share/einsatz/ereignisse/${ICH}.0000.jsonl`);
    roh[40] = (roh[40] as number) ^ 0x01;
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${ICH}.0000.jsonl`, roh);

    const befund = await pruefe(platz, schreiber);
    expect(befund.art).toBe("beschaedigt");
    expect(befund.art === "beschaedigt" && befund.segment).toBe(0);
  });

  it("erkennt ein Segment, das nur der Klon begonnen hat (§4.5 Schritt 1)", async () => {
    // „Ein Klon, der zwischenzeitlich ein Segment mit höherer Nummer begonnen
    // hat, wäre sonst unsichtbar, weil dieses Segment aus Sicht der
    // Originalkopie gar nicht das eigene letzte ist."
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber } = await eigenerStand(platz, 3);

    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 7),
      baueZeile({
        id: `${ICH}:50`,
        vorgaenger: KETTE_ANFANG,
        typ: "EinheitGemeldet",
        schemaVersion: 1,
        nutzlast: { vomKlon: true },
      }),
    );

    const befund = await pruefe(platz, schreiber);
    expect(befund.art).toBe("fremdschreiber");
    expect(befund.art === "fremdschreiber" && befund.segment).toBe(7);
    expect(befund.art === "fremdschreiber" && befund.grund).toBe("identitaetUnbekannt");
  });

  it("erkennt die symmetrische Klon-Lage: dieselbe Laufnummer, anderer Inhalt (§4.5 Schritt 4)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber } = await eigenerStand(platz, 2);

    // Der Klon überschreibt die Datei mit einer eigenen zweiten Zeile: gleiche
    // Laufnummer, anderes Ereignis. Ein reiner Zahlenvergleich sähe hier
    // nichts — die höchste Nummer ist unverändert 2.
    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    const erste = leseAbschnitt(lokal, 0, KETTE_ANFANG).zeilen[0] as {
      bytes: Uint8Array;
      kette: string;
    };
    const klon = baueZeile({
      id: `${ICH}:2`,
      vorgaenger: erste.kette,
      typ: "EinheitGemeldet",
      schemaVersion: 1,
      nutzlast: { n: 999 },
    });
    const neu = new Uint8Array(erste.bytes.byteLength + klon.byteLength);
    neu.set(erste.bytes, 0);
    neu.set(klon, erste.bytes.byteLength);
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${ICH}.0000.jsonl`, neu);

    const befund = await pruefe(platz, schreiber);
    expect(befund.art).toBe("fremdschreiber");
    expect(befund.art === "fremdschreiber" && befund.grund).toBe("inhaltAbweichend");
    expect(befund.art === "fremdschreiber" && befund.id).toBe(`${ICH}:2`);
  });

  it("meldet eine unlesbare Zeile als Beschädigung, nicht als Klon (§5.4.3)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber } = await eigenerStand(platz, 3);
    const roh = await platz.wiese.lies(`share/einsatz/ereignisse/${ICH}.0000.jsonl`);
    roh[0] = 0x39; // Längenfeld verfälscht
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${ICH}.0000.jsonl`, roh);
    expect((await pruefe(platz, schreiber)).art).toBe("beschaedigt");
  });
});

describe("Kennungswechsel nach §4.5, Reaktion", () => {
  it("behält die Identitäten der ungespiegelten Ereignisse und lässt die Laufnummer fortlaufen", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber, spiegelung } = await eigenerStand(platz, 2);
    const shareOffset = (spiegelung.zustand.eigen[`${ICH}.0000`] as { shareOffset: number }).shareOffset;

    platz.uhr.weiter(3);
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 2 } }));

    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    const ungespiegelt = leseAbschnitt(lokal, 0, KETTE_ANFANG).zeilen.filter(
      (z) => z.offset >= shareOffset,
    );
    expect(ungespiegelt).toHaveLength(1);

    await schreiber.kennungswechsel("aabbccdd", ungespiegelt);
    expect(schreiber.clientId).toBe("aabbccdd");
    expect(schreiber.zustand.frühereClientIds).toEqual([ICH]);
    expect(schreiber.segment).toBe(0);

    // §4.5 Schritt 3: Die mitgenommene Zeile behält `<alteClientId>:<laufnummer>`.
    const neu = await platz.dateisystem.liesAb(platz.ablage.lokalSegment("aabbccdd", 0), 0);
    const mitgenommen = leseAbschnitt(neu, 0, KETTE_ANFANG);
    expect(mitgenommen.abschluss).toEqual({ art: "ende" });
    expect(mitgenommen.zeilen[0]?.rahmen.id).toBe(`${ICH}:3`);

    // §4.5 Schritt 4: Die Laufnummer läuft fort, sie beginnt nicht bei 1.
    platz.uhr.weiter(3);
    const naechste = alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet" }));
    expect(naechste.rahmen.id).toBe("aabbccdd:4");

    // §4.5 Schritt 5 und 6: Die alte lokale Datei bleibt unverändert liegen.
    const alt = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    expect(alt).toEqual(lokal);
  });

  it("liest die Dateien der aufgegebenen Kennung danach als fremde (§4.5 Schritt 6)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber } = await eigenerStand(platz, 2);
    await schreiber.kennungswechsel("aabbccdd", []);

    const { Leser } = await import("./leser.js");
    const leser = new Leser(
      {
        dateisystem: platz.dateisystem,
        zeit: platz.uhr.lies,
        ablage: platz.ablage,
        clientId: "aabbccdd",
        identitaeten: new Identitaetenbuch(),
      },
      { eigen: {}, fremd: {} },
    );
    await leser.gleicheMitSpiegelAb();
    expect(leser.zustand.fremd[`${ICH}.0000`]).toBeDefined();
  });
});
