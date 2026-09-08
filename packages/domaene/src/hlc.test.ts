import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  HlcUhr,
  UHR_SCHWELLE_MS,
  ZAEHLER_MAX,
  groessereHlc,
  hlcAlsText,
  hlcAusText,
  vergleicheHlc,
  type Hlc,
} from "./hlc.js";

const hlc = (millisekunden: number, zaehler: number, clientId: string): Hlc => ({
  millisekunden,
  zaehler,
  clientId,
});

/** Eine steuerbare Wanduhr — §8: keine Komponente ruft eine Uhr unmittelbar auf. */
function pruefuhr(start: number) {
  let jetzt = start;
  return {
    lesen: () => jetzt,
    stelle: (wert: number) => {
      jetzt = wert;
    },
    weiter: (ms: number) => {
      jetzt += ms;
    },
  };
}

describe("HLC-Vergleich als Struktur (§3.2, Auflage 5)", () => {
  it("ordnet nach Millisekunden, dann Zaehler, dann clientId", () => {
    expect(vergleicheHlc(hlc(5, 9, "b"), hlc(6, 0, "a"))).toBeLessThan(0);
    expect(vergleicheHlc(hlc(5, 9, "b"), hlc(5, 10, "a"))).toBeLessThan(0);
    expect(vergleicheHlc(hlc(5, 9, "b"), hlc(5, 9, "a"))).toBeGreaterThan(0);
    expect(vergleicheHlc(hlc(5, 9, "a"), hlc(5, 9, "a"))).toBe(0);
  });

  it("vergleicht nicht als Zeichenkette — der Fehler, den Auflage 5 verbietet", () => {
    // Als Zeichenkette waere "9" > "10". Als Struktur ist 9 < 10.
    expect(vergleicheHlc(hlc(9, 0, "a"), hlc(10, 0, "a"))).toBeLessThan(0);
    expect(String(9) > String(10)).toBe(true);
  });

  it("groessereHlc liefert das Maximum und ist kommutativ", () => {
    const a = hlc(7, 3, "a");
    const b = hlc(7, 3, "b");
    expect(groessereHlc(a, b)).toBe(b);
    expect(groessereHlc(b, a)).toBe(b);
  });
});

/** Beliebige, aber darstellbare HLC (§3.2). */
const hlcArb: fc.Arbitrary<Hlc> = fc.record({
  millisekunden: fc.integer({ min: 0, max: 4_000_000_000_000 }),
  zaehler: fc.integer({ min: 0, max: ZAEHLER_MAX }),
  clientId: fc.stringMatching(/^[0-9a-f]{4,8}$/),
});

describe("Textform mit fester Stellenzahl (§3.2)", () => {
  it("ist eindeutig umkehrbar", () => {
    fc.assert(
      fc.property(hlcArb, (a) => {
        expect(hlcAusText(hlcAlsText(a))).toEqual(a);
      }),
    );
  });

  it("ordnet lexikografisch genauso wie die Struktur — Grundlage von §7.2", () => {
    fc.assert(
      fc.property(hlcArb, hlcArb, (a, b) => {
        const strukturell = Math.sign(vergleicheHlc(a, b));
        const textA = hlcAlsText(a);
        const textB = hlcAlsText(b);
        const lexikografisch = textA === textB ? 0 : textA < textB ? -1 : 1;
        expect(lexikografisch).toBe(strukturell);
      }),
    );
  });

  it("weist Werte ausserhalb der Stellenzahl und mehrdeutige clientIds zurueck", () => {
    expect(() => hlcAlsText(hlc(1, ZAEHLER_MAX + 1, "a"))).toThrow(RangeError);
    expect(() => hlcAlsText(hlc(-1, 0, "a"))).toThrow(RangeError);
    expect(() => hlcAlsText(hlc(1, 0, "mit-strich"))).toThrow(RangeError);
    expect(() => hlcAusText("1-2-a")).toThrow(SyntaxError);
  });
});

