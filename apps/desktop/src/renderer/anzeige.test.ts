import { describe, expect, it } from "vitest";

import { anzeigen, begruessung } from "./anzeige.js";

// Laeuft im Vitest-Projekt „desktop-renderer" unter jsdom.
describe("Renderer-Anzeige", () => {
  it("bildet eine Beschriftung aus dem Fachkern", () => {
    expect(begruessung("2026-09-08")).toContain("kein-einsatz-geoeffnet");
  });

  it("haengt genau einen Absatz in den Wurzelknoten", () => {
    const wurzel = document.createElement("div");
    anzeigen(wurzel, "2026-09-08");

    expect(wurzel.children).toHaveLength(1);
    expect(wurzel.textContent).toContain("S1-Control v2");
  });
});
