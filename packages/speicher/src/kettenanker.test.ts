import { describe, expect, it } from "vitest";

import { grenzeUndKette, ketteAmEnde, ketteAnStelle, kettenanker } from "./kettenanker.js";
import { KETTE_ANFANG, kettenPruefsumme } from "./pruefsummen.js";
import { TYP_SEGMENT_ABGESCHLOSSEN, TYP_SEGMENT_ERSETZT } from "./verwaltungsereignisse.js";
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

/**
 * Zwei Segmente, deren Kette über die Grenze hinweg durchläuft (§2.3, §4.3).
 *
 * Segment 0 endet mit seiner **Abschlusszeile**. Das ist keine Ausschmückung:
 * §2.3 nennt als Anker „die Kettenprüfsumme der letzten Zeile des
 * Vorgängersegments", und §4.3 legt fest, woran man die letzte Zeile erkennt.
 * Ein Segment ohne Abschlusszeile hat keine letzte Zeile, sondern nur eine
 * bisher letzte.
 */
function zweiSegmente() {
  const a1 = zeile("c1:1", KETTE_ANFANG);
  const a2 = zeile("c1:2", kettenPruefsumme(a1));
  const schluss = zeile("c1:s", kettenPruefsumme(a2), {
    typ: TYP_SEGMENT_ABGESCHLOSSEN,
    nutzlast: { nachfolger: 1 },
  });
  const segment0 = verkette(a1, a2, schluss);
  const b1 = zeile("c1:3", kettenPruefsumme(schluss));
  const segment1 = verkette(b1);
  return {
    segment0,
    segment1,
    endeVon0: kettenPruefsumme(schluss),
    zeilenVon0: [a1, a2, schluss] as const,
  };
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

  it("urteilt nicht über ein Segment ohne Abschlusszeile (§4.3)", async () => {
    // Der Anker eines Folgesegments ist die Kette der **letzten** Zeile seines
    // Vorgängers, und die steht erst mit der Abschlusszeile fest (§2.3, §4.3).
    // Ein Leser, der den Vorgänger erst zur Hälfte gespiegelt hat, nähme sonst
    // seine bisher letzte Zeile, fände die erste Zeile des Nachfolgers
    // kettenfalsch und setzte eine **gesunde** Datei nach §8.2 dauerhaft in
    // Quarantäne. Befund aus der Simulation M0.4.
    const { segment0, segment1, endeVon0 } = zweiSegmente();
    const halb = segment0.subarray(0, (leseZeilengrenzen(segment0).zeilen[0] as { laenge: number }).laenge);
    const quelle = async (s: number) => (s === 0 ? halb : s === 1 ? segment1 : undefined);
    expect(await kettenanker(1, segment1, quelle)).toBeUndefined();

    // Sobald der Vorgänger vollständig gespiegelt ist, steht der Anker.
    const vollstaendig = async (s: number) =>
      s === 0 ? segment0 : s === 1 ? segment1 : undefined;
    expect(await kettenanker(1, segment1, vollstaendig)).toBe(endeVon0);
  });

  it("urteilt nicht über ein leeres Zwischensegment", async () => {
    // Ein leeres Segment ist nicht abgeschlossen; es „überspringen" hieße, den
    // Anker aus einem Segment zu holen, das gar nicht der Vorgänger ist.
    const { segment0 } = zweiSegmente();
    const quelle = async (s: number) =>
      s === 0 ? segment0 : s === 1 ? new Uint8Array(0) : undefined;
    expect(await ketteAmEnde(1, quelle)).toBeUndefined();
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

describe("§4.6 Schritt 3 — der Ersatz eines Ersatzsegments", () => {
  it("erbt ab Offset 0 den Anker des ersetzten Segments, nicht den seines Vorgängers", () => {
    // Ein Ersatzsegment setzt mitten im ersetzten Segment auf. Wird es selbst
    // gleich an seiner ersten Zeile beschädigt, ersetzt der Ersatz des Ersatzes
    // es ab Offset 0 — und die Frage lautet, worauf **es** aufsetzte. Wer
    // stattdessen das Ende seines Vorgängers nimmt, erzeugt einen Anker, den
    // `bereiteSchreiberVor` nicht nachvollziehen kann: Der Client kommt an
    // seine eigene Akte nie wieder heran. Befund aus der Simulation M0.4.
    return (async () => {
      const { segment0, zeilenVon0 } = zweiSegmente();
      const ersteZeile = zeilenVon0[0] as Uint8Array;
      const abOffset = ersteZeile.byteLength;
      const ankerVonEins = kettenPruefsumme(ersteZeile);
      // Segment 1 ist ein Ersatzsegment für Segment 0 ab der zweiten Zeile.
      const kopf = baueZeile({
        id: "c1:9",
        vorgaenger: ankerVonEins,
        typ: TYP_SEGMENT_ERSETZT,
        schemaVersion: 1,
        nutzlast: { ersetztesSegment: 0, abOffset },
      } as Rahmenblick);
      const segment1 = kopf;
      const quelle = async (s: number) =>
        s === 0 ? segment0 : s === 1 ? segment1 : undefined;

      // Segment 2 ersetzt Segment 1 ab Offset 0.
      expect(await ketteAnStelle(1, 0, quelle)).toBe(ankerVonEins);
      // Ausdrücklich **nicht** das Ende von Segment 0.
      expect(await ketteAnStelle(1, 0, quelle)).not.toBe(await ketteAmEnde(0, quelle));
    })();
  });
});
