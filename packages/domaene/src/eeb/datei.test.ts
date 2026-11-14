/**
 * Der Datei-Weg: welche Texte aus einer PDF Bögen sind.
 */

import { SCHEMA_VERSION } from "@bos/eeb-format";
import { describe, expect, it } from "vitest";

import { boegenAusJsonTexten } from "./datei.js";

/** Das Gerüst eines Bogens in Schema 6 — die echten Bögen misst `bau/pruefdaten/eeb-pdf.test.ts`. */
function bogentext(name: string): string {
  return JSON.stringify(
    { schemaVersion: 6, stand: 2400, einheit: { hierarchie: [{ bezeichnung: {}, name }] }, personal: [], fahrzeuge: [] },
    null,
    2,
  );
}

const EINS = bogentext("Bergungsgruppe 1");
const ZWEI = bogentext("Fachgruppe Räumen");

describe("boegenAusJsonTexten", () => {
  it("liest einen Bogen und hebt ihn auf das aktuelle Schema", () => {
    const boegen = boegenAusJsonTexten([EINS]);
    expect(boegen).toHaveLength(1);
    expect(boegen[0]?.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("nimmt auch eine Liste von Bögen in einem Text", () => {
    expect(boegenAusJsonTexten([`[${EINS},${ZWEI}]`])).toHaveLength(2);
  });

  it("führt denselben Bogen nur einmal — eine PDF kann ihn doppelt tragen", () => {
    // Anders formatiert, gleicher Inhalt: Die Dublette hängt am Inhalt, nicht am Text.
    const kompakt = JSON.stringify(JSON.parse(EINS));
    expect(boegenAusJsonTexten([EINS, kompakt, ZWEI])).toHaveLength(2);
  });

  it("lässt alles fallen, was kein Bogen ist", () => {
    const texte = ["", "kein json", "42", "null", '{"einheit":"x"}', '{"schemaVersion":8,"stand":1,"einheit":{}}'];
    expect(boegenAusJsonTexten(texte)).toHaveLength(0);
  });
});
