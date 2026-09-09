import { describe, expect, it } from "vitest";

import { vektorenGleich, vergleiche, type Clientstand } from "./konvergenz.js";

/** Ein Stand mit allen Feldern; die Tests setzen nur, was sie brauchen. */
function stand(teil: Partial<Clientstand> & { clientId: string }): Clientstand {
  return {
    vektor: { "a.0000.jsonl": { offset: 100, kette: "k1" } },
    zustandsHash: "hash-gleich",
    identitaetenHash: "ids-gleich",
    ereignisse: 3,
    quarantaenen: [],
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
