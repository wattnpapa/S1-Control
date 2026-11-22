/**
 * Gruppen und Wechsel des Monitors als reine Helfer.
 */

import { describe, expect, it } from "vitest";

import {
  ansichtFuerModus,
  ansichtenDerGruppe,
  einstellungAusModus,
  modusAusEinstellung,
  naechsteAnsicht,
  naechsterModus,
  sichtbareAnsichten,
  vorherigeAnsicht,
  wechselmodi,
} from "./monitorWechsel.js";

describe("Gruppen und Wechsel des Monitors", () => {
  it("kennt die Ansichten je Sachgebiet in Tastenreihenfolge", () => {
    expect(ansichtenDerGruppe("s1")).toEqual(["staerke", "status", "abschnitte", "organisationen", "kreuz", "kommen"]);
    expect(ansichtenDerGruppe("s2")).toEqual(["ticker"]);
    expect(ansichtenDerGruppe("s3")).toEqual(["einsatzmittel", "auftraege"]);
    expect(ansichtenDerGruppe("s4")).toEqual(["verpflegung", "vorausschau", "unterbringung", "tafel", "sofortbedarf"]);
    expect(ansichtenDerGruppe("fmz")).toEqual(["funkplan", "nachrichtenweg", "warteschlange", "still"]);
    expect(ansichtenDerGruppe("fuehrung")).toEqual(["offen"]);
  });

  it("bietet nur Sachgebiete mit mehr als einer Ansicht zum Wechsel an", () => {
    expect(wechselmodi()).toEqual(["aus", "alle", "s1", "s3", "s4", "fmz"]);
    expect(naechsterModus("aus")).toBe("alle");
    expect(naechsterModus("fmz")).toBe("aus");
  });

  it("wechselt innerhalb des Sachgebiets im Kreis", () => {
    expect(naechsteAnsicht("sofortbedarf", "s4")).toBe("verpflegung");
    expect(naechsteAnsicht("kommen", "s1")).toBe("staerke");
    expect(naechsteAnsicht("kommen", "alle")).toBe("ticker");
  });

  it("geht von einer Ansicht außerhalb des Sachgebiets zu dessen erster", () => {
    expect(naechsteAnsicht("funkplan", "s1")).toBe("staerke");
    expect(ansichtFuerModus("funkplan", "s4")).toBe("verpflegung");
    expect(ansichtFuerModus("unterbringung", "s4")).toBe("unterbringung");
    expect(ansichtFuerModus("funkplan", "aus")).toBe("funkplan");
  });

  it("liest und schreibt den Modus in den Geräteeinstellungen", () => {
    expect(modusAusEinstellung(undefined)).toBe("aus");
    expect(modusAusEinstellung({ ansicht: "tafel", wechsel: false, wechselgruppe: "s4" })).toBe("aus");
    expect(modusAusEinstellung({ ansicht: "tafel", wechsel: true })).toBe("alle");
    expect(modusAusEinstellung({ ansicht: "tafel", wechsel: true, wechselgruppe: "s4" })).toBe("s4");
    expect(modusAusEinstellung({ ansicht: "funkplan", wechsel: true, wechselgruppe: "fmz" })).toBe("fmz");
    // S6 hat nur eine Ansicht und wird nicht angeboten: Der Wechsel läuft dann durch alle.
    expect(modusAusEinstellung({ ansicht: "iuk", wechsel: true, wechselgruppe: "s6" })).toBe("alle");
    expect(einstellungAusModus("tafel", "aus")).toEqual({ ansicht: "tafel", wechsel: false });
    expect(einstellungAusModus("tafel", "alle")).toEqual({ ansicht: "tafel", wechsel: true });
    expect(einstellungAusModus("tafel", "s4")).toEqual({ ansicht: "tafel", wechsel: true, wechselgruppe: "s4" });
  });

  it("zeigt in der Besucheransicht nur Kräftezahlen und wechselt nur durch sie", () => {
    const sichtbar = sichtbareAnsichten(true);
    expect(sichtbar).toEqual(["staerke", "status", "abschnitte", "organisationen", "kreuz"]);
    expect(ansichtenDerGruppe("fmz", true)).toEqual([]);
    expect(wechselmodi(true)).toEqual(["aus", "alle", "s1"]);
    expect(naechsteAnsicht("kreuz", "alle", true)).toBe("staerke");
    expect(vorherigeAnsicht("staerke", true)).toBe("kreuz");
    expect(vorherigeAnsicht("funkplan", true)).toBe("staerke");
    expect(ansichtFuerModus("funkplan", "aus", true)).toBe("staerke");
    expect(einstellungAusModus("staerke", "alle", true)).toEqual({ ansicht: "staerke", wechsel: true, besucher: true });
    expect(modusAusEinstellung({ ansicht: "staerke", wechsel: true, wechselgruppe: "s4", besucher: true })).toBe("alle");
  });
});
