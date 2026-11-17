import { anzeigezoneWandzeit } from "@s1/domaene";
import { describe, expect, it } from "vitest";

import { funkzeitAusEingabe, istFunkzeitForm } from "./funkzeit.js";

// 31.10.2026 12:00 Berliner Zeit (Winterzeit, UTC+1).
const JETZT = new Date("2026-10-31T11:00:00Z");

/** Die Wandzeit in der Anzeigezone Europe/Berlin (FM P2-1) — nicht in der Rechnerzeit. */
function lokal(iso: string | undefined): string {
  if (iso === undefined) return "ungültig";
  const w = anzeigezoneWandzeit(iso);
  if (w === undefined) return "ungültig";
  const z = (n: number): string => String(n).padStart(2, "0");
  return `${String(w.jahr)}-${z(w.monat)}-${z(w.tag)} ${z(w.stunde)}:${z(w.minute)}`;
}

describe("Funkzeit", () => {
  it("liest hhmm als heutige Uhrzeit", () => {
    expect(lokal(funkzeitAusEingabe("0630", JETZT))).toBe("2026-10-31 06:30");
    expect(lokal(funkzeitAusEingabe(" 2359 ", JETZT))).toBe("2026-10-31 23:59");
  });

  it("liest hh:mm wie bisher", () => {
    expect(lokal(funkzeitAusEingabe("06:30", JETZT))).toBe("2026-10-31 06:30");
  });

  it("liest ddhhmm als Tag des laufenden Monats", () => {
    expect(lokal(funkzeitAusEingabe("280630", JETZT))).toBe("2026-10-28 06:30");
  });

  it("lässt Datumsformen der bisherigen Eingabe gelten", () => {
    expect(lokal(funkzeitAusEingabe("30.10. 14:30", JETZT))).toBe("2026-10-30 14:30");
  });

  it("lehnt Unmögliches ab", () => {
    expect(funkzeitAusEingabe("2460", JETZT)).toBeUndefined();
    expect(funkzeitAusEingabe("2400", JETZT)).toBeUndefined();
    expect(funkzeitAusEingabe("000630", JETZT)).toBeUndefined();
    expect(funkzeitAusEingabe("320630", JETZT)).toBeUndefined();
    expect(funkzeitAusEingabe("abc", JETZT)).toBeUndefined();
    expect(funkzeitAusEingabe("", JETZT)).toBeUndefined();
  });

  it("lehnt den 31. in einem Monat mit 30 Tagen ab", () => {
    expect(funkzeitAusEingabe("310630", new Date("2026-04-15T10:00:00Z"))).toBeUndefined();
  });

  it("erkennt die Funkform", () => {
    expect(istFunkzeitForm("0630")).toBe(true);
    expect(istFunkzeitForm("280630")).toBe(true);
    expect(istFunkzeitForm("06:30")).toBe(false);
  });
});
