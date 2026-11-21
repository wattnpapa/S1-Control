/** Welche Stelle der Sitzung einen Nachrichtenschritt trägt (2026-11-21: Fernmelder Fm1 bis Fm3). */

import { describe, expect, it } from "vitest";

import { stelleFuer } from "./sitzungsangaben.js";

describe("stelleFuer", () => {
  it("schreibt beim Befördern die Fernmelderstelle der Sitzung, nicht die erste Stelle", () => {
    expect(stelleFuer({ typ: "NachrichtBefoerdert", nutzlast: {} }, ["S6", "FM2"])).toBe("FM2");
    expect(stelleFuer({ typ: "NachrichtAngenommen", nutzlast: {} }, ["LDF", "FM1"])).toBe("FM1");
    expect(stelleFuer({ typ: "NachrichtBefoerdert", nutzlast: {} }, ["FMZ"])).toBe("FMZ");
  });

  it("lässt dem LdF den Vorschlag und fällt ohne passende Stelle auf die erste zurück", () => {
    expect(stelleFuer({ typ: "NachrichtUebermittlungVorgeschlagen", nutzlast: {} }, ["FM1", "LDF"])).toBe("LDF");
    expect(stelleFuer({ typ: "NachrichtUebermittlungVorgeschlagen", nutzlast: {} }, ["FM3"])).toBe("FM3");
    expect(stelleFuer({ typ: "NachrichtBefoerdert", nutzlast: {} }, ["S3"])).toBe("S3");
    expect(stelleFuer({ typ: "NachrichtBefoerdert", nutzlast: {} }, [])).toBeUndefined();
  });
});
