/**
 * Die Prüfung des Programmmanifests (M7.2).
 *
 * **Warum hier jeder Ablehnungsgrund einzeln steht.** Dies ist der einzige
 * Ort im Baum, an dem die Anwendung einem Bediener anbietet, ein Programm
 * auszuführen, das von außen kommt. Ein Sicherheitsmechanismus, dessen Tests
 * nur den guten Fall fahren, prüft die Stelle nicht, auf die es ankommt: Er
 * zeigt, dass ein richtiges Manifest durchkommt, und lässt offen, ob ein
 * falsches aufgehalten wird.
 */

import { describe, expect, it } from "vitest";

import { schluesselpaarErzeugen, zuHex } from "@bos/eeb-format";

import {
  pruefeManifest,
  signiereStand,
  vergleicheVersionen,
  type Programmstand,
} from "./verteilung.js";

const STAND: Programmstand = {
  version: "2.1.0",
  datei: "S1-Control-2.1.0-win-x64.exe",
  groesse: 92_000_000,
  sha256: "a".repeat(64),
  plattform: "win32",
  veroeffentlicht: "2026-09-10T12:00:00+02:00",
  hinweis: "Eingangskorb und Bündeldatei",
};

async function manifestText(
  stand: Programmstand = STAND,
): Promise<{ text: string; pubkey: string }> {
  const paar = await schluesselpaarErzeugen();
  const manifest = await signiereStand(stand, paar.privat);
  return { text: JSON.stringify(manifest), pubkey: zuHex(paar.oeffentlich) };
}

const GRUND = { laufendeVersion: "2.0.0", plattform: "win32" } as const;

describe("vergleicheVersionen", () => {
  it("vergleicht stellenweise numerisch und nicht als Zeichenkette", () => {
    // Als Text wäre „10" kleiner als „9" — nach der neunten Ausgabe böte die
    // Anwendung keine zehnte mehr an.
    expect(vergleicheVersionen("2.10.0", "2.9.0")).toBe(1);
    expect(vergleicheVersionen("2.9.0", "2.10.0")).toBe(-1);
    expect(vergleicheVersionen("2.1.0", "2.1.0")).toBe(0);
  });

  it("ordnet eine fehlende Stelle vor eine vorhandene Zahl", () => {
    expect(vergleicheVersionen("1.2", "1.2.1")).toBe(-1);
  });

  it("ordnet eine Vorabfassung vor die fertige", () => {
    // `1.0.0-beta` ist älter als `1.0.0` — dort ist die fehlende Stelle
    // **größer**, weil die vorhandene Text ist.
    expect(vergleicheVersionen("1.0.0-beta", "1.0.0")).toBe(-1);
    expect(vergleicheVersionen("1.0.0", "1.0.0-beta")).toBe(1);
  });

  it("kommt mit der Zeitstempelfassung der CI zurecht", () => {
    expect(vergleicheVersionen("2026.9.10-1430", "2026.9.10-1200")).toBe(1);
    expect(vergleicheVersionen("2026.9.10-1200", "2026.9.11-0800")).toBe(-1);
  });
});

