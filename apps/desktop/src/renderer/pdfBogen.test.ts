// @vitest-environment node
/**
 * Die JSON-Anhänge einer PDF. Die echten pdfmake-Dateien misst
 * `bau/pruefdaten/eeb-pdf.test.ts`; hier steht das Verfahren im Kleinen.
 */

import { describe, expect, it } from "vitest";

import { bogentexteAusPdf, istPdf } from "./pdfBogen.js";

describe("bogentexteAusPdf", () => {
  it("findet auch einen unkomprimierten Anhang", async () => {
    const json = '{"schemaVersion":8,"einheit":{"hierarchie":[]}}';
    const pdf = new TextEncoder().encode(`%PDF-1.7\n1 0 obj\n<< /Length ${String(json.length)} >>\nstream\n${json}\nendstream\nendobj\n`);
    expect(await bogentexteAusPdf(pdf)).toEqual([json]);
  });

  it("überspringt keinen Strom — „endstream“ endet selbst auf „stream“", async () => {
    const strom = (json: string): string => `<< >>\nstream\n${json}\nendstream\nendobj\n`;
    const pdf = new TextEncoder().encode(`%PDF-1.7\n${strom('{"einheit":1}')}${strom('{"einheit":2}')}${strom('{"einheit":3}')}`);
    expect(await bogentexteAusPdf(pdf)).toHaveLength(3);
  });

  it("liefert nichts für eine PDF ohne Anhang", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< >>\nstream\nBT (Hallo) Tj ET\nendstream\nendobj\n");
    expect(await bogentexteAusPdf(pdf)).toEqual([]);
  });
});

describe("istPdf", () => {
  it("erkennt eine PDF am Kopf und nicht an der Endung", () => {
    expect(istPdf(new TextEncoder().encode("%PDF-1.7\n"))).toBe(true);
    expect(istPdf(new TextEncoder().encode('{"einheit":{}}'))).toBe(false);
  });
});
