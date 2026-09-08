import { describe, expect, it } from "vitest";

import { hinweisFuerEinsatz, hinweisLesen, hinweisNutzlast } from "./index.js";

describe("UDP-Hinweis", () => {
  it("laeuft verlustfrei durch Schreiben und Lesen", () => {
    const hinweis = hinweisFuerEinsatz("2026-09-08", "Hochwasser Süd", "fuest-01", 3, 4096);

    expect(hinweisLesen(hinweisNutzlast(hinweis))).toEqual(hinweis);
  });

  it("verwirft unbrauchbare Datagramme, statt zu werfen", () => {
    expect(hinweisLesen("kein json")).toBeUndefined();
    expect(hinweisLesen('{"einsatz":"a"}')).toBeUndefined();
  });
});
