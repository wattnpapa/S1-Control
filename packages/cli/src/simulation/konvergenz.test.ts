import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { Einsatzablage, KETTE_ANFANG, baueZeile, knotenDateisystem } from "@s1/speicher";

import { erhebeStand, vektorenGleich, vergleiche, type Clientstand } from "./konvergenz.js";
import { teileQuarantaenen } from "./klient.js";

/** Ein Stand mit allen Feldern; die Tests setzen nur, was sie brauchen. */
function stand(teil: Partial<Clientstand> & { clientId: string }): Clientstand {
  return {
    vektor: { "a.0000.jsonl": { offset: 100, kette: "k1" } },
    zustandsHash: "hash-gleich",
    identitaetenHash: "ids-gleich",
    ereignisse: 3,
    quarantaenen: [],
    vorlaeufigeQuarantaenen: [],
    bytes: 300,
    ...teil,
  };
}

describe("Konvergenzvergleich — die drei Ausgänge aus §7.6", () => {
  it("meldet Konvergenz bei gleichen Vektoren und gleichem Hash", () => {
    const befund = vergleiche([stand({ clientId: "a" }), stand({ clientId: "b" })]);
    expect(befund.art).toBe("konvergent");
    if (befund.art !== "konvergent") throw new Error("unerreichbar");
    expect(befund.clients).toEqual(["a", "b"]);
    expect(befund.zustandsHash).toBe("hash-gleich");
  });

  it("meldet den roten Ausgang nur bei gleichen Vektoren und verschiedenem Hash", () => {
    const befund = vergleiche([
      stand({ clientId: "a" }),
      stand({ clientId: "b", zustandsHash: "anders" }),
    ]);
    expect(befund.art).toBe("abweichend");
    if (befund.art !== "abweichend") throw new Error("unerreichbar");
    expect(befund.hashes).toEqual({ a: "hash-gleich", b: "anders" });
  });

  it("meldet verschiedene Offsets als „nicht vergleichbar“, nicht als Fehler", () => {
    const befund = vergleiche([
      stand({ clientId: "a" }),
      stand({
        clientId: "b",
        vektor: { "a.0000.jsonl": { offset: 90, kette: "k0" } },
        zustandsHash: "anders",
      }),
    ]);
    expect(befund.art).toBe("nichtVergleichbar");
  });

  it("wertet gleiche Offsets mit verschiedener Kette als verschieden", () => {
    // §7.6: „die mitgeführte `letzteKette` belegt, dass es dieselben Bytes
    // waren." Ohne sie hielte der Vergleich zwei verschiedene Bytefolgen
    // gleicher Länge für dieselbe Ereignismenge.
    expect(
      vektorenGleich(
        { "a.0000.jsonl": { offset: 100, kette: "k1" } },
        { "a.0000.jsonl": { offset: 100, kette: "k2" } },
      ),
    ).toBe(false);
  });

  it("wertet eine nur einem Client bekannte Datei als verschiedenen Vektor", () => {
    // §7.6, Zusatz: „Ein Client, der eine Datei noch gar nicht kennt, hat keinen
    // kleineren Wert für sie, sondern gar keinen."
    const befund = vergleiche([
      stand({ clientId: "a" }),
      stand({
        clientId: "b",
        vektor: {
          "a.0000.jsonl": { offset: 100, kette: "k1" },
          "b.0000.jsonl": { offset: 10, kette: "k9" },
        },
      }),
    ]);
    expect(befund.art).toBe("nichtVergleichbar");
    if (befund.art !== "nichtVergleichbar") throw new Error("unerreichbar");
    expect(befund.grund).toContain("b.0000.jsonl");
    expect(befund.grund).toContain("nur bei einem");
  });

  it("nimmt Clients mit Quarantäne aus dem Vergleich und meldet sie getrennt (§8.6.1 Regel 3)", () => {
    const befund = vergleiche([
      stand({ clientId: "a" }),
      stand({ clientId: "b" }),
      stand({
        clientId: "c",
        quarantaenen: ["x.0000.jsonl@40 (crc, endgültig nach §8.2)"],
        vektor: { "a.0000.jsonl": { offset: 40, kette: "k0" } },
        zustandsHash: "unvollstaendig",
      }),
    ]);
    // Der Quarantäne-Client darf den Nachweis nicht kippen.
    expect(befund.art).toBe("konvergent");
    if (befund.art !== "konvergent") throw new Error("unerreichbar");
    expect(befund.clients).toEqual(["a", "b"]);
    expect(befund.unvollstaendigeSicht).toEqual([
      {
        clientId: "c",
        quarantaenen: ["x.0000.jsonl@40 (crc, endgültig nach §8.2)"],
        geheilt: false,
      },
    ]);
  });

  it("meldet einen geheilten Quarantäne-Client als geheilt (§8.6.1 Regel 4)", () => {
    const befund = vergleiche([
      stand({ clientId: "a" }),
      stand({ clientId: "b" }),
      stand({
        clientId: "c",
        quarantaenen: ["x.0000.jsonl@40 (crc, endgültig nach §8.2)"],
        vektor: { "a.0000.jsonl": { offset: 40, kette: "k0" } },
      }),
    ]);
    if (befund.art !== "konvergent") throw new Error("unerreichbar");
    expect(befund.unvollstaendigeSicht[0]?.geheilt).toBe(true);
  });

  it("meldet „zu wenige Clients“, wenn weniger als zwei ohne Quarantäne übrig sind", () => {
    const befund = vergleiche([
      stand({ clientId: "a" }),
      stand({ clientId: "b", quarantaenen: ["x@1"] }),
      stand({ clientId: "c", quarantaenen: ["x@1"] }),
    ]);
    expect(befund.art).toBe("zuWenigeClients");
    if (befund.art !== "zuWenigeClients") throw new Error("unerreichbar");
    expect(befund.unvollstaendigeSicht).toHaveLength(2);
  });

  it("unterscheidet bei „nicht vergleichbar“ gleiche von verschiedenen Ereignismengen", () => {
    const gleiche = vergleiche([
      stand({ clientId: "a" }),
      stand({ clientId: "b", vektor: { "c.0001.jsonl": { offset: 5, kette: "k" } } }),
    ]);
    if (gleiche.art !== "nichtVergleichbar") throw new Error("unerreichbar");
    expect(gleiche.gleicheIdentitaeten).toBe(true);
    expect(gleiche.gleicheHashes).toBe(true);

    const verschiedene = vergleiche([
      stand({ clientId: "a" }),
      stand({
        clientId: "b",
        vektor: { "c.0001.jsonl": { offset: 5, kette: "k" } },
        identitaetenHash: "andere",
        zustandsHash: "anders",
      }),
    ]);
    if (verschiedene.art !== "nichtVergleichbar") throw new Error("unerreichbar");
    expect(verschiedene.gleicheIdentitaeten).toBe(false);
    expect(verschiedene.gleicheHashes).toBe(false);
  });
});

