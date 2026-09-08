import { describe, expect, it } from "vitest";

import { KETTE_ANFANG, crc32Hex, kettenPruefsumme } from "./pruefsummen.js";
import { ZEILE_MAX_BYTE } from "./startwerte.js";
import {
  baueZeile,
  inhaltsSchluessel,
  leseAbschnitt,
  type Rahmenblick,
} from "./zeile.js";

const kodierer = new TextEncoder();

function rahmen(id: string, vorgaenger: string, zusatz: Record<string, unknown> = {}): Rahmenblick {
  return { id, vorgaenger, typ: "EinheitGemeldet", schemaVersion: 1, ...zusatz };
}

/** Baut eine Kette aus n Zeilen und liefert Bytes plus die Kettenprüfsumme am Ende. */
function kette(anzahl: number, start = KETTE_ANFANG): { bytes: Uint8Array; ende: string } {
  const teile: Uint8Array[] = [];
  let vorgaenger = start;
  for (let i = 1; i <= anzahl; i += 1) {
    const zeile = baueZeile(rahmen(`c1:${i}`, vorgaenger, { nutzlast: { n: i } }));
    teile.push(zeile);
    vorgaenger = kettenPruefsumme(zeile);
  }
  const gesamt = teile.reduce((summe, t) => summe + t.byteLength, 0);
  const bytes = new Uint8Array(gesamt);
  let ziel = 0;
  for (const t of teile) {
    bytes.set(t, ziel);
    ziel += t.byteLength;
  }
  return { bytes, ende: vorgaenger };
}

