import { describe, expect, it } from "vitest";

import { dauerText } from "./Einsatzzeitentabelle.js";

describe("Die Dauer im Einsatz", () => {
  it("nennt Stunden und Minuten seit dem Eintreffen", () => {
    expect(dauerText("2026-11-22T06:00:00.000Z", "2026-11-22T11:20:00.000Z")).toBe("5 h 20 min");
    expect(dauerText("2026-11-22T06:00:00.000Z", "2026-11-22T06:45:00.000Z")).toBe("45 min");
  });

  it("bleibt leer ohne Eintreffzeit oder bei einer Zeit in der Zukunft", () => {
    expect(dauerText(undefined, "2026-11-22T06:00:00.000Z")).toBe("");
    expect(dauerText("2026-11-22T08:00:00.000Z", "2026-11-22T06:00:00.000Z")).toBe("");
  });
});