describe("Herkunft der Quarantäne — §8.1 gegen §8.2", () => {
  it("nimmt einen Client mit bloß vorläufiger Quarantäne **nicht** aus dem Vergleich", () => {
    // §8.1 führt die unvollständige letzte Zeile ausdrücklich als „kein
    // Fehler"; sie wird in jedem Takt-B-Durchlauf erneut geprüft und
    // verschwindet, sobald der Schreiber sie vervollständigt. §8.6.1 Regel 3
    // meint die Quarantäne aus §8.2. Bis zum 2026-09-09 wurden beide gleich
    // behandelt, und Phasen wurden aus einem Nicht-Zustand heraus
    // unbewertbar (Befund 7.6 des Messprotokolls).
    const befund = vergleiche([
      stand({ clientId: "a", vorlaeufigeQuarantaenen: ["x.0000.jsonl@40 (unvollstaendig)"] }),
      stand({ clientId: "b" }),
    ]);
    expect(befund.art).toBe("konvergent");
    if (befund.art !== "konvergent") throw new Error("unerreichbar");
    expect(befund.clients).toEqual(["a", "b"]);
    // Und sie erscheint auch nicht als unvollständige Sicht nach Regel 3.
    expect(befund.unvollstaendigeSicht).toEqual([]);
  });

  it("nimmt einen Client mit endgültiger Quarantäne weiterhin aus dem Vergleich", () => {
    const befund = vergleiche([
      stand({ clientId: "a", quarantaenen: ["x.0000.jsonl@40 (crcFalsch)"] }),
      stand({ clientId: "b" }),
      stand({ clientId: "c" }),
    ]);
    expect(befund.art).toBe("konvergent");
    if (befund.art !== "konvergent") throw new Error("unerreichbar");
    expect(befund.clients).toEqual(["b", "c"]);
    expect(befund.unvollstaendigeSicht.map((s) => s.clientId)).toEqual(["a"]);
  });
});