describe("Fortschreibung beim Erzeugen (§3.2)", () => {
  it("uebernimmt eine vorgelaufene Wanduhr und setzt den Zaehler zurueck", () => {
    const uhr = pruefuhr(1000);
    const hlcUhr = new HlcUhr({ clientId: "aa", wanduhr: uhr.lesen });

    expect(hlcUhr.erzeugen()).toEqual({ art: "erzeugt", hlc: hlc(1000, 0, "aa") });
    expect(hlcUhr.erzeugen()).toEqual({ art: "erzeugt", hlc: hlc(1000, 1, "aa") });
    uhr.weiter(5);
    expect(hlcUhr.erzeugen()).toEqual({ art: "erzeugt", hlc: hlc(1005, 0, "aa") });
  });

  it("laesst die HLC nicht rueckwaerts laufen, wenn die eigene Uhr zurueckspringt", () => {
    const uhr = pruefuhr(1_000_000);
    const hlcUhr = new HlcUhr({ clientId: "aa", wanduhr: uhr.lesen });
    hlcUhr.erzeugen();

    uhr.stelle(500_000); // Zeitabgleich, Sommerzeit, verstellte Uhr
    const zweite = hlcUhr.erzeugen();

    expect(zweite.art).toBe("erzeugt");
    expect(hlcUhr.stand.millisekunden).toBe(1_000_000);
    expect(hlcUhr.stand.zaehler).toBe(1);
    // Rueckstand ueber der Schwelle wird zusaetzlich als Uhrfehler gemeldet (§8.5).
    expect(zweite.art === "erzeugt" && zweite.meldung).toEqual({
      art: "eigeneUhrZurueck",
      rueckstandMs: 500_000,
    });
  });

  it("meldet keinen Uhrfehler bei einem Rueckstand unterhalb der Schwelle", () => {
    const uhr = pruefuhr(1_000_000);
    const hlcUhr = new HlcUhr({ clientId: "aa", wanduhr: uhr.lesen });
    hlcUhr.erzeugen();
    uhr.stelle(1_000_000 - UHR_SCHWELLE_MS);

    const zweite = hlcUhr.erzeugen();
    expect(zweite).toEqual({ art: "erzeugt", hlc: hlc(1_000_000, 1, "aa") });
  });

  it("wartet beim Zaehlerueberlauf auf die naechste Millisekunde und beginnt dort bei 0", () => {
    const uhr = pruefuhr(500);
    const hlcUhr = new HlcUhr({
      clientId: "aa",
      wanduhr: uhr.lesen,
      start: hlc(500, ZAEHLER_MAX, "aa"),
    });

    expect(hlcUhr.erzeugen()).toEqual({ art: "wartenAufNaechsteMillisekunde", millisekunden: 500 });
    uhr.weiter(1);
    expect(hlcUhr.erzeugen()).toEqual({ art: "erzeugt", hlc: hlc(501, 0, "aa") });
  });

  it("meldet eine stehende Uhr, wenn das Warten nichts bringt (§3.2)", () => {
    const uhr = pruefuhr(500);
    const hlcUhr = new HlcUhr({
      clientId: "aa",
      wanduhr: uhr.lesen,
      start: hlc(500, ZAEHLER_MAX, "aa"),
    });

    hlcUhr.erzeugen();
    expect(hlcUhr.erzeugen()).toEqual({
      art: "wartenAufNaechsteMillisekunde",
      millisekunden: 500,
      meldung: { art: "uhrSteht", millisekunden: 500 },
    });
  });
});

