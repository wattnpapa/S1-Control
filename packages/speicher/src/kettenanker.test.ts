import { describe, expect, it } from "vitest";

import { grenzeUndKette, ketteAmEnde, ketteAnStelle, kettenanker } from "./kettenanker.js";
import { KETTE_ANFANG, kettenPruefsumme } from "./pruefsummen.js";
import { TYP_SEGMENT_ERSETZT } from "./verwaltungsereignisse.js";
import { baueZeile, leseZeilengrenzen, type Rahmenblick } from "./zeile.js";

function zeile(id: string, vorgaenger: string, zusatz: Record<string, unknown> = {}): Uint8Array {
  return baueZeile({ id, vorgaenger, typ: "EinheitGemeldet", schemaVersion: 1, ...zusatz } as Rahmenblick);
}

function verkette(...teile: readonly Uint8Array[]): Uint8Array {
  const gesamt = teile.reduce((s, t) => s + t.byteLength, 0);
  const bytes = new Uint8Array(gesamt);
  let ziel = 0;
  for (const t of teile) {
    bytes.set(t, ziel);
    ziel += t.byteLength;
  }
  return bytes;
}

/** Zwei Segmente, deren Kette über die Grenze hinweg durchläuft (§2.3, §4.3). */
function zweiSegmente() {
  const a1 = zeile("c1:1", KETTE_ANFANG);
  const a2 = zeile("c1:2", kettenPruefsumme(a1));
  const segment0 = verkette(a1, a2);
  const b1 = zeile("c1:3", kettenPruefsumme(a2));
  const segment1 = verkette(b1);
  return { segment0, segment1, endeVon0: kettenPruefsumme(a2), zeilenVon0: [a1, a2] as const };
}

describe("Kettenanker nach §2.3", () => {
  it("Segment 0000 beginnt bei 32 Nullen", async () => {
    const { segment0 } = zweiSegmente();
    expect(await kettenanker(0, segment0, async () => segment0)).toBe(KETTE_ANFANG);
  });

  it("ein Folgesegment erbt die Kette des Vorgängerendes — nicht 32 Nullen", async () => {
    // Das ist der Fall, an dem eine Annahme „jede Kette beginnt bei 32 Nullen"
    // still zerbricht: Die Prüfung bräche an Byte 0 ab, und die Datei sähe
    // leer aus.
    const { segment0, segment1, endeVon0 } = zweiSegmente();
    const quelle = async (s: number) => (s === 0 ? segment0 : s === 1 ? segment1 : undefined);
    const anker = await kettenanker(1, segment1, quelle);
    expect(anker).toBe(endeVon0);
    expect(anker).not.toBe(KETTE_ANFANG);
  });

  it("ein Ersatzsegment erbt die Kette der letzten **unbeschädigten** Zeile, nicht des Segmentendes (§4.6 Schritt 3)", async () => {
    const { segment0, zeilenVon0 } = zweiSegmente();
    const ersteZeile = zeilenVon0[0] as Uint8Array;
    const abOffset = ersteZeile.byteLength; // Ersatz gilt ab der zweiten Zeile.
    const kopf = baueZeile({
      id: "c1:9",
      vorgaenger: kettenPruefsumme(ersteZeile),
      typ: TYP_SEGMENT_ERSETZT,
      schemaVersion: 1,
      nutzlast: { ersetztesSegment: 0, abOffset },
    } as Rahmenblick);
    const quelle = async (s: number) => (s === 0 ? segment0 : undefined);

    const anker = await kettenanker(1, kopf, quelle);
    expect(anker).toBe(kettenPruefsumme(ersteZeile));
    // Ausdrücklich **nicht** das Ende des ersetzten Segments.
    expect(anker).not.toBe(await ketteAmEnde(0, quelle));
  });

  it("ein Ersatzsegment ab Offset 0 erbt die Kette vor dem ersetzten Segment", async () => {
    const { segment0, segment1, endeVon0 } = zweiSegmente();
    const quelle = async (s: number) => (s === 0 ? segment0 : s === 1 ? segment1 : undefined);
    expect(await ketteAnStelle(0, 0, quelle)).toBe(KETTE_ANFANG);
    expect(await ketteAnStelle(1, 0, quelle)).toBe(endeVon0);
  });

  it("liefert `undefined`, wenn der Vorgänger fehlt — kein Urteil ohne Grundlage", async () => {
    const { segment1 } = zweiSegmente();
    expect(await kettenanker(1, segment1, async () => undefined)).toBeUndefined();
  });

  it("überspringt ein leeres Zwischensegment, statt die Kette abreißen zu lassen", async () => {
    const { segment0, endeVon0 } = zweiSegmente();
    const quelle = async (s: number) =>
      s === 0 ? segment0 : s === 1 ? new Uint8Array(0) : undefined;
    expect(await ketteAmEnde(1, quelle)).toBe(endeVon0);
  });
});

describe("grenzeUndKette — Zeilengrenze ohne Kettenurteil", () => {
  it("liefert Ende und Kettenwert eines Segments, dessen Anker nicht 32 Nullen ist", () => {
    const { segment1 } = zweiSegmente();
    const { endeOffset, letzteKette } = grenzeUndKette(segment1);
    expect(endeOffset).toBe(segment1.byteLength);
    expect(letzteKette).toBe(kettenPruefsumme(leseZeilengrenzen(segment1).zeilen[0]?.bytes as Uint8Array));
  });

  it("hält vor einer unvollständigen Zeile an", () => {
    const { segment1 } = zweiSegmente();
    const gekuerzt = segment1.subarray(0, segment1.byteLength - 3);
    expect(grenzeUndKette(gekuerzt).endeOffset).toBe(0);
  });

  it("gibt bei leerem Abschnitt die mitgegebene Kette unverändert zurück", () => {
    expect(grenzeUndKette(new Uint8Array(0), 17, "a".repeat(32))).toEqual({
      endeOffset: 17,
      letzteKette: "a".repeat(32),
    });
  });
});
