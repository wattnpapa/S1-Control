/**
 * Prüffälle zum ZIP-Schreiber (M4.0).
 *
 * Der wichtigste steht am Ende: Ein **fremder** Leser muss das Archiv öffnen
 * können. Ein Schreiber, der nur gegen den eigenen Leser geprüft ist, prüft,
 * ob er zu sich selbst passt — und genau das ist bei einem Dateiformat die
 * wertlose Aussage. Hier liest `node:zlib` beziehungsweise das
 * Betriebssystem-Werkzeug gegen; die Prüfung dazu steht in
 * `bau/ausgaben/zip-fremdleser.test.ts`, weil sie das Dateisystem braucht.
 *
 * Hier steht, was ohne Dateisystem prüfbar ist: der Aufbau der Köpfe, die
 * Prüfsumme und die beiden Festlegungen, die sich still rächen würden — UTF-8
 * im Dateinamen und `/` als Trenner.
 */

import { describe, expect, it } from "vitest";

import { dosZeit, liesZip, schreibeZip, textEintrag } from "./zip.js";
import { crc32 } from "@s1/domaene";

const KODIERER = new TextEncoder();

/** Liest eine vorzeichenlose 32-Bit-Zahl in Little-Endian. */
function u32(bytes: Uint8Array, stelle: number): number {
  return (
    ((bytes[stelle] as number) |
      ((bytes[stelle + 1] as number) << 8) |
      ((bytes[stelle + 2] as number) << 16) |
      ((bytes[stelle + 3] as number) << 24)) >>>
    0
  );
}

function u16(bytes: Uint8Array, stelle: number): number {
  return (bytes[stelle] as number) | ((bytes[stelle + 1] as number) << 8);
}

describe("schreibeZip", () => {
  it("beginnt mit der Signatur des lokalen Kopfes", () => {
    const archiv = schreibeZip([textEintrag("a.txt", "Hallo")]);
    expect(u32(archiv, 0)).toBe(0x04_03_4b_50);
  });

  it("endet mit dem Abschlusssatz, der die Zahl der Einträge nennt", () => {
    const archiv = schreibeZip([textEintrag("a.txt", "A"), textEintrag("b.txt", "B")]);
    // Der Abschlusssatz ist 22 Bytes lang, wenn kein Archivkommentar folgt.
    const anfang = archiv.length - 22;
    expect(u32(archiv, anfang)).toBe(0x06_05_4b_50);
    expect(u16(archiv, anfang + 8)).toBe(2);
    expect(u16(archiv, anfang + 10)).toBe(2);
  });

  it("trägt die CRC-32 des Inhalts im lokalen Kopf", () => {
    const inhalt = "Stärke 0/1/8";
    const archiv = schreibeZip([textEintrag("s.txt", inhalt)]);
    // Der lokale Kopf: Signatur(4) Version(2) Merkmale(2) Methode(2)
    // Zeit(2) Datum(2) → CRC ab Byte 14.
    expect(u32(archiv, 14)).toBe(crc32(KODIERER.encode(inhalt)));
  });

  it("speichert statt zu komprimieren, und beide Größen sind gleich", () => {
    const inhalt = "x".repeat(500);
    const archiv = schreibeZip([textEintrag("g.txt", inhalt)]);
    expect(u16(archiv, 8)).toBe(0);
    expect(u32(archiv, 18)).toBe(500);
    expect(u32(archiv, 22)).toBe(500);
  });

  it("setzt das UTF-8-Merkmal, damit Umlaute im Dateinamen ankommen", () => {
    // Ohne Bit 11 deutet ein Leser den Namen als Codepage 437, und aus
    // „Stärke.html" wird „StΣrke.html" — bei einem deutschsprachigen Produkt
    // kein Randfall.
    const archiv = schreibeZip([textEintrag("Stärke.html", "<p/>")]);
    expect(u16(archiv, 6) & 0x08_00).toBe(0x08_00);
    const namenslaenge = u16(archiv, 26);
    const name = new Uint8Array(archiv.buffer, archiv.byteOffset + 30, namenslaenge);
    expect(name).toEqual(KODIERER.encode("Stärke.html"));
  });

  it("legt einen leeren Eintrag ohne Klage ab", () => {
    const archiv = schreibeZip([textEintrag("leer.txt", "")]);
    expect(u32(archiv, 18)).toBe(0);
    expect(u32(archiv, 14)).toBe(crc32(new Uint8Array(0)));
  });

  it("schreibt ein Archiv ohne Einträge, das trotzdem gültig ist", () => {
    // Ein leeres Archiv ist nur der Abschlusssatz. Es kommt vor: eine
    // Einsatzakte, die exportiert wird, bevor ein Ereignis geschrieben wurde.
    const archiv = schreibeZip([]);
    expect(archiv).toHaveLength(22);
    expect(u32(archiv, 0)).toBe(0x06_05_4b_50);
  });
});

