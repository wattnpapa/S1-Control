import { describe, expect, it } from "vitest";

import { gegenstelleTreffer } from "./Funkkontaktwahl.js";

const einheiten = [
  { einheitId: "E1", name: "A Test 2" },
  { einheitId: "E2", name: "Heros Wildeshausen" },
];

describe("gegenstelleTreffer", () => {
  it("findet die Einheit ohne Rücksicht auf Groß- und Kleinschreibung", () => {
    expect(gegenstelleTreffer(einheiten, " heros wildeshausen ")?.einheitId).toBe("E2");
  });
  it("kennt Freitext und Leeres nicht als Einheit", () => {
    expect(gegenstelleTreffer(einheiten, "HK")).toBeUndefined();
    expect(gegenstelleTreffer(einheiten, " ")).toBeUndefined();
  });
});
