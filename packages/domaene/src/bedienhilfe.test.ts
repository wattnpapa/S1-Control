/**
 * Prüfungen der Kurzhilfe je Ansicht (M8.1).
 *
 * Geprüft wird die Form und die Verbindung zur Tastenkarte. Beides fällt
 * sonst erst auf, wenn jemand die Hilfe öffnet oder das Handbuch druckt: Ein
 * Kürzelname mit Tippfehler ergäbe in der Ansicht eine leere Zeile, und im
 * Handbuch eine fehlende.
 */

import { describe, expect, it } from "vitest";

import { ANSICHTEN, ansichtshilfe } from "./bedienhilfe.js";
import { kuerzel } from "./tastenkarte.js";

describe("Kurzhilfe je Ansicht", () => {
  it("hat eindeutige Kennungen", () => {
    expect(new Set(ANSICHTEN.map((a) => a.kennung)).size).toBe(ANSICHTEN.length);
  });

  it("beantwortet für jede Ansicht alle drei Fragen", () => {
    for (const eintrag of ANSICHTEN) {
      expect(eintrag.wozu.length, eintrag.kennung).toBeGreaterThan(20);
      expect(eintrag.zuerst.length, eintrag.kennung).toBeGreaterThan(10);
      expect(eintrag.ueberraschung.length, eintrag.kennung).toBeGreaterThan(20);
    }
  });

  it("nennt nur Kürzel, die es wirklich gibt", () => {
    for (const eintrag of ANSICHTEN) {
      for (const name of eintrag.kuerzel) {
        expect(kuerzel(name), `${eintrag.kennung}: ${name}`).toBeDefined();
      }
    }
  });

  it("belegt jede Überraschung mit einem Paragraphen oder lässt sie ohne Anspruch", () => {
    // Nicht jede Überraschung ist eine Zusage des Konzepts — dass der
    // Dateiname den Zeitpunkt trägt, ist eine Bauentscheidung. Wo aber ein
    // Paragraph steht, muss er nach Paragraph aussehen; ein „(siehe oben)“
    // wäre in einer gedruckten Hilfe wertlos.
    for (const eintrag of ANSICHTEN) {
      const stellen = eintrag.ueberraschung.match(/§[0-9.]+/gu) ?? [];
      for (const stelle of stellen) {
        expect(stelle, eintrag.kennung).toMatch(/^§\d+(\.\d+)*$/u);
      }
    }
  });

  it("liefert eine Ansicht zu ihrer Kennung", () => {
    expect(ansichtshilfe("diagnose").titel).toBe("Diagnose");
  });
});
