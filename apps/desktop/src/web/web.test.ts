/**
 * Die Umgebung der Web-Schale — vor allem die Fehlerfaelle des Zugangs.
 *
 * Ein Dienst, der wegen eines Tippfehlers still offen im Internet stuende,
 * waere schlimmer als einer, der nicht startet; deshalb ist hier jeder
 * unklare Wert ein Fehler.
 */

import { describe, expect, it } from "vitest";

import { liesWebumgebung } from "./web.js";

const GRUND = { S1_SHARE: "/share" };
const ANMELDUNG = {
  ...GRUND,
  S1_WEB_ZUGANG: "anmeldung",
  S1_WEB_ANMELDENAME: "fuest",
  S1_WEB_PASSWORT: "zwoelf-zeichen",
};

describe("liesWebumgebung", () => {
  it("ist ohne Angabe offen, wie im Netz der Führungsstelle", () => {
    const u = liesWebumgebung(GRUND);
    expect(u.zugang).toEqual({ art: "offen" });
    expect(u.hinterProxy).toBe(false);
    expect(u.sicher).toBe(false);
    expect(liesWebumgebung({ ...GRUND, S1_WEB_ZUGANG: "offen" }).zugang).toEqual({ art: "offen" });
  });

  it("liest den gemeinsamen Zugang mit 12 Stunden Sitzungsdauer als Vorgabe", () => {
    const u = liesWebumgebung({ ...ANMELDUNG, S1_WEB_HINTER_PROXY: "1" });
    expect(u.zugang).toEqual({
      art: "anmeldung",
      anmeldename: "fuest",
      passwort: "zwoelf-zeichen",
      sitzungMs: 12 * 3_600_000,
    });
    expect(u.hinterProxy).toBe(true);
    expect(liesWebumgebung({ ...ANMELDUNG, S1_WEB_SITZUNG_H: "0.5" }).zugang).toMatchObject({
      sitzungMs: 1_800_000,
    });
    expect(liesWebumgebung({ ...ANMELDUNG, S1_WEB_SICHER: "1" }).sicher).toBe(true);
  });

  it("verweigert den Start bei unbekanntem Zugang", () => {
    expect(() => liesWebumgebung({ ...GRUND, S1_WEB_ZUGANG: "anmelden" })).toThrow(/S1_WEB_ZUGANG/);
  });

  it("verweigert den Start ohne Anmeldename oder Passwort", () => {
    expect(() => liesWebumgebung({ ...ANMELDUNG, S1_WEB_ANMELDENAME: " " })).toThrow(/S1_WEB_ANMELDENAME fehlt/);
    expect(() => liesWebumgebung({ ...ANMELDUNG, S1_WEB_PASSWORT: "" })).toThrow(/S1_WEB_PASSWORT fehlt/);
  });

  it("verweigert den Start mit einem Passwort unter 12 Zeichen und nennt es nicht", () => {
    let meldung = "";
    try {
      liesWebumgebung({ ...ANMELDUNG, S1_WEB_PASSWORT: "elf-zeichen" });
    } catch (fehler) {
      meldung = (fehler as Error).message;
    }
    expect(meldung).toMatch(/zu kurz/);
    expect(meldung).not.toContain("elf-zeichen");
  });

  it("verweigert den Start mit einer unsinnigen Sitzungsdauer", () => {
    expect(() => liesWebumgebung({ ...ANMELDUNG, S1_WEB_SITZUNG_H: "0" })).toThrow(/S1_WEB_SITZUNG_H/);
    expect(() => liesWebumgebung({ ...ANMELDUNG, S1_WEB_SITZUNG_H: "zwölf" })).toThrow(/S1_WEB_SITZUNG_H/);
  });

  it("verlangt den Share weiterhin", () => {
    expect(() => liesWebumgebung({})).toThrow(/S1_SHARE fehlt/);
  });
});