describe("teileQuarantaenen — die Herkunft am Einzelstück", () => {
  const meldung = (datei: string, vorlaeufig: boolean) =>
    ({
      datei,
      offset: 40,
      grund: vorlaeufig ? "unvollstaendig" : "crcFalsch",
      vorlaeufig,
      seit: 0,
      meldung: "",
    }) as never;

  it("sortiert §8.1 und §8.2 auseinander und benennt beide im Text", () => {
    const geteilt = teileQuarantaenen([meldung("a.0000.jsonl", true), meldung("b.0000.jsonl", false)]);
    expect(geteilt.vorlaeufig).toHaveLength(1);
    expect(geteilt.endgueltig).toHaveLength(1);
    expect(geteilt.vorlaeufig[0]).toContain("a.0000.jsonl@40");
    expect(geteilt.vorlaeufig[0]).toContain("vorläufig nach §8.1");
    expect(geteilt.endgueltig[0]).toContain("b.0000.jsonl@40");
    expect(geteilt.endgueltig[0]).toContain("endgültig nach §8.2");
  });

  it("liefert für keine Meldung zwei leere Listen", () => {
    expect(teileQuarantaenen([])).toEqual({ endgueltig: [], vorlaeufig: [] });
  });
});

describe("erhebeStand — ersetzte Segmente stehen nicht im Vektor (§7.6, Entscheidung 18)", () => {
  /**
   * Baut eine Zeile mit gültigem Längenfeld und CRC. Die Kette wird von
   * `leseZeilengrenzen` nicht geprüft (§2.3, Sonderfall „Ersatzsegment"),
   * deshalb genügt hier ein fester `vorgaenger`.
   */
  function zeile(id: string, typ: string, nutzlast?: Record<string, unknown>): Uint8Array {
    const rahmen: Record<string, unknown> = {
      id,
      hlc: { wanduhr: 1, zaehler: 0, clientId: id.split(":")[0] as string },
      vorgaenger: KETTE_ANFANG,
      schemaVersion: 1,
      typ,
      akteur: { benutzer: "b", host: "h", clientId: id.split(":")[0] as string },
      wanduhr: "2026-09-09T20:00:00+02:00",
    };
    if (nutzlast !== undefined) rahmen["nutzlast"] = nutzlast;
    return baueZeile(rahmen as never);
  }

  function verbinde(...teile: readonly Uint8Array[]): Uint8Array {
    const gesamt = new Uint8Array(teile.reduce((summe, t) => summe + t.length, 0));
    let ab = 0;
    for (const t of teile) {
      gesamt.set(t, ab);
      ab += t.length;
    }
    return gesamt;
  }

  /**
   * Legt einen lokalen Spiegel an: das beschädigte Segment `0000` in der
   * angegebenen Länge und — wenn `mitErsatz` — das Ersatzsegment `0001`.
   */
  async function lege(
    wurzel: string,
    zeilenImOriginal: number,
    mitErsatz: boolean,
  ): Promise<Einsatzablage> {
    const ablage = new Einsatzablage(path.join(wurzel, "share"), wurzel);
    await fsp.mkdir(ablage.lokalEreignisse, { recursive: true });
    const alle = [
      zeile("1111aaaa:1", "Lagemeldung"),
      zeile("1111aaaa:2", "Lagemeldung"),
      zeile("1111aaaa:3", "Lagemeldung"),
    ];
    await fsp.writeFile(
      path.join(ablage.lokalEreignisse, "1111aaaa.0000.jsonl"),
      verbinde(...alle.slice(0, zeilenImOriginal)),
    );
    if (mitErsatz) {
      await fsp.writeFile(
        path.join(ablage.lokalEreignisse, "1111aaaa.0001.jsonl"),
        verbinde(
          zeile("1111aaaa:4", "SegmentErsetzt", { ersetztesSegment: 0, abOffset: 0 }),
          zeile("1111aaaa:3", "Lagemeldung"),
        ),
      );
    }
    return ablage;
  }

  it("lässt Schreiber und Leser nach einer Reparatur wieder auf denselben Vektor kommen", async () => {
    const wurzel = await fsp.mkdtemp(path.join(os.tmpdir(), "s1-konvergenz-"));
    const leserWurzel = await fsp.mkdtemp(path.join(os.tmpdir(), "s1-konvergenz-"));
    try {
      const fs = knotenDateisystem();
      // Der Schreiber hat das beschädigte Segment lokal vollständig (drei
      // Zeilen), der Leser führt seinen Spiegel nur bis zur Quarantänestelle
      // (zwei Zeilen) — §5.5. Beide haben das Ersatzsegment.
      const schreiber = await erhebeStand(fs, await lege(wurzel, 3, true), "1111aaaa", []);
      const leser = await erhebeStand(fs, await lege(leserWurzel, 2, true), "2222bbbb", []);

      expect(Object.keys(schreiber.vektor)).toEqual(["1111aaaa.0001.jsonl"]);
      expect(vektorenGleich(schreiber.vektor, leser.vektor)).toBe(true);
      expect(vergleiche([schreiber, leser]).art).toBe("konvergent");
      // Die Ereignisse des ersetzten Segments bleiben gefaltet: `:1` und `:2`
      // stehen in keinem Ersatz.
      expect(schreiber.ereignisse).toBe(3);
      expect(leser.ereignisse).toBe(3);
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
      await fsp.rm(leserWurzel, { recursive: true, force: true });
    }
  });

  it("folgt dem Präfix in der Nutzlast, wenn die Kennung gewechselt hat", async () => {
    // Entscheidung 17: Das Ersatzsegment steht unter der **neuen** Kennung und
    // ersetzt ein Segment der aufgegebenen. Ohne das Präfix aus der Nutzlast
    // nähme der Vektor das gleichnamige Segment der neuen Kennung heraus — die
    // falsche Datei — und behielte die richtige.
    const wurzel = await fsp.mkdtemp(path.join(os.tmpdir(), "s1-konvergenz-"));
    try {
      const ablage = new Einsatzablage(path.join(wurzel, "share"), wurzel);
      await fsp.mkdir(ablage.lokalEreignisse, { recursive: true });
      await fsp.writeFile(
        path.join(ablage.lokalEreignisse, "1111aaaa.0000.jsonl"),
        verbinde(zeile("1111aaaa:1", "Lagemeldung"), zeile("1111aaaa:2", "Lagemeldung")),
      );
      await fsp.writeFile(
        path.join(ablage.lokalEreignisse, "3333cccc.0000.jsonl"),
        verbinde(
          zeile("3333cccc:5", "SegmentErsetzt", {
            ersetztesSegment: 0,
            abOffset: 0,
            praefix: "1111aaaa",
          }),
          zeile("1111aaaa:2", "Lagemeldung"),
        ),
      );
      const stand = await erhebeStand(knotenDateisystem(), ablage, "3333cccc", []);
      expect(Object.keys(stand.vektor)).toEqual(["3333cccc.0000.jsonl"]);
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("nimmt ohne Ersatzsegment nichts heraus — der Unterschied bleibt sichtbar", async () => {
    const wurzel = await fsp.mkdtemp(path.join(os.tmpdir(), "s1-konvergenz-"));
    const leserWurzel = await fsp.mkdtemp(path.join(os.tmpdir(), "s1-konvergenz-"));
    try {
      const fs = knotenDateisystem();
      const schreiber = await erhebeStand(fs, await lege(wurzel, 3, false), "1111aaaa", []);
      const leser = await erhebeStand(fs, await lege(leserWurzel, 2, false), "2222bbbb", []);
      expect(Object.keys(schreiber.vektor)).toEqual(["1111aaaa.0000.jsonl"]);
      expect(vektorenGleich(schreiber.vektor, leser.vektor)).toBe(false);
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
      await fsp.rm(leserWurzel, { recursive: true, force: true });
    }
  });
});
