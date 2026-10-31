import { describe, expect, it } from "vitest";

import { funkzeitAusEingabe, istFunkzeitForm } from "./funkzeit.js";

const JETZT = new Date(2026, 9, 31, 12, 0);

function lokal(iso: string | undefined): string {
  if (iso === undefined) return "ungültig";
  const d = new Date(iso);
  const z = (n: number): string => String(n).padStart(2, "0");
  return `${String(d.getFullYear())}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`;
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
    expect(funkzeitAusEingabe("310630", new Date(2026, 3, 15))).toBeUndefined();
  });

  it("erkennt die Funkform", () => {
    expect(istFunkzeitForm("0630")).toBe(true);
    expect(istFunkzeitForm("280630")).toBe(true);
    expect(istFunkzeitForm("06:30")).toBe(false);
  });
});