describe("Fortschreibung beim Empfangen (§3.2)", () => {
  it("zieht bei gleicher Millisekunde den groesseren Zaehler und erhoeht um eins", () => {
    const uhr = pruefuhr(1000);
    const hlcUhr = new HlcUhr({ clientId: "aa", wanduhr: uhr.lesen, start: hlc(1000, 4, "aa") });

    expect(hlcUhr.empfangen(hlc(1000, 9, "bb"))).toEqual({
      hlc: hlc(1000, 10, "aa"),
      uebernommen: true,
    });
  });

  it("uebernimmt eine hoehere fremde Millisekunde mit fremdem Zaehler plus eins", () => {
    const uhr = pruefuhr(1000);
    const hlcUhr = new HlcUhr({ clientId: "aa", wanduhr: uhr.lesen, start: hlc(1000, 4, "aa") });

    expect(hlcUhr.empfangen(hlc(1200, 7, "bb"))).toEqual({
      hlc: hlc(1200, 8, "aa"),
      uebernommen: true,
    });
  });

  it("setzt den Zaehler auf 0, wenn die eigene Wanduhr beide ueberholt", () => {
    const uhr = pruefuhr(9000);
    const hlcUhr = new HlcUhr({ clientId: "aa", wanduhr: uhr.lesen, start: hlc(1000, 4, "aa") });

    expect(hlcUhr.empfangen(hlc(1200, 7, "bb"))).toEqual({
      hlc: hlc(9000, 0, "aa"),
      uebernommen: true,
    });
  });

  it("uebernimmt einen Wert nicht, der die eigene Uhr um mehr als fuenf Minuten nach vorn zoege", () => {
    const uhr = pruefuhr(1000);
    const hlcUhr = new HlcUhr({ clientId: "aa", wanduhr: uhr.lesen, start: hlc(1000, 4, "aa") });

    const empfang = hlcUhr.empfangen(hlc(1000 + UHR_SCHWELLE_MS + 1, 0, "bb"));

    expect(empfang.uebernommen).toBe(false);
    expect(empfang.hlc).toEqual(hlc(1000, 4, "aa"));
    expect(empfang.meldung).toEqual({
      art: "fremdeUhrWeichtAb",
      abweichungMs: UHR_SCHWELLE_MS + 1,
      fremderClientId: "bb",
    });
  });

  it("uebernimmt einen Wert genau auf der Schwelle noch", () => {
    const uhr = pruefuhr(1000);
    const hlcUhr = new HlcUhr({ clientId: "aa", wanduhr: uhr.lesen, start: hlc(1000, 4, "aa") });

    expect(hlcUhr.empfangen(hlc(1000 + UHR_SCHWELLE_MS, 0, "bb")).uebernommen).toBe(true);
  });

  it("weicht beim Zaehlerueberlauf auf die naechste Millisekunde aus (§3.2)", () => {
    const uhr = pruefuhr(1000);
    const hlcUhr = new HlcUhr({ clientId: "aa", wanduhr: uhr.lesen, start: hlc(1000, 0, "aa") });

    expect(hlcUhr.empfangen(hlc(1000, ZAEHLER_MAX, "bb"))).toEqual({
      hlc: hlc(1001, 0, "aa"),
      uebernommen: true,
    });
  });

  it("bleibt streng monoton, egal was ankommt und wie die Wanduhr springt", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(hlcArb, fc.integer({ min: 0, max: 4_000_000_000_000 })), { minLength: 1, maxLength: 60 }),
        (schritte) => {
          let jetzt = 1_000_000;
          const hlcUhr = new HlcUhr({ clientId: "aa", wanduhr: () => jetzt });
          let vorher = hlcUhr.stand;

          for (const [fremd, wanduhr] of schritte) {
            jetzt = wanduhr;
            hlcUhr.empfangen(fremd);
            expect(hlcUhr.stand.millisekunden).toBeGreaterThanOrEqual(vorher.millisekunden);
            const erzeugung = hlcUhr.erzeugen();
            if (erzeugung.art === "erzeugt") {
              // Streng monoton: jede erzeugte HLC liegt echt ueber der letzten.
              expect(vergleicheHlc(erzeugung.hlc, vorher)).toBeGreaterThan(0);
              vorher = erzeugung.hlc;
            } else {
              vorher = hlcUhr.stand;
            }
          }
        },
      ),
    );
  });
});
