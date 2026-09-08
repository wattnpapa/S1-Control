import { describe, expect, it } from "vitest";

import { kanonischeSerialisierung, zustandsHash } from "./kanonisch.js";

describe("Kanonische Serialisierung (§7.6)", () => {
  it("sortiert Objektschluessel aufsteigend nach Codepoint", () => {
    expect(kanonischeSerialisierung({ b: 1, a: 2, A: 3, "ä": 4 })).toBe(
      '{"A":3,"a":2,"b":1,"ä":4}',
    );
  });

  it("sortiert auch ausserhalb der BMP nach Codepoint, nicht nach UTF-16-Codeunit", () => {
    // U+1F600 (Codepoint 128512) liegt ueber U+FFFD (65533), als UTF-16-Paar
    // beginnt es aber mit D83D — `<` allein ordnete hier falsch herum.
    const bmpEnde = "\uFFFD";
    const ausserhalb = "\u{1F600}";
    const text = kanonischeSerialisierung({ [ausserhalb]: 1, [bmpEnde]: 2 });
    expect(text.indexOf(bmpEnde)).toBeGreaterThan(-1);
    expect(text.indexOf(bmpEnde)).toBeLessThan(text.indexOf(ausserhalb));
  });

  it("schreibt keine Leerzeichen und keine Zeilenumbrueche", () => {
    expect(kanonischeSerialisierung({ a: [1, 2], b: { c: true } })).toBe('{"a":[1,2],"b":{"c":true}}');
  });

  it("laesst Felder ohne Wert weg und behaelt null", () => {
    // §7.6: „Ein Feld, das nie gesetzt wurde, und ein Feld, das auf einen
    // leeren Wert gesetzt wurde, sind damit unterscheidbar."
    expect(kanonischeSerialisierung({ a: undefined, b: null, c: "" })).toBe('{"b":null,"c":""}');
  });

  it("behaelt leere Objekte und leere Listen", () => {
    expect(kanonischeSerialisierung({ a: {}, b: [] })).toBe('{"a":{},"b":[]}');
  });

  it("schreibt Zahlen kuerzest und kennt kein minus null", () => {
    expect(kanonischeSerialisierung({ a: -0, b: 1.5, c: 1e21, d: 0 })).toBe(
      '{"a":0,"b":1.5,"c":1e+21,"d":0}',
    );
  });

  it("weist NaN und Unendlich zurueck", () => {
    expect(() => kanonischeSerialisierung({ a: Number.NaN })).toThrow(RangeError);
    expect(() => kanonischeSerialisierung({ a: Number.POSITIVE_INFINITY })).toThrow(RangeError);
  });

  it("maskiert Zeichenketten wie JSON.stringify", () => {
    expect(kanonischeSerialisierung('a"b\n')).toBe(JSON.stringify('a"b\n'));
  });

  it("weist undefined in Listen zurueck, weil die Position dort traegt", () => {
    expect(() => kanonischeSerialisierung([1, undefined, 2])).toThrow(TypeError);
  });

  it("unterscheidet Zustaende, die sich nur in der Feld-HLC unterscheiden", () => {
    // Der Kern von §7.6: gleiche Werte, verschiedene Gewinner-HLC sind nicht
    // konvergent — der naechste Rebase entschiede unterschiedlich.
    const links = { s: { wert: "x", hlc: { millisekunden: 5, zaehler: 0, clientId: "a" } } };
    const rechts = { s: { wert: "x", hlc: { millisekunden: 5, zaehler: 1, clientId: "a" } } };
    expect(kanonischeSerialisierung(links)).not.toBe(kanonischeSerialisierung(rechts));
  });
});

describe("zustandsHash (§7.6)", () => {
  const sha = (text: string): string => text.length.toString(16).padStart(64, "0");

  it("hasht die kanonische Serialisierung und verlangt 64 Hexzeichen", () => {
    expect(zustandsHash({ b: 1, a: 2 }, sha)).toBe(sha('{"a":2,"b":1}'));
    expect(() => zustandsHash({}, () => "kurz")).toThrow(RangeError);
  });
});