describe("dosZeit", () => {
  it("rechnet einen Zeitpunkt in die beiden Wörter des Formats", () => {
    // 10.09.2026, 14:30:06 — Sekunden mit Zwei-Sekunden-Auflösung.
    const { zeit, datum } = dosZeit(new Date(2026, 8, 10, 14, 30, 6));
    expect((datum >> 9) + 1980).toBe(2026);
    expect((datum >> 5) & 0x0f).toBe(9);
    expect(datum & 0x1f).toBe(10);
    expect(zeit >> 11).toBe(14);
    expect((zeit >> 5) & 0x3f).toBe(30);
    expect((zeit & 0x1f) * 2).toBe(6);
  });

  it("klemmt einen Zeitpunkt vor 1980 auf den ersten darstellbaren", () => {
    // Das Format kennt kein früheres Jahr; ein negativer Wert ergäbe ein
    // Archiv, das kein Leser öffnet.
    const { zeit, datum } = dosZeit(new Date(0));
    expect(zeit).toBe(0);
    expect((datum >> 9) + 1980).toBe(1980);
  });
});

describe("liesZip — der Rückweg", () => {
  it("liest zurück, was schreibeZip geschrieben hat", () => {
    const eintraege = [
      textEintrag("einsatz.json", '{"einsatzId":"2026-09-08_uebung_ab12cd"}\n'),
      textEintrag("ereignisse/0000-aabbccdd.jsonl", "42\t1a2b3c4d\t{}\n"),
      { pfad: "anhaenge/leer.bin", bytes: new Uint8Array(0) },
    ];
    const zurueck = liesZip(schreibeZip(eintraege));
    expect(zurueck.map((e) => e.pfad)).toEqual(eintraege.map((e) => e.pfad));
    for (const [i, soll] of eintraege.entries()) {
      expect(Array.from((zurueck[i] as { bytes: Uint8Array }).bytes)).toEqual(Array.from(soll.bytes));
    }
  });

  it("hält Umlaute im Pfad durch — UTF-8 ist im Merkmalsbit angesagt", () => {
    const zurueck = liesZip(schreibeZip([textEintrag("ausgaben/stärke-übersicht.html", "x")]));
    expect((zurueck[0] as { pfad: string }).pfad).toBe("ausgaben/stärke-übersicht.html");
  });

  it("meldet ein gekipptes Byte über die CRC-32 des Formats", () => {
    const bytes = schreibeZip([textEintrag("a.txt", "Lagemeldung 08:00")]);
    // Der lokale Kopf ist 30 Byte plus 5 Byte Name lang; danach beginnen die
    // Daten. Ein Byte darin kippen heißt: dieselbe Länge, andere Prüfsumme —
    // genau der Fall, den §2.1 für die Ereigniszeilen abfängt.
    const verbogen = new Uint8Array(bytes);
    verbogen[35] = (verbogen[35] as number) ^ 0x01;
    expect(() => liesZip(verbogen)).toThrow(/CRC-32/);
  });

  it("weist etwas zurück, das kein Archiv ist, statt es zu deuten", () => {
    expect(() => liesZip(new TextEncoder().encode("Das ist eine Textdatei."))).toThrow(
      /Abschlusssatz/,
    );
  });

  it("liest ein leeres Archiv als leere Liste", () => {
    expect(liesZip(schreibeZip([]))).toEqual([]);
  });
});