describe("CRC-32 nach §2.1", () => {
  it("liefert den bekannten Prüfwert für 123456789", () => {
    // IEEE 802.3, Polynom 0xEDB88320 — der übliche Kontrollwert.
    expect(crc32Hex(kodierer.encode("123456789"))).toBe("cbf43926");
  });

  it("liefert acht Hexzeichen in Kleinbuchstaben", () => {
    const wert = crc32Hex(kodierer.encode(""));
    expect(wert).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("Kettenprüfsumme nach §2.3", () => {
  it("ist 32 Hexzeichen und hängt an den vollständigen Zeilenbytes einschließlich \\n", () => {
    const zeile = baueZeile(rahmen("c1:1", KETTE_ANFANG));
    expect(kettenPruefsumme(zeile)).toMatch(/^[0-9a-f]{32}$/);
    // Ein einziges verändertes Byte ändert die Kette — sonst erkennte §8.6.2
    // keine nachträgliche Änderung innerhalb einer Schreiberkette.
    const veraendert = zeile.slice();
    veraendert[veraendert.length - 2] = (veraendert[veraendert.length - 2] as number) ^ 0x01;
    expect(kettenPruefsumme(veraendert)).not.toBe(kettenPruefsumme(zeile));
  });

  it("beginnt bei 32 Nullen", () => {
    expect(KETTE_ANFANG).toBe("0".repeat(32));
  });
});

describe("Zeilenformat nach §2.1", () => {
  it("schreibt länge \\t crc32 \\t json \\n", () => {
    const zeile = baueZeile(rahmen("c1:1", KETTE_ANFANG));
    const text = new TextDecoder().decode(zeile);
    const treffer = /^(\d+)\t([0-9a-f]{8})\t(\{.*\})\n$/.exec(text);
    expect(treffer).not.toBeNull();
    const [, laenge, , json] = treffer as RegExpExecArray;
    expect(Number(laenge)).toBe(kodierer.encode(json as string).byteLength);
  });

  it("weist eine Zeile über der Obergrenze von 1 MiB zurück", () => {
    const riesig = "x".repeat(ZEILE_MAX_BYTE + 1);
    expect(() => baueZeile(rahmen("c1:1", KETTE_ANFANG, { nutzlast: riesig }))).toThrow(RangeError);
  });

  it("liest eine Kette vollständig und lückenlos zurück", () => {
    const { bytes, ende } = kette(5);
    const ergebnis = leseAbschnitt(bytes, 0);
    expect(ergebnis.abschluss).toEqual({ art: "ende" });
    expect(ergebnis.zeilen.map((z) => z.rahmen["id"])).toEqual(["c1:1", "c1:2", "c1:3", "c1:4", "c1:5"]);
    expect(ergebnis.endeOffset).toBe(bytes.byteLength);
    expect(ergebnis.letzteKette).toBe(ende);
  });

  it("liest ab einem Offset mit mitgegebener Kette weiter (§5.3)", () => {
    const { bytes } = kette(3);
    const erste = leseAbschnitt(bytes, 0);
    const grenze = (erste.zeilen[0] as { laenge: number }).laenge;
    const rest = leseAbschnitt(bytes.subarray(grenze), grenze, erste.zeilen[0]?.kette);
    expect(rest.abschluss).toEqual({ art: "ende" });
    expect(rest.zeilen.map((z) => z.rahmen["id"])).toEqual(["c1:2", "c1:3"]);
  });
});

describe("§8.2 Regel 1 — unbrauchbares Längenfeld ist defekt", () => {
  it.each([
    ["führende Null", "07\tcbf43926\t{}\n"],
    ["keine Ziffer", "x2\tcbf43926\t{}\n"],
    ["mehr als sieben Ziffern", "12345678\tcbf43926\t{}\n"],
    ["leeres Längenfeld", "\tcbf43926\t{}\n"],
  ])("%s", (_name, roh) => {
    const ergebnis = leseAbschnitt(kodierer.encode(roh), 0);
    expect(ergebnis.abschluss).toEqual({ art: "defekt", offset: 0, grund: "laenge" });
  });

  it("erkennt eine Länge über 1 MiB, auch wenn gar nicht so viele Bytes da sind", () => {
    // §8.2 Regel 1: „unabhängig davon, wie viele Bytes tatsächlich vorhanden
    // sind". Ohne diese Schranke wartete der Leser dauerhaft auf Bytes, die es
    // nicht gibt.
    const roh = `${ZEILE_MAX_BYTE + 1}\tcbf43926\t{}\n`;
    const ergebnis = leseAbschnitt(kodierer.encode(roh), 0);
    expect(ergebnis.abschluss).toEqual({ art: "defekt", offset: 0, grund: "laenge" });
  });
});

describe("§8.1 / §8.2 Regel 2 — abgeschnittene Zeile ist unvollständig, nicht defekt", () => {
  it("meldet jede Kürzung der letzten Zeile als unvollständig", () => {
    const { bytes } = kette(3);
    const ganz = leseAbschnitt(bytes, 0);
    const letzte = ganz.zeilen[2] as { offset: number; laenge: number };
    // Jede einzelne Kürzung innerhalb der letzten Zeile — vom fehlenden \n bis
    // zum halben Längenfeld.
    for (let fehlt = 1; fehlt < letzte.laenge; fehlt += 1) {
      const gekuerzt = bytes.subarray(0, bytes.byteLength - fehlt);
      const ergebnis = leseAbschnitt(gekuerzt, 0);
      expect(ergebnis.abschluss, `es fehlen ${fehlt} Byte`).toEqual({ art: "unvollstaendig" });
      // Der Offset bleibt vor der unvollständigen Zeile stehen (§8.1).
      expect(ergebnis.endeOffset).toBe(letzte.offset);
      expect(ergebnis.zeilen).toHaveLength(2);
    }
  });

  it("wertet die Zeile aus, sobald das letzte Byte nachgekommen ist", () => {
    const { bytes } = kette(2);
    const ohneZeilenende = leseAbschnitt(bytes.subarray(0, bytes.byteLength - 1), 0);
    expect(ohneZeilenende.abschluss).toEqual({ art: "unvollstaendig" });
    expect(leseAbschnitt(bytes, 0).zeilen).toHaveLength(2);
  });
});

describe("§8.2 Regel 3 — genug Bytes, aber kein \\n an der angekündigten Stelle", () => {
  it("ist defekt, nicht unvollständig", () => {
    const zeile = baueZeile(rahmen("c1:1", KETTE_ANFANG));
    const roh = new Uint8Array(zeile.byteLength + 4);
    roh.set(zeile, 0);
    roh[zeile.byteLength - 1] = 0x20; // \n durch ein Leerzeichen ersetzt
    const ergebnis = leseAbschnitt(roh, 0);
    expect(ergebnis.abschluss).toEqual({ art: "defekt", offset: 0, grund: "keinZeilenende" });
  });
});

describe("§8.2 Regel 4 — vollständig, aber nicht stimmig", () => {
  it("erkennt ein gekipptes Byte im JSON am CRC", () => {
    const { bytes } = kette(2);
    const zweite = leseAbschnitt(bytes, 0).zeilen[1] as { offset: number; laenge: number };
    const beschaedigt = bytes.slice();
    const stelle = zweite.offset + zweite.laenge - 5;
    beschaedigt[stelle] = (beschaedigt[stelle] as number) ^ 0x01;
    const ergebnis = leseAbschnitt(beschaedigt, 0);
    expect(ergebnis.abschluss).toEqual({ art: "defekt", offset: zweite.offset, grund: "crc" });
    // §8.2 Punkt 1: Alle Zeilen vor der Fehlerstelle bleiben gültig.
    expect(ergebnis.zeilen).toHaveLength(1);
    expect(ergebnis.endeOffset).toBe(zweite.offset);
  });

  it("erkennt ein verfälschtes Längenfeld am CRC, wenn es zufällig plausibel bleibt", () => {
    // §2.1: „Weil der CRC über <länge> \\t <json> gebildet wird, fällt jede
    // Verfälschung des Längenfelds bei der Prüfung auf."
    const inhalt = "y".repeat(100);
    const zeile = baueZeile(rahmen("c1:1", KETTE_ANFANG, { nutzlast: inhalt }));
    const text = new TextDecoder().decode(zeile);
    const laenge = (/^(\d+)\t/.exec(text) as RegExpExecArray)[1] as string;
    // Nur die Ziffern verdrehen, Zeilenlänge bleibt gleich.
    const verdreht = `${laenge.slice(1)}${laenge[0] as string}`;
    expect(verdreht).not.toBe(laenge);
    const roh = kodierer.encode(verdreht + text.slice(laenge.length));
    const ergebnis = leseAbschnitt(roh, 0);
    expect(ergebnis.abschluss).toMatchObject({ art: "defekt", offset: 0 });
  });

  it("erkennt einen Kettenbruch", () => {
    const falsch = baueZeile(rahmen("c1:1", "f".repeat(32)));
    const ergebnis = leseAbschnitt(falsch, 0);
    expect(ergebnis.abschluss).toEqual({ art: "defekt", offset: 0, grund: "kette" });
  });

  it("erkennt ein entferntes Zwischenstück als Kettenbruch (§8.6.2)", () => {
    const { bytes } = kette(4);
    const gelesen = leseAbschnitt(bytes, 0);
    const zweite = gelesen.zeilen[1] as { offset: number; laenge: number };
    const ohneZweite = new Uint8Array(bytes.byteLength - zweite.laenge);
    ohneZweite.set(bytes.subarray(0, zweite.offset), 0);
    ohneZweite.set(bytes.subarray(zweite.offset + zweite.laenge), zweite.offset);
    const ergebnis = leseAbschnitt(ohneZweite, 0);
    expect(ergebnis.abschluss).toEqual({ art: "defekt", offset: zweite.offset, grund: "kette" });
  });

  it("erkennt nicht parsebares JSON mit stimmigem CRC", () => {
    const json = "{kein json}";
    const laenge = String(kodierer.encode(json).byteLength);
    const crc = crc32Hex(kodierer.encode(`${laenge}\t${json}`));
    const ergebnis = leseAbschnitt(kodierer.encode(`${laenge}\t${crc}\t${json}\n`), 0);
    expect(ergebnis.abschluss).toEqual({ art: "defekt", offset: 0, grund: "json" });
  });
});

describe("§4.6 — „gleicher Inhalt\" heißt: Rahmen ohne vorgaenger", () => {
  it("ignoriert vorgaenger im Inhaltsschlüssel", () => {
    const a = rahmen("c1:7", KETTE_ANFANG, { nutzlast: { x: 1 } });
    const b = rahmen("c1:7", "a".repeat(32), { nutzlast: { x: 1 } });
    expect(inhaltsSchluessel(a)).toBe(inhaltsSchluessel(b));
  });

  it("unterscheidet abweichende Nutzlast trotz gleicher Identität", () => {
    const a = rahmen("c1:7", KETTE_ANFANG, { nutzlast: { x: 1 } });
    const b = rahmen("c1:7", KETTE_ANFANG, { nutzlast: { x: 2 } });
    expect(inhaltsSchluessel(a)).not.toBe(inhaltsSchluessel(b));
  });

  it("überspringt eine wiederholte Zeile mit identischem Inhalt, statt sie zu verwerfen", () => {
    // Genau der Fall des Ersatzsegments (§4.6): dieselben Ereignisse, andere
    // Kette. Wer hier byteweise verglichen hätte, setzte einen gesunden Leser
    // in Quarantäne.
    const original = rahmen("c1:7", KETTE_ANFANG, { nutzlast: { x: 1 } });
    const wiederholt = baueZeile(rahmen("c1:7", "b".repeat(32), { nutzlast: { x: 1 } }));
    const ergebnis = leseAbschnitt(wiederholt, 0, "b".repeat(32), {
      inhaltVon: (id) => (id === "c1:7" ? inhaltsSchluessel(original) : undefined),
    });
    expect(ergebnis.abschluss).toEqual({ art: "ende" });
    expect(ergebnis.zeilen[0]?.wiederholung).toBe(true);
  });

  it("erklärt dieselbe Identität mit anderem Inhalt für defekt (§8.2)", () => {
    const original = rahmen("c1:7", KETTE_ANFANG, { nutzlast: { x: 1 } });
    const anders = baueZeile(rahmen("c1:7", KETTE_ANFANG, { nutzlast: { x: 2 } }));
    const ergebnis = leseAbschnitt(anders, 0, KETTE_ANFANG, {
      inhaltVon: (id) => (id === "c1:7" ? inhaltsSchluessel(original) : undefined),
    });
    expect(ergebnis.abschluss).toEqual({ art: "defekt", offset: 0, grund: "identitaetAnders" });
  });
});