describe("pruefeManifest", () => {
  it("bietet ein gültig signiertes, neueres Paket an", async () => {
    const { text, pubkey } = await manifestText();
    const ergebnis = await pruefeManifest({ text, vertrauterSchluessel: pubkey, ...GRUND });

    expect(ergebnis.art).toBe("angeboten");
    if (ergebnis.art !== "angeboten") return;
    expect(ergebnis.stand.version).toBe("2.1.0");
    // Die Kurzform ist reine Wiedererkennung: Ein Bediener kann am Telefon
    // sagen, welchen Schlüssel sein Rechner sieht.
    expect(ergebnis.kurzform).toMatch(/^[0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4} [0-9a-f]{4}$/);
  });

  it("lehnt einen fremden Schlüssel ab, auch wenn die Signatur zu ihm passt", async () => {
    // Der gefährlichste Fall: Wer auf den Share schreiben kann, kann ein
    // **in sich stimmiges** Manifest mit seinem eigenen Schlüssel ablegen.
    // Ohne den Vergleich gegen den vertrauten Schlüssel käme es durch.
    const { text } = await manifestText();
    const anderer = await schluesselpaarErzeugen();
    const ergebnis = await pruefeManifest({
      text,
      vertrauterSchluessel: zuHex(anderer.oeffentlich),
      ...GRUND,
    });

    expect(ergebnis.art).toBe("abgelehnt");
    if (ergebnis.art !== "abgelehnt") return;
    expect(ergebnis.grund).toBe("fremderSchluessel");
  });

  it("lehnt ein verändertes Manifest ab", async () => {
    const { text, pubkey } = await manifestText();
    // Ein Byte am Inhalt: dieselbe Signatur, ein anderer Stand.
    const verbogen = text.replace('"2.1.0"', '"9.9.9"');
    const ergebnis = await pruefeManifest({
      text: verbogen,
      vertrauterSchluessel: pubkey,
      ...GRUND,
    });

    expect(ergebnis.art).toBe("abgelehnt");
    if (ergebnis.art !== "abgelehnt") return;
    expect(ergebnis.grund).toBe("signaturFalsch");
  });

  it("lehnt eine unlesbare Signatur ab wie eine falsche", async () => {
    const { text, pubkey } = await manifestText();
    const ergebnis = await pruefeManifest({
      text: text.replace(/"signatur":"[0-9a-f]+"/, '"signatur":"nichthex"'),
      vertrauterSchluessel: pubkey,
      ...GRUND,
    });
    expect(ergebnis.art).toBe("abgelehnt");
    if (ergebnis.art !== "abgelehnt") return;
    expect(ergebnis.grund).toBe("signaturFalsch");
  });

  it("lehnt einen Dateinamen mit Pfadanteil ab — vor jeder Signaturprüfung", async () => {
    // `../../` zeigte aus dem Ordner heraus, und die Anwendung böte an, eine
    // beliebige Datei des Rechners zu starten. Der Name wird deshalb schon
    // als **Form** geprüft, bevor irgendetwas beglaubigt ist.
    const { text, pubkey } = await manifestText({
      ...STAND,
      datei: "../../../Windows/System32/cmd.exe",
    });
    const ergebnis = await pruefeManifest({ text, vertrauterSchluessel: pubkey, ...GRUND });

    expect(ergebnis.art).toBe("abgelehnt");
    if (ergebnis.art !== "abgelehnt") return;
    expect(ergebnis.grund).toBe("unlesbar");
  });

  it("lehnt ein Paket für eine andere Plattform ab", async () => {
    const { text, pubkey } = await manifestText({ ...STAND, plattform: "darwin" });
    const ergebnis = await pruefeManifest({ text, vertrauterSchluessel: pubkey, ...GRUND });

    expect(ergebnis.art).toBe("abgelehnt");
    if (ergebnis.art !== "abgelehnt") return;
    expect(ergebnis.grund).toBe("andereplattform");
  });

  it("lehnt eine Fassung ab, die nicht neuer ist als die laufende", async () => {
    const { text, pubkey } = await manifestText();
    const ergebnis = await pruefeManifest({
      text,
      vertrauterSchluessel: pubkey,
      laufendeVersion: "2.1.0",
      plattform: "win32",
    });

    expect(ergebnis.art).toBe("abgelehnt");
    if (ergebnis.art !== "abgelehnt") return;
    expect(ergebnis.grund).toBe("nichtNeuer");
  });

  it("lehnt ab, wenn die Datei daneben einen anderen Hash hat", async () => {
    // Der zweite Weg des Angreifers: das Manifest stehen lassen und die Datei
    // austauschen. Der Hash im beglaubigten Manifest fängt genau das.
    const { text, pubkey } = await manifestText();
    const ergebnis = await pruefeManifest({
      text,
      vertrauterSchluessel: pubkey,
      ...GRUND,
      dateiHash: "b".repeat(64),
    });

    expect(ergebnis.art).toBe("abgelehnt");
    if (ergebnis.art !== "abgelehnt") return;
    expect(ergebnis.grund).toBe("dateiPasstNicht");
  });

  it("nimmt es an, wenn der Hash der Datei stimmt", async () => {
    const { text, pubkey } = await manifestText();
    const ergebnis = await pruefeManifest({
      text,
      vertrauterSchluessel: pubkey,
      ...GRUND,
      dateiHash: STAND.sha256.toUpperCase(),
    });
    // Groß- und Kleinschreibung des Hexwerts entscheidet nichts.
    expect(ergebnis.art).toBe("angeboten");
  });

  it("lehnt ab, was kein Manifest ist", async () => {
    for (const text of ["", "kein json", "{}", '{"stand":{}}']) {
      const ergebnis = await pruefeManifest({
        text,
        vertrauterSchluessel: "aa".repeat(32),
        ...GRUND,
      });
      expect(ergebnis.art, text).toBe("abgelehnt");
      if (ergebnis.art !== "abgelehnt") return;
      expect(ergebnis.grund).toBe("unlesbar");
    }
  });
});
