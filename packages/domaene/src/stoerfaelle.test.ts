/**
 * Prüfungen der Störfallmatrix (M7.3).
 *
 * Zwei Sorten Test stehen hier, und die zweite ist die wichtigere:
 * die Erkennung, und die Form der Einträge. Die Form wird geprüft, weil die
 * Kurzanleitung sie druckt — ein Eintrag ohne Schritte ergäbe eine Karte mit
 * einer Überschrift und nichts darunter, und das fiele erst auf Papier auf.
 */

import { describe, expect, it } from "vitest";
import {
  STOERFAELLE,
  UHR_GRENZE_MS,
  erkannteStoerfaelle,
  stoerfall,
  type Stoerfallbefund,
} from "./stoerfaelle.js";

/** Der Normalbetrieb: alles in Ordnung, kein Fall trifft zu. */
const RUHIG: Stoerfallbefund = {
  shareErreichbar: true,
  groessteUhrabweichungMs: 0,
  konflikthinweise: 0,
  quarantaene: 0,
  programmpaketAbgelehnt: false,
  unlesbareBoegen: 0,
};

describe("Die sechs Fälle", () => {
  it("sind sechs und haben eindeutige Kennungen", () => {
    expect(STOERFAELLE).toHaveLength(6);
    expect(new Set(STOERFAELLE.map((s) => s.kennung)).size).toBe(6);
  });

  it("tragen alle Felder, die die Kurzanleitung druckt", () => {
    for (const fall of STOERFAELLE) {
      expect(fall.titel.length, fall.kennung).toBeGreaterThan(5);
      expect(fall.woran.length, fall.kennung).toBeGreaterThan(10);
      expect(fall.ursache.length, fall.kennung).toBeGreaterThan(10);
      expect(fall.schritte.length, fall.kennung).toBeGreaterThanOrEqual(3);
      expect(fall.nicht.length, fall.kennung).toBeGreaterThan(10);
      expect(fall.quelle.length, fall.kennung).toBeGreaterThan(3);
    }
  });

  it("nennen zu jedem Fall den Paragraphen, der die Zusage macht", () => {
    // Der begründende Stil ist keine Zier: Wer im Einsatz einer Anweisung
    // folgt, soll nachlesen können, worauf sie sich stützt.
    for (const fall of STOERFAELLE) {
      expect(fall.quelle, fall.kennung).toMatch(/§|EXH|M7|Entscheidung/u);
    }
  });

  it("liefert einen Fall zu seiner Kennung", () => {
    expect(stoerfall("SHARE_WEG").titel).toContain("Share");
  });
});

describe("Erkennung", () => {
  it("meldet im Normalbetrieb nichts", () => {
    expect(erkannteStoerfaelle(RUHIG)).toEqual([]);
  });

  it("meldet den fehlenden Share", () => {
    const treffer = erkannteStoerfaelle({ ...RUHIG, shareErreichbar: false });
    expect(treffer.map((s) => s.kennung)).toEqual(["SHARE_WEG"]);
  });

  it("schweigt bei einer Uhrabweichung knapp unter der Grenze", () => {
    // Genau die Grenze meldet, eine Millisekunde darunter nicht: Sonst
    // flackerte die Ansicht bei einem Rechner, der zwei Minuten nachgeht.
    expect(erkannteStoerfaelle({ ...RUHIG, groessteUhrabweichungMs: UHR_GRENZE_MS - 1 })).toEqual([]);
    expect(
      erkannteStoerfaelle({ ...RUHIG, groessteUhrabweichungMs: UHR_GRENZE_MS }).map((s) => s.kennung),
    ).toEqual(["UHR_WEICHT_AB"]);
  });

  it("bildet die Quarantäne auf den Startfall ab", () => {
    // §8.2: Ein Platz in Quarantäne ist im Vergleich außen vor. Der Weg
    // heraus ist derselbe wie beim Startproblem — Protokoll, notfalls Spiegel.
    expect(erkannteStoerfaelle({ ...RUHIG, quarantaene: 1 }).map((s) => s.kennung)).toEqual([
      "START_SCHEITERT",
    ]);
  });

  it("meldet mehrere Fälle in der Reihenfolge der Matrix", () => {
    const treffer = erkannteStoerfaelle({
      shareErreichbar: false,
      groessteUhrabweichungMs: 10 * 60 * 1000,
      konflikthinweise: 3,
      quarantaene: 1,
      programmpaketAbgelehnt: true,
      unlesbareBoegen: 2,
    });
    expect(treffer.map((s) => s.kennung)).toEqual(STOERFAELLE.map((s) => s.kennung));
  });

  it("meldet den Konflikthinweis, ohne ihn zum Fehler zu erklären", () => {
    // §3.8: Der Hinweis ist die Zusage, dass nichts still verschwunden ist.
    // Er ist deshalb nicht „sofort“ — er wartet, bis jemand hinsieht.
    const treffer = erkannteStoerfaelle({ ...RUHIG, konflikthinweise: 1 });
    expect(treffer[0]?.kennung).toBe("KONFLIKTHINWEIS");
    expect(treffer[0]?.dringlichkeit).not.toBe("sofort");
  });
});
