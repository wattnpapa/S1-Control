/**
 * Die Datum-Zeit-Gruppe des Vordrucks (KONZEPT-NACHRICHTEN.md §6): hin und
 * zurück, in Europe/Berlin unabhängig von der Zeitzone des Rechners.
 */

import { describe, expect, it } from "vitest";

import { datumZeitGruppe, datumZeitGruppeLesen } from "./datumZeitGruppe.js";

describe("datumZeitGruppe", () => {
  it("schreibt TTHHMMmonJJ in Berliner Zeit, Winter und Sommer", () => {
    expect(datumZeitGruppe("2026-11-17T10:45:00+01:00")).toBe("171045nov26");
    expect(datumZeitGruppe("2026-11-17T09:45:00Z")).toBe("171045nov26");
    expect(datumZeitGruppe("2026-09-18T12:32:00Z")).toBe("181432sep26");
    expect(datumZeitGruppe(new Date(Date.UTC(2026, 2, 3, 6, 5)))).toBe("030705mrz26");
  });

  it("rechnet über die Tagesgrenze nach Berliner Zeit", () => {
    expect(datumZeitGruppe("2026-12-31T23:30:00Z")).toBe("010030jan27");
  });

  it("gibt für Ungültiges eine leere Zeichenkette", () => {
    expect(datumZeitGruppe("kein Zeitpunkt")).toBe("");
  });
});

describe("datumZeitGruppeLesen", () => {
  it("liest die Schreibweise des Vordrucks und die des Audits", () => {
    expect(datumZeitGruppeLesen("171045nov26")).toBe("2026-11-17T10:45:00+01:00");
    expect(datumZeitGruppeLesen("181432SEP26")).toBe("2026-09-18T14:32:00+02:00");
    expect(datumZeitGruppeLesen(" 030705 Mär 26 ")).toBe("2026-03-03T07:05:00+01:00");
  });

  it("nimmt ohne Jahr das Bezugsjahr, ohne beides nichts", () => {
    expect(datumZeitGruppeLesen("171045nov", 2026)).toBe("2026-11-17T10:45:00+01:00");
    expect(datumZeitGruppeLesen("171045nov")).toBeUndefined();
  });

  it("weist Unmögliches zurück", () => {
    expect(datumZeitGruppeLesen("311045feb26")).toBeUndefined();
    expect(datumZeitGruppeLesen("172445nov26")).toBeUndefined();
    expect(datumZeitGruppeLesen("171060nov26")).toBeUndefined();
    expect(datumZeitGruppeLesen("171045xyz26")).toBeUndefined();
    expect(datumZeitGruppeLesen("1710nov26")).toBeUndefined();
  });

  it("wählt in der doppelten Stunde der Umstellung die Sommerzeit", () => {
    expect(datumZeitGruppeLesen("250230okt26")).toBe("2026-10-25T02:30:00+02:00");
    expect(datumZeitGruppeLesen("250330okt26")).toBe("2026-10-25T03:30:00+01:00");
    expect(datumZeitGruppeLesen("290330mrz26")).toBe("2026-03-29T03:30:00+02:00");
  });

  it("kommt hin und zurück auf denselben Zeitpunkt", () => {
    for (const iso of ["2026-01-01T00:00:00Z", "2026-06-15T13:07:00Z", "2026-10-25T00:30:00Z", "2026-10-25T01:30:00Z", "2027-02-28T23:59:00Z"]) {
      const gelesen = datumZeitGruppeLesen(datumZeitGruppe(iso));
      // In der doppelten Stunde trägt die DTG die Unterscheidung nicht; dort
      // gilt die Sommerzeit, und der Zeitpunkt liegt eine Stunde früher.
      const erwartet = iso === "2026-10-25T01:30:00Z" ? Date.parse("2026-10-25T00:30:00Z") : Date.parse(iso);
      expect(Date.parse(gelesen ?? "")).toBe(erwartet);
    }
  });
});
